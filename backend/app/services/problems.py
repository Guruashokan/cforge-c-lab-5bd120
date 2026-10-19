from datetime import date
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Problem, Topic, Company, ProblemCompany, TestCase, Submission, Bookmark
from app.schemas.schemas import (
    ProblemFilter,
    ProblemListItem,
    ProblemDetail,
    ProblemHintResponse,
    ProblemSolutionResponse,
    CompanyBrief,
    TopicBrief,
    TestCaseSample,
)


async def get_problems(
    db: AsyncSession,
    filters: ProblemFilter,
    user_id: Optional[int] = 1,
) -> Tuple[List[ProblemListItem], int]:
    """
    List problems with optional filters for topic, difficulty, company, search,
    and pagination.
    """
    query = (
        select(Problem)
        .options(
            selectinload(Problem.topic),
            selectinload(Problem.problem_companies).selectinload(ProblemCompany.company),
        )
    )

    # Filter by topic (can be topic_slug or topic_id)
    if filters.topic:
        if filters.topic.isdigit():
            query = query.where(Problem.topic_id == int(filters.topic))
        else:
            query = query.join(Problem.topic).where(Topic.slug == filters.topic)

    # Filter by difficulty
    if filters.difficulty:
        query = query.where(Problem.difficulty == filters.difficulty.lower())

    # Filter by company (slug or id)
    if filters.company:
        if filters.company.isdigit():
            query = query.join(Problem.problem_companies).where(
                ProblemCompany.company_id == int(filters.company)
            )
        else:
            query = query.join(Problem.problem_companies).join(ProblemCompany.company).where(
                Company.slug == filters.company
            )

    # Filter by search term
    if filters.search:
        search_pattern = f"%{filters.search}%"
        query = query.where(
            or_(
                Problem.title.ilike(search_pattern),
                Problem.slug.ilike(search_pattern),
                Problem.description.ilike(search_pattern),
            )
        )

    # Total count query
    count_subquery = query.with_only_columns(func.count(Problem.id.distinct())).order_by(None)
    total_res = await db.execute(count_subquery)
    total_count = total_res.scalar() or 0

    # Pagination
    offset = (filters.page - 1) * filters.limit
    query = query.order_by(Problem.id.asc()).offset(offset).limit(filters.limit)

    result = await db.execute(query)
    problems = list(result.scalars().unique().all())

    # Build response items
    items: List[ProblemListItem] = []

    # Pre-fetch user's solved problem IDs if user_id is provided
    solved_problem_ids = set()
    bookmarked_problem_ids = set()
    if user_id:
        solved_stmt = select(Submission.problem_id).where(
            Submission.user_id == user_id,
            Submission.verdict == "Accepted",
        ).distinct()
        solved_res = await db.execute(solved_stmt)
        solved_problem_ids = set(solved_res.scalars().all())

        bm_stmt = select(Bookmark.problem_id).where(Bookmark.user_id == user_id)
        bm_res = await db.execute(bm_stmt)
        bookmarked_problem_ids = set(bm_res.scalars().all())

    # Pre-fetch submission counts for returned problems
    prob_ids = [p.id for p in problems]
    sub_counts: Dict[int, int] = {}
    if prob_ids:
        sub_count_stmt = (
            select(Submission.problem_id, func.count(Submission.id))
            .where(Submission.problem_id.in_(prob_ids))
            .group_by(Submission.problem_id)
        )
        sub_count_res = await db.execute(sub_count_stmt)
        sub_counts = dict(sub_count_res.all())

    for prob in problems:
        companies_brief = [
            CompanyBrief(
                id=pc.company.id,
                name=pc.company.name,
                slug=pc.company.slug,
            )
            for pc in prob.problem_companies
            if pc.company is not None
        ]

        items.append(
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
                submission_count=sub_counts.get(prob.id, 0),
                is_solved=(prob.id in solved_problem_ids) if user_id else None,
                is_bookmarked=(prob.id in bookmarked_problem_ids) if user_id else None,
            )
        )

    return items, total_count


