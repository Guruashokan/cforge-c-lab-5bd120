import asyncio
import time
from datetime import datetime, timezone

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.models import Problem, TestCase, Submission, SubmissionResult, Progress
from app.schemas.schemas import TestResult, VerdictResponse


def normalize_output(text: Optional[str]) -> str:
    """Normalize output by stripping carriage returns and trailing whitespace."""
    if text is None:
        return ""
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")]
    return "\n".join(lines)


async def execute_code(
    source_code: str,
    stdin: str = "",
    timeout: int = settings.EXECUTION_TIMEOUT,
) -> Dict[str, Any]:
    """
    Calls Piston API endpoint POST /execute to run C code.
    Returns {stdout, stderr, exit_code, signal, compile_output, time_ms}.
    """
    url = f"{settings.PISTON_API_URL.rstrip('/')}/execute"
    payload = {
        "language": "c",
        "version": "10.2.0",
        "files": [
            {
                "name": "solution.c",
                "content": source_code,
            }
        ],
        "stdin": stdin,
        "args": [],
        "run_timeout": timeout * 1000,
        "compile_timeout": 10000,
    }

    start_time = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=timeout + 5) as client:
            response = await client.post(url, json=payload)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if response.status_code != 200:
                return {
                    "stdout": "",
                    "stderr": f"Piston API returned HTTP {response.status_code}: {response.text}",
                    "exit_code": -1,
                    "signal": None,
                    "compile_output": None,
                    "time_ms": elapsed_ms,
                }

            data = response.json()
            compile_info = data.get("compile") or {}
            run_info = data.get("run") or {}

            compile_output = None
            if compile_info:
                comp_out = compile_info.get("output") or compile_info.get("stderr") or ""
                if compile_info.get("code", 0) != 0 or comp_out:
                    compile_output = comp_out.strip()

            stdout = run_info.get("stdout", "")
            stderr = run_info.get("stderr", "")
            exit_code = run_info.get("code") if run_info.get("code") is not None else 0
            signal = run_info.get("signal")

            # Check if compilation failed
            if compile_info.get("code", 0) != 0:
                return {
                    "stdout": "",
                    "stderr": stderr or "Compilation failed",
                    "exit_code": compile_info.get("code", 1),
                    "signal": None,
                    "compile_output": compile_output,
                    "time_ms": elapsed_ms,
                }

            return {
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": exit_code,
                "signal": signal,
                "compile_output": compile_output,
                "time_ms": elapsed_ms,
            }

    except httpx.TimeoutException:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "stdout": "",
            "stderr": f"Execution timed out after {timeout} seconds",
            "exit_code": 124,
            "signal": "SIGKILL",
            "compile_output": None,
            "time_ms": elapsed_ms,
        }
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "stdout": "",
            "stderr": f"Execution error: {str(exc)}",
            "exit_code": -1,
            "signal": None,
            "compile_output": None,
            "time_ms": elapsed_ms,
        }


