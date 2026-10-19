from typing import List, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import Problem, TestCase
from app.schemas.schemas import (
    ExecuteRequest,
    ExecuteResponse,
    RunCodeRequest,
    SubmitCodeRequest,
    TestResult,
    VerdictResponse,
)
from app.services.judge import (
    execute_code,
    judge_submission,
    run_sample_tests,
    run_tests,
)

router = APIRouter(prefix="/api", tags=["Judge"])


@router.post("/execute", response_model=ExecuteResponse)
async def execute_raw(request: ExecuteRequest):
    """Raw C code execution with custom stdin input."""
    result = await execute_code(
        source_code=request.code,
        stdin=request.stdin,
    )
    return ExecuteResponse(
        stdout=result.get("stdout", ""),
        stderr=result.get("stderr", ""),
        exit_code=result.get("exit_code", 0),
        signal=result.get("signal"),
        compile_output=result.get("compile_output"),
    )


@router.post("/run", response_model=List[TestResult])
async def run_code(
    request: RunCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Run code against sample tests of a problem or with custom stdin input.
    """
    # Case 1: Custom input provided
    if request.custom_input is not None and request.custom_input != "":
        res = await execute_code(source_code=request.code, stdin=request.custom_input)
        time_ms = res.get("time_ms", 0.0)
        exit_code = res.get("exit_code", 0)
        compile_out = res.get("compile_output")
        stderr = res.get("stderr", "")
        stdout = res.get("stdout", "")

        if compile_out:
            status_str = "compile_error"
            err_msg = compile_out
        elif exit_code != 0:
            status_str = "runtime_error"
            err_msg = stderr or f"Runtime error ({exit_code})"
        else:
            status_str = "passed"
            err_msg = None

        return [
            TestResult(
                test_case_id=None,
                order_index=1,
                is_sample=True,
                is_hidden=False,
                input_data=request.custom_input,
                expected_output=None,
                actual_output=stdout,
                status=status_str,
                time_ms=time_ms,
                error_message=err_msg,
            )
        ]

    # Case 2: Run against problem sample test cases
    if not request.problem_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either problem_slug or custom_input must be provided",
        )

    prob_stmt = select(Problem).where(Problem.slug == request.problem_slug)
    prob_res = await db.execute(prob_stmt)
    problem = prob_res.scalar_one_or_none()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem '{request.problem_slug}' not found",
        )

    results = await run_sample_tests(
        source_code=request.code,
        problem_id=problem.id,
        db=db,
    )
    return results


@router.post("/submit", response_model=VerdictResponse)
async def submit_code(
    request: SubmitCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit code for comprehensive evaluation against all test cases.
    Records submission, updates topic progress, and returns verdict.
    """
    prob_stmt = select(Problem).where(Problem.slug == request.problem_slug)
    prob_res = await db.execute(prob_stmt)
    problem = prob_res.scalar_one_or_none()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem '{request.problem_slug}' not found",
        )

    verdict_resp = await judge_submission(
        source_code=request.code,
        problem_id=problem.id,
        user_id=request.user_id,
        db=db,
    )
    return verdict_resp