async def get_problem_by_slug(
    db: AsyncSession,
    slug: str,
    user_id: Optional[int] = 1,
) -> Optional[ProblemDetail]:
    """
    Get full problem detail, including sample test cases, hints count, topic and company info.
    Hidden test cases and reference solution are excluded.
    """
    stmt = (
        select(Problem)
        .where(Problem.slug == slug)
        .options(
            selectinload(Problem.topic),
            selectinload(Problem.problem_companies).selectinload(ProblemCompany.company),
            selectinload(Problem.test_cases),
        )
    )
    result = await db.execute(stmt)
    problem = result.scalar_one_or_none()

    if not problem:
        return None

    # Filter sample test cases (non-hidden)
    sample_tests = [
        TestCaseSample(
            id=tc.id,
            input_data=tc.input_data,
            expected_output=tc.expected_output,
            is_edge_case=tc.is_edge_case,
            description=tc.description,
            order_index=tc.order_index,
        )
        for tc in sorted(problem.test_cases, key=lambda x: x.order_index)
        if not tc.is_hidden
    ]

    # Hints count
    hints_list = problem.hints if isinstance(problem.hints, list) else []
    hints_count = len(hints_list)

    # Companies
    companies_brief = [
        CompanyBrief(
            id=pc.company.id,
            name=pc.company.name,
            slug=pc.company.slug,
        )
        for pc in problem.problem_companies
        if pc.company is not None
    ]

    # Topic
    topic_brief = None
    if problem.topic:
        topic_brief = TopicBrief(
            id=problem.topic.id,
            name=problem.topic.name,
            slug=problem.topic.slug,
            icon=problem.topic.icon,
        )

    # Check bookmark & user status
    is_bookmarked = False
    user_status = "unattempted"

    if user_id:
        bm_stmt = select(Bookmark).where(
            Bookmark.user_id == user_id, Bookmark.problem_id == problem.id
        )
        bm_res = await db.execute(bm_stmt)
        is_bookmarked = bm_res.scalar_one_or_none() is not None

        # Check submission status
        sub_stmt = select(Submission.verdict).where(
            Submission.user_id == user_id, Submission.problem_id == problem.id
        )
        sub_res = await db.execute(sub_stmt)
        verdicts = sub_res.scalars().all()
        if "Accepted" in verdicts:
            user_status = "solved"
        elif len(verdicts) > 0:
            user_status = "attempted"

    return ProblemDetail(
        id=problem.id,
        title=problem.title,
        slug=problem.slug,
        difficulty=problem.difficulty,
        description=problem.description,
        input_format=problem.input_format,
        output_format=problem.output_format,
        constraints=problem.constraints,
        examples=problem.examples if isinstance(problem.examples, list) else [],
        execution_mode=problem.execution_mode,
        starter_code=problem.starter_code,
        hints_count=hints_count,
        explanation=None,  # Hidden on problem detail, available on /solution endpoint
        time_complexity=problem.time_complexity,
        space_complexity=problem.space_complexity,
        common_mistakes=problem.common_mistakes,
        related_problems=problem.related_problems,
        topic=topic_brief,
        companies=companies_brief,
        sample_test_cases=sample_tests,
        is_bookmarked=is_bookmarked,
        user_status=user_status,
    )


async def get_problem_hints(
    db: AsyncSession,
    slug: str,
    level: int,
) -> Optional[ProblemHintResponse]:
    """
    Get progressive hint for a problem at level 1 to N.
    """
    stmt = select(Problem).where(Problem.slug == slug)
    result = await db.execute(stmt)
    problem = result.scalar_one_or_none()

    if not problem:
        return None

    hints = problem.hints if isinstance(problem.hints, list) else []
    total_hints = len(hints)

    if total_hints == 0:
        return ProblemHintResponse(
            slug=slug,
            level=level,
            total_hints=0,
            hint="No hints available for this problem.",
        )

    # Clamping level between 1 and total_hints
    target_idx = max(0, min(level - 1, total_hints - 1))
    hint_val = hints[target_idx]
    hint_text = hint_val if isinstance(hint_val, str) else str(hint_val.get("content", hint_val))

    return ProblemHintResponse(
        slug=slug,
        level=target_idx + 1,
        total_hints=total_hints,
        hint=hint_text,
    )


async def get_problem_solution(
    db: AsyncSession,
    slug: str,
) -> Optional[ProblemSolutionResponse]:
    """
    Get reference solution and explanation for a problem.
    """
    stmt = select(Problem).where(Problem.slug == slug)
    result = await db.execute(stmt)
    problem = result.scalar_one_or_none()

    if not problem:
        return None

    return ProblemSolutionResponse(
        slug=problem.slug,
        title=problem.title,
        reference_solution=problem.reference_solution,
        explanation=problem.explanation,
        time_complexity=problem.time_complexity,
        space_complexity=problem.space_complexity,
    )


