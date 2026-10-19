from datetime import date, datetime, timedelta, timezone

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import (
    Bookmark,
    Company,
    Problem,
    ProblemCompany,
    Progress,
    Submission,
    SubmissionResult,
    Topic,
    User,
)
from app.schemas.schemas import (
    BookmarkCreate,
    BookmarkResponse,
    CompanyBrief,
    DifficultyBreakdown,
    ProblemListItem,
    ProgressResponse,
    SubmissionResponse,
    SubmissionResultResponse,
    UserCreate,
    UserResponse,
    UserStatsResponse,
)

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new user profile."""
    # Check if username exists
    stmt = select(User).where(User.username == user_in.username)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_in.username}' is already taken",
        )

    user = User(
        username=user_in.username,
        display_name=user_in.display_name or user_in.username,
        settings=user_in.settings or {},
        created_at=utc_now(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a user profile by ID."""
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )
    return user


@router.get("/{user_id}/stats", response_model=UserStatsResponse)
async def get_user_stats(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get user statistics: solved problems, attempted problems, acceptance rate,
    consecutive day streak, difficulty breakdown, and topic breakdown.
    """
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # Distinct solved problems
    solved_stmt = select(distinct(Submission.problem_id)).where(
        Submission.user_id == user_id, Submission.verdict == "Accepted"
    )
    solved_res = await db.execute(solved_stmt)
    solved_ids = list(solved_res.scalars().all())
    problems_solved = len(solved_ids)

    # Distinct attempted problems
    attempted_stmt = select(distinct(Submission.problem_id)).where(
        Submission.user_id == user_id
    )
    attempted_res = await db.execute(attempted_stmt)
    attempted_ids = list(attempted_res.scalars().all())
    problems_attempted = len(attempted_ids)

    # Total problems in platform
    total_probs_stmt = select(func.count(Problem.id))
    total_probs = (await db.execute(total_probs_stmt)).scalar() or 0

    # Total submissions and acceptance rate
    total_subs_stmt = select(func.count(Submission.id)).where(Submission.user_id == user_id)
    total_subs = (await db.execute(total_subs_stmt)).scalar() or 0

    accepted_subs_stmt = select(func.count(Submission.id)).where(
        Submission.user_id == user_id, Submission.verdict == "Accepted"
    )
    accepted_subs = (await db.execute(accepted_subs_stmt)).scalar() or 0

    acceptance_rate = (
        round((accepted_subs / total_subs) * 100.0, 1) if total_subs > 0 else 0.0
    )

    # Streak calculation
    dates_stmt = (
        select(func.date(Submission.submitted_at))
        .where(Submission.user_id == user_id)
        .distinct()
        .order_by(func.date(Submission.submitted_at).desc())
    )
    dates_res = await db.execute(dates_stmt)
    submission_dates_raw = dates_res.scalars().all()
    # Normalize date strings/objects
    active_dates = set()
    for d in submission_dates_raw:
        if isinstance(d, str):
            active_dates.add(datetime.strptime(d, "%Y-%m-%d").date())
        elif isinstance(d, (date, datetime)):
            active_dates.add(d if isinstance(d, date) else d.date())

    streak = 0
    today = date.today()
    cur = today
    if cur not in active_dates:
        cur = today - timedelta(days=1)

    while cur in active_dates:
        streak += 1
        cur -= timedelta(days=1)

    # Difficulty breakdown of solved problems
    diff_breakdown = DifficultyBreakdown(medium=0, hard=0, very_hard=0)
    if solved_ids:
        diff_stmt = (
            select(Problem.difficulty, func.count(Problem.id))
            .where(Problem.id.in_(solved_ids))
            .group_by(Problem.difficulty)
        )
        diff_res = await db.execute(diff_stmt)
        for diff_name, count in diff_res.all():
            diff_clean = diff_name.lower().replace("-", "_").replace(" ", "_")
            if diff_clean == "medium":
                diff_breakdown.medium = count
            elif diff_clean == "hard":
                diff_breakdown.hard = count
            elif diff_clean in ["very_hard", "veryhard", "expert"]:
                diff_breakdown.very_hard = count

    # Topic breakdown
    topics_stmt = select(Topic).order_by(Topic.order_index)
    topics_res = await db.execute(topics_stmt)
    all_topics = topics_res.scalars().all()

    progress_map = {}
    prog_stmt = select(Progress).where(Progress.user_id == user_id)
    prog_res = await db.execute(prog_stmt)
    for p in prog_res.scalars().all():
        progress_map[p.topic_id] = p

    topic_breakdown: List[ProgressResponse] = []
    for t in all_topics:
        prog = progress_map.get(t.id)
        topic_breakdown.append(
            ProgressResponse(
                id=prog.id if prog else t.id,
                topic_id=t.id,
                topic_name=t.name,
                topic_slug=t.slug,
                problems_solved=prog.problems_solved if prog else 0,
                problems_attempted=prog.problems_attempted if prog else 0,
                mastery_pct=prog.mastery_pct if prog else 0.0,
                last_activity=prog.last_activity if prog else None,
            )
        )

    return UserStatsResponse(
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        problems_solved=problems_solved,
        problems_attempted=problems_attempted,
        total_problems=total_probs,
        acceptance_rate=acceptance_rate,
        streak_days=streak,
        difficulty_breakdown=diff_breakdown,
        topic_breakdown=topic_breakdown,
    )


@router.get("/{user_id}/submissions", response_model=List[SubmissionResponse])
async def get_user_submissions(
    user_id: int,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get recent submissions by a user."""
    stmt = (
        select(Submission)
        .where(Submission.user_id == user_id)
        .options(
            selectinload(Submission.problem),
            selectinload(Submission.results),
        )
        .order_by(Submission.submitted_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    submissions = res.scalars().all()

    return [
        SubmissionResponse(
            id=s.id,
            user_id=s.user_id,
            problem_id=s.problem_id,
            problem_slug=s.problem.slug if s.problem else None,
            problem_title=s.problem.title if s.problem else None,
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


@router.get("/{user_id}/progress", response_model=List[ProgressResponse])
async def get_user_progress(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get topic-wise progress for a user."""
    topics_stmt = select(Topic).order_by(Topic.order_index)
    topics_res = await db.execute(topics_stmt)
    topics = topics_res.scalars().all()

    prog_stmt = select(Progress).where(Progress.user_id == user_id)
    prog_res = await db.execute(prog_stmt)
    prog_map = {p.topic_id: p for p in prog_res.scalars().all()}

    output = []
    for t in topics:
        prog = prog_map.get(t.id)
        output.append(
            ProgressResponse(
                id=prog.id if prog else t.id,
                topic_id=t.id,
                topic_name=t.name,
                topic_slug=t.slug,
                problems_solved=prog.problems_solved if prog else 0,
                problems_attempted=prog.problems_attempted if prog else 0,
                mastery_pct=prog.mastery_pct if prog else 0.0,
                last_activity=prog.last_activity if prog else None,
            )
        )
    return output


@router.post("/{user_id}/bookmarks")
async def toggle_bookmark(
    user_id: int,
    body: BookmarkCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Toggle bookmark for a problem (adds if not bookmarked, removes if already bookmarked).
    """
    # Verify user exists
    user_stmt = select(User).where(User.id == user_id)
    user_res = await db.execute(user_stmt)
    if not user_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # Verify problem exists
    prob_stmt = select(Problem).where(Problem.id == body.problem_id)
    prob_res = await db.execute(prob_stmt)
    problem = prob_res.scalar_one_or_none()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem with ID {body.problem_id} not found",
        )

    # Check if existing bookmark
    bm_stmt = select(Bookmark).where(
        Bookmark.user_id == user_id, Bookmark.problem_id == body.problem_id
    )
    bm_res = await db.execute(bm_stmt)
    existing_bm = bm_res.scalar_one_or_none()

    if existing_bm:
        await db.delete(existing_bm)
        await db.commit()
        return {
            "bookmarked": False,
            "problem_id": body.problem_id,
            "message": "Bookmark removed",
        }
    else:
        new_bm = Bookmark(
            user_id=user_id,
            problem_id=body.problem_id,
            created_at=utc_now(),
        )
        db.add(new_bm)
        await db.commit()
        await db.refresh(new_bm)
        return {
            "bookmarked": True,
            "bookmark_id": new_bm.id,
            "problem_id": body.problem_id,
            "message": "Bookmark added",
        }


@router.get("/{user_id}/bookmarks", response_model=List[BookmarkResponse])
async def list_bookmarks(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """List all bookmarked problems for a user."""
    stmt = (
        select(Bookmark)
        .where(Bookmark.user_id == user_id)
        .options(
            selectinload(Bookmark.problem).selectinload(Problem.topic),
            selectinload(Bookmark.problem)
            .selectinload(Problem.problem_companies)
            .selectinload(ProblemCompany.company),
        )
        .order_by(Bookmark.created_at.desc())
    )
    res = await db.execute(stmt)
    bookmarks = res.scalars().all()

    output = []
    for bm in bookmarks:
        prob = bm.problem
        prob_item = None
        if prob:
            companies_brief = [
                CompanyBrief(
                    id=pc.company.id,
                    name=pc.company.name,
                    slug=pc.company.slug,
                )
                for pc in prob.problem_companies
                if pc.company is not None
            ]
            prob_item = ProblemListItem(
                id=prob.id,
                title=prob.title,
                slug=prob.slug,
                difficulty=prob.difficulty,
                topic_id=prob.topic_id,
                topic_slug=prob.topic.slug if prob.topic else None,
                topic_name=prob.topic.name if prob.topic else None,
                companies=companies_brief,
                execution_mode=prob.execution_mode,
                created_at=prob.created_at,
                submission_count=0,
                is_solved=None,
                is_bookmarked=True,
            )

        output.append(
            BookmarkResponse(
                id=bm.id,
                user_id=bm.user_id,
                problem_id=bm.problem_id,
                created_at=bm.created_at,
                problem=prob_item,
            )
        )

    return output