async def run_tests(
    source_code: str,
    test_cases: List[TestCase],
    timeout: int = settings.EXECUTION_TIMEOUT,
) -> List[TestResult]:
    """
    Runs code against each test case and returns results.
    """
    results: List[TestResult] = []

    for idx, tc in enumerate(test_cases):
        exec_result = await execute_code(
            source_code=source_code,
            stdin=tc.input_data,
            timeout=timeout,
        )

        actual_output = exec_result.get("stdout", "")
        stderr = exec_result.get("stderr", "")
        exit_code = exec_result.get("exit_code", 0)
        signal = exec_result.get("signal")
        compile_output = exec_result.get("compile_output")
        time_ms = exec_result.get("time_ms", 0.0)

        # Check compilation error
        if compile_output and exit_code != 0 and idx == 0:
            # First run produced compile error, mark all remaining test cases as compile_error
            results.append(
                TestResult(
                    test_case_id=tc.id,
                    order_index=tc.order_index,
                    is_sample=not tc.is_hidden,
                    is_hidden=tc.is_hidden,
                    input_data=None if tc.is_hidden else tc.input_data,
                    expected_output=None if tc.is_hidden else tc.expected_output,
                    actual_output=None,
                    status="compile_error",
                    time_ms=time_ms,
                    error_message=compile_output,
                )
            )
            # Fill remaining with compile error
            for remaining_tc in test_cases[idx + 1:]:
                results.append(
                    TestResult(
                        test_case_id=remaining_tc.id,
                        order_index=remaining_tc.order_index,
                        is_sample=not remaining_tc.is_hidden,
                        is_hidden=remaining_tc.is_hidden,
                        input_data=None if remaining_tc.is_hidden else remaining_tc.input_data,
                        expected_output=None if remaining_tc.is_hidden else remaining_tc.expected_output,
                        actual_output=None,
                        status="compile_error",
                        time_ms=0.0,
                        error_message="Compilation failed",
                    )
                )
            break

        # Check timeout
        if signal in ["SIGKILL", "SIGTERM"] or exit_code == 124:
            status = "timeout"
            err_msg = stderr or "Time Limit Exceeded"
        elif exit_code != 0:
            status = "runtime_error"
            err_msg = stderr or f"Runtime error (exit code {exit_code})"
        else:
            norm_actual = normalize_output(actual_output)
            norm_expected = normalize_output(tc.expected_output)
            if norm_actual == norm_expected:
                status = "passed"
                err_msg = None
            else:
                status = "failed"
                err_msg = "Output does not match expected output"

        results.append(
            TestResult(
                test_case_id=tc.id,
                order_index=tc.order_index,
                is_sample=not tc.is_hidden,
                is_hidden=tc.is_hidden,
                input_data=None if tc.is_hidden else tc.input_data,
                expected_output=None if tc.is_hidden else tc.expected_output,
                actual_output=None if tc.is_hidden else actual_output,
                status=status,
                time_ms=time_ms,
                error_message=err_msg if not tc.is_hidden else (None if status == "passed" else "Hidden test case failed"),
            )
        )

    return results


async def run_sample_tests(
    source_code: str,
    problem_id: int,
    db: AsyncSession,
) -> List[TestResult]:
    """
    Fetches only NON-hidden test cases and executes code against them.
    Does NOT store a submission in the database.
    """
    stmt = (
        select(TestCase)
        .where(TestCase.problem_id == problem_id, TestCase.is_hidden == False)
        .order_by(TestCase.order_index)
    )
    result = await db.execute(stmt)
    sample_cases = list(result.scalars().all())

    if not sample_cases:
        # Fallback: if no sample test case marked, take up to 2 test cases
        fallback_stmt = (
            select(TestCase)
            .where(TestCase.problem_id == problem_id)
            .order_by(TestCase.order_index)
            .limit(2)
        )
        fb_result = await db.execute(fallback_stmt)
        sample_cases = list(fb_result.scalars().all())

    return await run_tests(source_code, sample_cases)