async def get_daily_challenge(
    db: AsyncSession,
    user_id: Optional[int] = 1,
) -> Optional[ProblemListItem]:
    """
    Deterministic daily problem based on the day's ordinal value.
    """
    count_stmt = select(func.count(Problem.id))
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0

    if total == 0:
        return None

    today_ordinal = date.today().toordinal()
    offset = today_ordinal % total

    stmt = (
        select(Problem)
        .options(
            selectinload(Problem.topic),
            selectinload(Problem.problem_companies).selectinload(ProblemCompany.company),
        )
        .order_by(Problem.id.asc())
        .offset(offset)
        .limit(1)
    )
    res = await db.execute(stmt)
    problem = res.scalar_one_or_none()

    if not problem:
        return None

    solved = False
    bookmarked = False
    if user_id:
        sub_stmt = select(Submission.id).where(
            Submission.user_id == user_id,
            Submission.problem_id == problem.id,
            Submission.verdict == "Accepted",
        )
        solved = (await db.execute(sub_stmt)).scalar_one_or_none() is not None

        bm_stmt = select(Bookmark.id).where(
            Bookmark.user_id == user_id, Bookmark.problem_id == problem.id
        )
        bookmarked = (await db.execute(bm_stmt)).scalar_one_or_none() is not None

    companies_brief = [
        CompanyBrief(
            id=pc.company.id,
            name=pc.company.name,
            slug=pc.company.slug,
        )
        for pc in problem.problem_companies
        if pc.company is not None
    ]

    return ProblemListItem(
        id=problem.id,
        title=problem.title,
        slug=problem.slug,
        difficulty=problem.difficulty,
        topic_id=problem.topic_id,
        topic_slug=problem.topic.slug if problem.topic else None,
        topic_name=problem.topic.name if problem.topic else None,
        companies=companies_brief,
        execution_mode=problem.execution_mode,
        created_at=problem.created_at,
        submission_count=0,
        is_solved=solved,
        is_bookmarked=bookmarked,
    )


async def get_related_problems(
    db: AsyncSession,
    slug: str,
    user_id: Optional[int] = 1,
) -> List[ProblemListItem]:
    """
    Returns related problems based on problem's related_problems slugs
    or falling back to other problems in the same topic.
    """
    stmt = (
        select(Problem)
        .where(Problem.slug == slug)
        .options(selectinload(Problem.topic))
    )
    res = await db.execute(stmt)
    problem = res.scalar_one_or_none()

    if not problem:
        return []

    related_slugs = problem.related_problems
    related_problems: List[Problem] = []

    if isinstance(related_slugs, list) and len(related_slugs) > 0:
        slug_list = [s for s in related_slugs if isinstance(s, str)]
        if slug_list:
            rel_stmt = (
                select(Problem)
                .where(Problem.slug.in_(slug_list))
                .options(
                    selectinload(Problem.topic),
                    selectinload(Problem.problem_companies).selectinload(ProblemCompany.company),
                )
            )
            rel_res = await db.execute(rel_stmt)
            related_problems = list(rel_res.scalars().all())

    if len(related_problems) < 3:
        # Fallback to other problems in the same topic
        existing_ids = {problem.id} | {p.id for p in related_problems}
        needed = 4 - len(related_problems)
        fallback_stmt = (
            select(Problem)
            .where(Problem.topic_id == problem.topic_id, Problem.id.not_in(existing_ids))
            .options(
                selectinload(Problem.topic),
                selectinload(Problem.problem_companies).selectinload(ProblemCompany.company),
            )
            .limit(needed)
        )
        fb_res = await db.execute(fallback_stmt)
        related_problems.extend(list(fb_res.scalars().all()))

    # Build ProblemListItem
    items: List[ProblemListItem] = []
    for prob in related_problems:
        companies_brief = [
            CompanyBrief(
                id=pc.company.id,
                name=pc.company.name,
                slug=pc.company.slug,
            )
            for pc in prob.problem_companies
            if pc.company is not None
        ]
        items.append(
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
                is_solved=None,
                is_bookmarked=None,
            )
        )

    return items
