from datetime import datetime, timezone

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import (
    Assessment,
    AssessmentAttempt,
    AssessmentQuestion,
    Company,
    Problem,
    User,
)
from app.schemas.schemas import (
    AssessmentAttemptCreate,
    AssessmentAttemptResponse,
    AssessmentDetailResponse,
    AssessmentQuestionDetail,
    AssessmentResponse,
)

router = APIRouter(prefix="/api/assessments", tags=["Assessments"])


class AssessmentSubmitPayload(BaseModel):
    attempt_id: int
    user_id: int = 1
    answers: Optional[Dict[str, Any]] = None


@router.get("", response_model=List[AssessmentResponse])
async def list_assessments(
    assessment_type: Optional[str] = Query(None, description="timed, practice, company_mock"),
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    db: AsyncSession = Depends(get_db),
):
    """List all available assessments and mock tests."""
    stmt = (
        select(Assessment)
        .options(
            selectinload(Assessment.company),
            selectinload(Assessment.questions),
        )
        .order_by(Assessment.created_at.desc())
    )

    if assessment_type:
        stmt = stmt.where(Assessment.type == assessment_type)
    if company_id:
        stmt = stmt.where(Assessment.company_id == company_id)

    res = await db.execute(stmt)
    assessments = res.scalars().all()

    return [
        AssessmentResponse(
            id=a.id,
            title=a.title,
            type=a.type,
            duration_minutes=a.duration_minutes,
            company_id=a.company_id,
            company_name=a.company.name if a.company else None,
            question_count=len(a.questions),
            total_points=sum(q.points for q in a.questions),
            created_at=a.created_at,
            config=a.config,
        )
        for a in assessments
    ]


@router.get("/attempts/{attempt_id}", response_model=AssessmentAttemptResponse)
async def get_attempt_result(
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the details and score results of an assessment attempt."""
    stmt = (
        select(AssessmentAttempt)
        .where(AssessmentAttempt.id == attempt_id)
        .options(selectinload(AssessmentAttempt.assessment))
    )
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment attempt {attempt_id} not found",
        )

    return AssessmentAttemptResponse(
        id=attempt.id,
        user_id=attempt.user_id,
        assessment_id=attempt.assessment_id,
        assessment_title=attempt.assessment.title if attempt.assessment else None,
        started_at=attempt.started_at,
        finished_at=attempt.finished_at,
        score=attempt.score,
        max_score=attempt.max_score,
        results=attempt.results,
    )


@router.get("/{assessment_id}", response_model=AssessmentDetailResponse)
async def get_assessment_detail(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get assessment detail including ordered questions."""
    stmt = (
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(
            selectinload(Assessment.company),
            selectinload(Assessment.questions).selectinload(AssessmentQuestion.problem),
        )
    )
    res = await db.execute(stmt)
    assessment = res.scalar_one_or_none()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found",
        )

    questions_detail = [
        AssessmentQuestionDetail(
            id=q.id,
            problem_id=q.problem_id,
            problem_title=q.problem.title if q.problem else "",
            problem_slug=q.problem.slug if q.problem else "",
            difficulty=q.problem.difficulty if q.problem else "medium",
            points=q.points,
            order_index=q.order_index,
        )
        for q in sorted(assessment.questions, key=lambda x: x.order_index)
    ]

    return AssessmentDetailResponse(
        id=assessment.id,
        title=assessment.title,
        type=assessment.type,
        duration_minutes=assessment.duration_minutes,
        company_id=assessment.company_id,
        company_name=assessment.company.name if assessment.company else None,
        question_count=len(questions_detail),
        total_points=sum(q.points for q in questions_detail),
        created_at=assessment.created_at,
        config=assessment.config,
        questions=questions_detail,
    )


@router.post("/{assessment_id}/start", response_model=AssessmentAttemptResponse)
async def start_assessment(
    assessment_id: int,
    body: AssessmentAttemptCreate,
    db: AsyncSession = Depends(get_db),
):
    """Start an assessment attempt."""
    stmt = (
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(selectinload(Assessment.questions))
    )
    res = await db.execute(stmt)
    assessment = res.scalar_one_or_none()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found",
        )

    # Check user
    user_stmt = select(User).where(User.id == body.user_id)
    user_res = await db.execute(user_stmt)
    if not user_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {body.user_id} not found",
        )

    max_points = sum(q.points for q in assessment.questions)

    attempt = AssessmentAttempt(
        user_id=body.user_id,
        assessment_id=assessment_id,
        started_at=utc_now(),
        finished_at=None,
        score=0.0,
        max_score=float(max_points),
        results={"status": "in_progress", "answers": {}},
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return AssessmentAttemptResponse(
        id=attempt.id,
        user_id=attempt.user_id,
        assessment_id=attempt.assessment_id,
        assessment_title=assessment.title,
        started_at=attempt.started_at,
        finished_at=attempt.finished_at,
        score=attempt.score,
        max_score=attempt.max_score,
        results=attempt.results,
    )


@router.post("/{assessment_id}/submit", response_model=AssessmentAttemptResponse)
async def submit_assessment(
    assessment_id: int,
    payload: AssessmentSubmitPayload,
    db: AsyncSession = Depends(get_db),
):
    """Submit an assessment attempt and compute the score."""
    stmt = (
        select(AssessmentAttempt)
        .where(
            AssessmentAttempt.id == payload.attempt_id,
            AssessmentAttempt.assessment_id == assessment_id,
        )
        .options(
            selectinload(AssessmentAttempt.assessment)
            .selectinload(Assessment.questions)
        )
    )
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment attempt {payload.attempt_id} not found for assessment {assessment_id}",
        )

    attempt.finished_at = utc_now()

    # Calculate score based on answers provided
    answers = payload.answers or {}
    total_score = 0.0
    question_results = {}

    for q in attempt.assessment.questions:
        q_ans = answers.get(str(q.problem_id)) or answers.get(f"q_{q.id}")
        # If question has a status or passed all tests in answers
        if isinstance(q_ans, dict) and q_ans.get("verdict") == "Accepted":
            total_score += float(q.points)
            question_results[str(q.problem_id)] = {
                "points_earned": q.points,
                "status": "Accepted",
            }
        elif isinstance(q_ans, (int, float)):
            pts = min(float(q.points), max(0.0, float(q_ans)))
            total_score += pts
            question_results[str(q.problem_id)] = {
                "points_earned": pts,
                "status": "Completed",
            }
        else:
            question_results[str(q.problem_id)] = {
                "points_earned": 0,
                "status": "Unanswered" if q_ans is None else "Failed",
            }

    attempt.score = total_score
    attempt.results = {
        "status": "completed",
        "question_results": question_results,
        "submitted_answers": answers,
    }

    await db.commit()
    await db.refresh(attempt)

    return AssessmentAttemptResponse(
        id=attempt.id,
        user_id=attempt.user_id,
        assessment_id=attempt.assessment_id,
        assessment_title=attempt.assessment.title,
        started_at=attempt.started_at,
        finished_at=attempt.finished_at,
        score=attempt.score,
        max_score=attempt.max_score,
        results=attempt.results,
    )
