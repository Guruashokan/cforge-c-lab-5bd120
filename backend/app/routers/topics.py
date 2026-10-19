from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import Company, Problem, ProblemCompany, Progress, Submission, Topic
from app.schemas.schemas import (
    CompanyBrief,
    ProblemListItem,
    RoadmapTopic,
    TopicDetailResponse,
    TopicResponse,
)

router = APIRouter(tags=["Topics"])

# Static pedagogical prerequisites for the C roadmap
ROADMAP_PREREQUISITES: Dict[str, List[str]] = {
    "c_fundamentals": [],
    "pattern_programming": ["c_fundamentals"],
    "functions_recursion": ["c_fundamentals"],
    "arrays": ["c_fundamentals"],
    "strings": ["arrays"],
    "pointers": ["c_fundamentals", "arrays"],
    "dynamic_memory": ["pointers"],
    "structures_unions": ["pointers"],
    "linked_lists": ["pointers", "dynamic_memory", "structures_unions"],
    "stacks_queues": ["linked_lists", "arrays"],
    "searching_sorting": ["arrays", "functions_recursion"],
    "trees_bst": ["linked_lists", "functions_recursion"],
    "heaps_hashing_tries": ["arrays", "trees_bst"],
    "graphs": ["trees_bst", "stacks_queues"],
    "dp_greedy": ["functions_recursion", "searching_sorting"],
    "bitwise_ops": ["c_fundamentals"],
    "file_handling_preprocessor": ["c_fundamentals", "pointers"],
    "advanced_c_systems": ["pointers", "dynamic_memory", "file_handling_preprocessor"],
}


@router.get("/api/topics", response_model=List[TopicResponse])
async def list_topics(
    user_id: Optional[int] = Query(1, description="Current user ID"),
    db: AsyncSession = Depends(get_db),
):
    """List all topics with total problem count and user's solved count."""
    stmt = select(Topic).order_by(Topic.order_index.asc())
    res = await db.execute(stmt)
    topics = res.scalars().all()

    # Problem counts per topic
    p_count_stmt = select(Problem.topic_id, func.count(Problem.id)).group_by(Problem.topic_id)
    p_count_res = await db.execute(p_count_stmt)
    prob_counts = dict(p_count_res.all())

    # Solved counts per topic for user
    solved_map: Dict[int, int] = {}
    if user_id:
        s_count_stmt = (
            select(Problem.topic_id, func.count(func.distinct(Problem.id)))
            .join(Submission, Submission.problem_id == Problem.id)
            .where(Submission.user_id == user_id, Submission.verdict == "Accepted")
            .group_by(Problem.topic_id)
        )
        s_res = await db.execute(s_count_stmt)
        solved_map = dict(s_res.all())

    return [
        TopicResponse(
            id=t.id,
            name=t.name,
            slug=t.slug,
            description=t.description,
            order_index=t.order_index,
            parent_topic_id=t.parent_topic_id,
            icon=t.icon,
            problem_count=prob_counts.get(t.id, 0),
            solved_count=solved_map.get(t.id, 0),
        )
        for t in topics
    ]


@router.get("/api/roadmap", response_model=List[RoadmapTopic])
async def get_roadmap(
    db: AsyncSession = Depends(get_db),
):
    """Get the curated sequential learning roadmap with prerequisites."""
    stmt = (
        select(Topic)
        .options(selectinload(Topic.subtopics))
        .order_by(Topic.order_index.asc())
    )
    res = await db.execute(stmt)
    topics = res.scalars().all()

    # Problem count map
    p_count_stmt = select(Problem.topic_id, func.count(Problem.id)).group_by(Problem.topic_id)
    p_count_res = await db.execute(p_count_stmt)
    prob_counts = dict(p_count_res.all())

    roadmap_items: List[RoadmapTopic] = []
    for t in topics:
        subtopic_slugs = [st.slug for st in t.subtopics] if t.subtopics else []
        roadmap_items.append(
            RoadmapTopic(
                id=t.id,
                name=t.name,
                slug=t.slug,
                description=t.description,
                order_index=t.order_index,
                icon=t.icon,
                problem_count=prob_counts.get(t.id, 0),
                prerequisites=ROADMAP_PREREQUISITES.get(t.slug, []),
                subtopics=subtopic_slugs,
            )
        )

    return roadmap_items


@router.get("/api/topics/{slug}", response_model=TopicDetailResponse)
async def get_topic_detail(
    slug: str,
    user_id: Optional[int] = Query(1, description="Current user ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get topic detail with all its problems and subtopics."""
    stmt = (
        select(Topic)
        .where(Topic.slug == slug)
        .options(
            selectinload(Topic.subtopics),
            selectinload(Topic.problems)
            .selectinload(Problem.problem_companies)
            .selectinload(ProblemCompany.company),
        )
    )
    res = await db.execute(stmt)
    topic = res.scalar_one_or_none()

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with slug '{slug}' not found",
        )

    # Subtopics responses
    subtopic_res: List[TopicResponse] = []
    for st in topic.subtopics:
        # count for subtopic
        sub_cnt = (
            await db.execute(select(func.count(Problem.id)).where(Problem.topic_id == st.id))
        ).scalar() or 0
        subtopic_res.append(
            TopicResponse(
                id=st.id,
                name=st.name,
                slug=st.slug,
                description=st.description,
                order_index=st.order_index,
                parent_topic_id=st.parent_topic_id,
                icon=st.icon,
                problem_count=sub_cnt,
                solved_count=0,
            )
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
    for prob in topic.problems:
        companies_brief = [
            CompanyBrief(
                id=pc.company.id,
                name=pc.company.name,
                slug=pc.company.slug,
            )
            for pc in prob.problem_companies
            if pc.company is not None
        ]
        problem_items.append(
            ProblemListItem(
                id=prob.id,
                title=prob.title,
                slug=prob.slug,
                difficulty=prob.difficulty,
                topic_id=prob.topic_id,
                topic_slug=topic.slug,
                topic_name=topic.name,
                companies=companies_brief,
                execution_mode=prob.execution_mode,
                created_at=prob.created_at,
                submission_count=0,
                is_solved=prob.id in solved_problem_ids if user_id else None,
                is_bookmarked=None,
            )
        )

    solved_count = sum(1 for p in topic.problems if p.id in solved_problem_ids)

    return TopicDetailResponse(
        id=topic.id,
        name=topic.name,
        slug=topic.slug,
        description=topic.description,
        order_index=topic.order_index,
        parent_topic_id=topic.parent_topic_id,
        icon=topic.icon,
        problem_count=len(topic.problems),
        solved_count=solved_count,
        subtopics=subtopic_res,
        problems=problem_items,
    )