async def judge_submission(
    source_code: str,
    problem_id: int,
    user_id: int,
    db: AsyncSession,
) -> VerdictResponse:
    """
    Fetches ALL test cases (including hidden), evaluates code against each,
    determines overall verdict, stores Submission and SubmissionResult records in DB,
    and updates user topic progress.
    """
    # Fetch problem
    prob_stmt = select(Problem).where(Problem.id == problem_id)
    prob_res = await db.execute(prob_stmt)
    problem = prob_res.scalar_one_or_none()
    if not problem:
        raise ValueError(f"Problem with id {problem_id} not found")

    # Fetch all test cases
    tc_stmt = (
        select(TestCase)
        .where(TestCase.problem_id == problem_id)
        .order_by(TestCase.order_index)
    )
    tc_res = await db.execute(tc_stmt)
    test_cases = list(tc_res.scalars().all())

    if not test_cases:
        # No test cases exist for this problem
        verdict = "Accepted"
        total_tests = 0
        passed_tests = 0
        submission = Submission(
            user_id=user_id,
            problem_id=problem_id,
            code=source_code,
            verdict=verdict,
            passed_tests=passed_tests,
            total_tests=total_tests,
            execution_time_ms=0.0,
            memory_kb=0,
            submitted_at=utc_now(),
        )
        db.add(submission)
        await db.commit()
        await db.refresh(submission)
        return VerdictResponse(
            submission_id=submission.id,
            verdict=verdict,
            passed_tests=passed_tests,
            total_tests=total_tests,
            execution_time_ms=0.0,
            memory_kb=0,
            results=[],
        )

    # Run tests
    test_results = await run_tests(source_code, test_cases)

    # Determine overall verdict
    has_compile_error = any(r.status == "compile_error" for r in test_results)
    has_timeout = any(r.status == "timeout" for r in test_results)
    has_runtime_error = any(r.status == "runtime_error" for r in test_results)
    has_failed = any(r.status == "failed" for r in test_results)

    passed_count = sum(1 for r in test_results if r.status == "passed")
    total_count = len(test_results)

    compiler_output = None
    stderr_output = None
    if has_compile_error:
        verdict = "Compilation Error"
        for r in test_results:
            if r.status == "compile_error" and r.error_message:
                compiler_output = r.error_message
                break
    elif has_timeout:
        verdict = "Time Limit Exceeded"
    elif has_runtime_error:
        verdict = "Runtime Error"
        for r in test_results:
            if r.status == "runtime_error" and r.error_message:
                stderr_output = r.error_message
                break
    elif has_failed:
        verdict = "Wrong Answer"
    else:
        verdict = "Accepted"

    # Execution time: max time among test cases
    max_time_ms = max((r.time_ms for r in test_results), default=0.0)

    # Create Submission record
    submission = Submission(
        user_id=user_id,
        problem_id=problem_id,
        code=source_code,
        verdict=verdict,
        passed_tests=passed_count,
        total_tests=total_count,
        execution_time_ms=max_time_ms,
        memory_kb=settings.MEMORY_LIMIT_KB,
        compiler_output=compiler_output,
        stderr_output=stderr_output,
        submitted_at=utc_now(),
    )
    db.add(submission)
    await db.flush()  # populate submission.id

    # Create SubmissionResult records
    for tr in test_results:
        sub_res = SubmissionResult(
            submission_id=submission.id,
            test_case_id=tr.test_case_id,
            status=tr.status,
            actual_output=tr.actual_output if not tr.is_hidden else None,
            time_ms=tr.time_ms,
        )
        db.add(sub_res)

    # Update Progress for the user & topic
    topic_id = problem.topic_id
    prog_stmt = select(Progress).where(
        Progress.user_id == user_id, Progress.topic_id == topic_id
    )
    prog_res = await db.execute(prog_stmt)
    progress = prog_res.scalar_one_or_none()

    if not progress:
        progress = Progress(
            user_id=user_id,
            topic_id=topic_id,
            problems_solved=0,
            problems_attempted=0,
            mastery_pct=0.0,
            last_activity=utc_now(),
        )
        db.add(progress)
        await db.flush()

    progress.last_activity = utc_now()

    # Check if this problem was already solved
    prev_accepted_stmt = select(func.count(Submission.id)).where(
        Submission.user_id == user_id,
        Submission.problem_id == problem_id,
        Submission.verdict == "Accepted",
        Submission.id != submission.id,
    )
    prev_accepted_res = await db.execute(prev_accepted_stmt)
    was_previously_solved = (prev_accepted_res.scalar() or 0) > 0

    # Check if this problem was already attempted
    prev_attempted_stmt = select(func.count(Submission.id)).where(
        Submission.user_id == user_id,
        Submission.problem_id == problem_id,
        Submission.id != submission.id,
    )
    prev_attempted_res = await db.execute(prev_attempted_stmt)
    was_previously_attempted = (prev_attempted_res.scalar() or 0) > 0

    if not was_previously_attempted:
        progress.problems_attempted += 1

    if verdict == "Accepted" and not was_previously_solved:
        progress.problems_solved += 1

    # Recalculate mastery_pct for this topic
    total_topic_problems_stmt = select(func.count(Problem.id)).where(
        Problem.topic_id == topic_id
    )
    total_prob_res = await db.execute(total_topic_problems_stmt)
    total_topic_problems = total_prob_res.scalar() or 0

    if total_topic_problems > 0:
        progress.mastery_pct = round(
            (progress.problems_solved / total_topic_problems) * 100.0, 1
        )
    else:
        progress.mastery_pct = 100.0

    await db.commit()
    await db.refresh(submission)

    return VerdictResponse(
        submission_id=submission.id,
        verdict=verdict,
        passed_tests=passed_count,
        total_tests=total_count,
        execution_time_ms=max_time_ms,
        memory_kb=settings.MEMORY_LIMIT_KB,
        compiler_output=compiler_output,
        stderr_output=stderr_output,
        results=test_results,
    )
