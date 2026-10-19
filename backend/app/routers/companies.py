from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import Assessment, Company, Problem, ProblemCompany, Submission
from app.schemas.schemas import (
    AssessmentResponse,
    CompanyBrief,
    CompanyDetailResponse,
    CompanyResponse,
    ProblemListItem,
)

router = APIRouter(prefix="/api/companies", tags=["Companies"])


@router.get("", response_model=List[CompanyResponse])
async def list_companies(
    user_id: Optional[int] = Query(1, description="Current user ID"),
    db: AsyncSession = Depends(get_db),
):
    """List all companies with problem count and solved count."""
    stmt = select(Company).order_by(Company.name.asc())
    res = await db.execute(stmt)
    companies = res.scalars().all()

    # Problem counts per company
    prob_cnt_stmt = (
        select(ProblemCompany.company_id, func.count(func.distinct(ProblemCompany.problem_id)))
        .group_by(ProblemCompany.company_id)
    )
    prob_cnt_res = await db.execute(prob_cnt_stmt)
    prob_counts = dict(prob_cnt_res.all())

    # Solved counts per company for user
    solved_map: Dict[int, int] = {}
    if user_id:
        s_cnt_stmt = (
            select(ProblemCompany.company_id, func.count(func.distinct(ProblemCompany.problem_id)))
            .join(Submission, Submission.problem_id == ProblemCompany.problem_id)
            .where(Submission.user_id == user_id, Submission.verdict == "Accepted")
            .group_by(ProblemCompany.company_id)
        )
        s_res = await db.execute(s_cnt_stmt)
        solved_map = dict(s_res.all())

    return [
        CompanyResponse(
            id=c.id,
            name=c.name,
            slug=c.slug,
            description=c.description,
            common_patterns=c.common_patterns,
            problem_count=prob_counts.get(c.id, 0),
            solved_count=solved_map.get(c.id, 0),
        )
        for c in companies
    ]


@router.get("/{slug}", response_model=CompanyDetailResponse)
async def get_company_detail(
    slug: str,
    user_id: Optional[int] = Query(1, description="Current user ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get company details along with tagged problems."""
    stmt = (
        select(Company)
        .where(Company.slug == slug)
        .options(
            selectinload(Company.problem_companies)
            .selectinload(ProblemCompany.problem)
            .selectinload(Problem.topic),
            selectinload(Company.problem_companies)
            .selectinload(ProblemCompany.problem)
            .selectinload(Problem.problem_companies)
            .selectinload(ProblemCompany.company),
        )
    )
    res = await db.execute(stmt)
    company = res.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with slug '{slug}' not found",
        )

    # Solved problem IDs for user
    solved_problem_ids = set()
    if user_id:
        s_stmt = select(Submission.problem_id).where(
            Submission.user_id == user_id, Submission.verdict == "Accepted"
        )
        s_res = await db.execute(s_stmt)
        solved_problem_ids = set(s_res.scalars().all())

    problem_items: List[ProblemListItem] = []
    for pc in company.problem_companies:
        prob = pc.problem
        if not prob:
            continue
        companies_brief = [
            CompanyBrief(
                id=item.company.id,
                name=item.company.name,
                slug=item.company.slug,
            )
            for item in prob.problem_companies
            if item.company is not None
        ]
        problem_items.append(
            ProblemListItem(
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
                is_solved=prob.id in solved_problem_ids if user_id else None,
                is_bookmarked=None,
            )
        )

    solved_count = sum(1 for p in problem_items if p.is_solved)

    return CompanyDetailResponse(
        id=company.id,
        name=company.name,
        slug=company.slug,
        description=company.description,
        common_patterns=company.common_patterns,
        problem_count=len(problem_items),
        solved_count=solved_count,
        problems=problem_items,
    )


@router.get("/{slug}/assessments", response_model=List[AssessmentResponse])
async def get_company_assessments(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get company mock tests and assessments."""
    comp_stmt = select(Company).where(Company.slug == slug)
    comp_res = await db.execute(comp_stmt)
    company = comp_res.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with slug '{slug}' not found",
        )

    stmt = (
        select(Assessment)
        .where(Assessment.company_id == company.id)
        .options(
            selectinload(Assessment.questions),
            selectinload(Assessment.company),
        )
        .order_by(Assessment.created_at.desc())
    )
    res = await db.execute(stmt)
    assessments = res.scalars().all()

    return [
        AssessmentResponse(
            id=a.id,
            title=a.title,
            type=a.type,
            duration_minutes=a.duration_minutes,
            company_id=a.company_id,
            company_name=company.name,
            question_count=len(a.questions),
            total_points=sum(q.points for q in a.questions),
            created_at=a.created_at,
            config=a.config,
        )
        for a in assessments
    ]
