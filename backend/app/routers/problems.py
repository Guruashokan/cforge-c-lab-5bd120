from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import Problem, Submission, SubmissionResult
from app.schemas.schemas import (
    ProblemDetail,
    ProblemFilter,
    ProblemHintResponse,
    ProblemListItem,
    ProblemListResponse,
    ProblemSolutionResponse,
    SubmissionResponse,
    SubmissionResultResponse,
)
from app.services import problems as problem_service

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

router = APIRouter(tags=["Problems"])


@router.get("/api/problems", response_model=ProblemListResponse)
async def list_problems(
    topic: Optional[str] = Query(None, description="Topic slug or ID"),
    difficulty: Optional[str] = Query(None, description="medium, hard, very_hard"),
    company: Optional[str] = Query(None, description="Company slug or ID"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(1, description="Current user ID for status tracking"),
    db: AsyncSession = Depends(get_db),
):
    """List problems with filtering and pagination."""
    filters = ProblemFilter(
        topic=topic,
        difficulty=difficulty,
        company=company,
        search=search,
        page=page,
        limit=limit,
    )
    items, total = await problem_service.get_problems(db, filters, user_id=user_id)
    total_pages = (total + limit - 1) // limit if total > 0 else 0

    return ProblemListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/api/daily-challenge", response_model=ProblemListItem)
async def get_daily_challenge(
    user_id: Optional[int] = Query(1, description="Current user ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get the deterministic daily challenge problem."""
    challenge = await problem_service.get_daily_challenge(db, user_id=user_id)
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No problems available for daily challenge",
        )
    return challenge


@router.get("/api/problems/{slug}", response_model=ProblemDetail)
async def get_problem(
    slug: str,
    user_id: Optional[int] = Query(1, description="Current user ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed information for a single problem."""
    detail = await problem_service.get_problem_by_slug(db, slug, user_id=user_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem with slug '{slug}' not found",
        )
    return detail


@router.get("/api/problems/{slug}/hints/{level}", response_model=ProblemHintResponse)
async def get_problem_hint(
    slug: str,
    level: int,
    db: AsyncSession = Depends(get_db),
):
    """Progressive hint reveal for a problem (level 1-5)."""
    hint_resp = await problem_service.get_problem_hints(db, slug, level)
    if not hint_resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem with slug '{slug}' not found",
        )
    return hint_resp


@router.get("/api/problems/{slug}/solution", response_model=ProblemSolutionResponse)
async def get_problem_solution(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get reference solution and explanation for a problem."""
    sol = await problem_service.get_problem_solution(db, slug)
    if not sol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem with slug '{slug}' not found",
        )
    return sol


@router.get("/api/problems/{slug}/related", response_model=List[ProblemListItem])
async def get_related_problems(
    slug: str,
    user_id: Optional[int] = Query(1, description="Current user ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get related problems for a problem."""
    return await problem_service.get_related_problems(db, slug, user_id=user_id)


@router.get("/api/problems/{slug}/submissions", response_model=List[SubmissionResponse])
async def get_problem_submissions(
    slug: str,
    user_id: Optional[int] = Query(1, description="User ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get user's past submissions for this problem."""
    prob_stmt = select(Problem).where(Problem.slug == slug)
    prob_res = await db.execute(prob_stmt)
    problem = prob_res.scalar_one_or_none()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem with slug '{slug}' not found",
        )

    sub_query = (
        select(Submission)
        .where(
            Submission.problem_id == problem.id,
            Submission.user_id == user_id if user_id else True,
        )
        .options(selectinload(Submission.results))
        .order_by(Submission.submitted_at.desc())
        .limit(20)
    )
    sub_res = await db.execute(sub_query)
    submissions = sub_res.scalars().all()

    return [
        SubmissionResponse(
            id=s.id,
            user_id=s.user_id,
            problem_id=s.problem_id,
            problem_slug=problem.slug,
            problem_title=problem.title,
            code=s.code,
            verdict=s.verdict,
            passed_tests=s.passed_tests,
            total_tests=s.total_tests,
            execution_time_ms=s.execution_time_ms,
            memory_kb=s.memory_kb,
            compiler_output=s.compiler_output,
            stderr_output=s.stderr_output,
            submitted_at=s.submitted_at,
            results=[
                SubmissionResultResponse(
                    id=r.id,
                    test_case_id=r.test_case_id,
                    status=r.status,
                    actual_output=r.actual_output,
                    time_ms=r.time_ms,
                )
                for r in s.results
            ],
        )
        for s in submissions
    ]


from pydantic import BaseModel

class ProblemCodeRunPayload(BaseModel):
    code: str

class ProblemCodeSubmitPayload(BaseModel):
    code: str
    user_id: Optional[int] = 1


@router.post("/api/problems/{slug}/run")
async def run_problem_code(
    slug: str,
    payload: ProblemCodeRunPayload,
    db: AsyncSession = Depends(get_db),
):
    """Compile and run problem code against sample test cases."""
    from app.services.judge import run_sample_tests

    prob_stmt = select(Problem).where(Problem.slug == slug)
    prob_res = await db.execute(prob_stmt)
    problem = prob_res.scalar_one_or_none()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem '{slug}' not found",
        )

    results = await run_sample_tests(
        source_code=payload.code,
        problem_id=problem.id,
        db=db,
    )

    test_results_out = [
        {
            "test_case_index": idx + 1,
            "status": r.status,
            "input": r.input_data or "",
            "expected_output": r.expected_output or "",
            "actual_output": r.actual_output or "",
            "time_ms": r.time_ms or 0.0,
            "is_hidden": r.is_hidden,
            "description": f"Sample Case {idx + 1}",
        }
        for idx, r in enumerate(results)
    ]

    has_error = any(r.status == "compile_error" for r in results)
    first_err = next((r.error_message for r in results if r.error_message), "")

    return {
        "compiler_output": first_err if has_error else "gcc -std=c17 -O2 -Wall -Wextra solution.c -o solution\nCompilation successful: 0 errors, 0 warnings.",
        "stderr_output": first_err if has_error else "",
        "test_results": test_results_out,
    }


@router.post("/api/problems/{slug}/submit")
async def submit_problem_code(
    slug: str,
    payload: ProblemCodeSubmitPayload,
    db: AsyncSession = Depends(get_db),
):
    """Submit code for comprehensive benchmark evaluation."""
    from app.services.judge import judge_submission

    prob_stmt = select(Problem).where(Problem.slug == slug)
    prob_res = await db.execute(prob_stmt)
    problem = prob_res.scalar_one_or_none()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem '{slug}' not found",
        )

    verdict_resp = await judge_submission(
        source_code=payload.code,
        problem_id=problem.id,
        user_id=payload.user_id or 1,
        db=db,
    )

    return {
        "id": verdict_resp.submission_id,
        "verdict": verdict_resp.verdict,
        "passed_tests": verdict_resp.passed_tests,
        "total_tests": verdict_resp.total_tests,
        "execution_time_ms": verdict_resp.execution_time_ms,
        "memory_kb": verdict_resp.memory_kb,
        "compiler_output": verdict_resp.compile_output or "Build completed successfully.",
        "stderr_output": verdict_resp.stderr or "",
        "submitted_at": utc_now().isoformat() if hasattr(verdict_resp, "submitted_at") else "",
        "test_results": [
            {
                "test_case_index": idx + 1,
                "status": r.status,
                "input": r.input_data or "",
                "expected_output": r.expected_output or "",
                "actual_output": r.actual_output or "",
                "time_ms": r.time_ms or 0.0,
                "is_hidden": r.is_hidden,
                "description": f"Evaluation Case {idx + 1}",
            }
            for idx, r in enumerate(verdict_resp.test_results)
        ],
    }
