import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    Assessment,
    AssessmentQuestion,
    Company,
    Problem,
    ProblemCompany,
    Progress,
    TestCase,
    Topic,
    User,
)
from app.seed.companies import COMPANIES_DATA
from app.seed.topics import TOPICS_DATA
from app.services.auth import hash_password

logger = logging.getLogger("cforge.seeder")
logging.basicConfig(level=logging.INFO)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def seed_default_user(db: AsyncSession) -> User:
    """Ensure the default dev user exists with credentials."""
    stmt = select(User).where(User.id == 1)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        stmt_u = select(User).where(User.username == "cforge_dev")
        res_u = await db.execute(stmt_u)
        user = res_u.scalar_one_or_none()

    if not user:
        user = User(
            id=1,
            username="cforge_dev",
            email="developer@cforge.dev",
            password_hash=hash_password("cforge123"),
            display_name="CForge Developer",
            target_company="tcs-nqt",
            streak_days=1,
            settings={
                "theme": "dark",
                "editor_font_size": 14,
                "keybinding": "standard",
            },
            created_at=utc_now(),
        )
        db.add(user)
        await db.flush()
        print("[Seeder] Created default user 'cforge_dev' (id=1)")
    else:
        # Ensure default user has valid password hash and email
        if not user.password_hash:
            user.password_hash = hash_password("cforge123")
        if not user.email:
            user.email = "developer@cforge.dev"
        await db.flush()
        print("[Seeder] Default user already exists.")
    return user


async def seed_topics(db: AsyncSession) -> Dict[str, Topic]:
    """Seed the 18 core topics."""
    topic_map: Dict[str, Topic] = {}

    for t_data in TOPICS_DATA:
        stmt = select(Topic).where(Topic.slug == t_data["slug"])
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        if not existing:
            new_topic = Topic(
                name=t_data["name"],
                slug=t_data["slug"],
                description=t_data.get("description"),
                order_index=t_data.get("order_index", 0),
                icon=t_data.get("icon"),
            )
            db.add(new_topic)
            await db.flush()
            topic_map[t_data["slug"]] = new_topic
            print(f"[Seeder] Inserted topic: {t_data['name']}")
        else:
            topic_map[t_data["slug"]] = existing

    return topic_map


async def seed_companies(db: AsyncSession) -> Dict[str, Company]:
    """Seed the 10 hiring companies."""
    company_map: Dict[str, Company] = {}

    for c_data in COMPANIES_DATA:
        stmt = select(Company).where(Company.slug == c_data["slug"])
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        if not existing:
            new_comp = Company(
                name=c_data["name"],
                slug=c_data["slug"],
                description=c_data.get("description"),
                common_patterns=c_data.get("common_patterns", []),
            )
            db.add(new_comp)
            await db.flush()
            company_map[c_data["slug"]] = new_comp
            print(f"[Seeder] Inserted company: {c_data['name']}")
        else:
            company_map[c_data["slug"]] = existing

    return company_map


TOPIC_SLUG_ALIASES: Dict[str, str] = {
    "c-fundamentals": "c_fundamentals",
    "pattern-programming": "pattern_programming",
    "functions-recursion": "functions_recursion",
    "dynamic-memory": "dynamic_memory",
    "structures-unions": "structures_unions",
    "linked-lists": "linked_lists",
    "stacks-queues": "stacks_queues",
    "searching-sorting": "searching_sorting",
    "trees-bst": "trees_bst",
    "heaps-hashing-tries": "heaps_hashing_tries",
    "dp-and-greedy": "dp_greedy",
    "dp_and_greedy": "dp_greedy",
    "bitwise-operations": "bitwise_ops",
    "bitwise_operations": "bitwise_ops",
    "file-handling-preprocessor": "file_handling_preprocessor",
    "advanced-c-systems": "advanced_c_systems",
}

COMPANY_SLUG_ALIASES: Dict[str, str] = {
    "tcs": "tcs-nqt",
    "hcl": "hcltech",
    "cognizant-genc": "cognizant",
    "tech_mahindra": "tech-mahindra",
}


async def seed_questions_from_json(
    db: AsyncSession,
    topic_map: Dict[str, Topic],
    company_map: Dict[str, Company],
) -> int:
    """
    Scans app/seed/questions/ for JSON files and seeds problems + test cases.
    Idempotent: skips problems that already exist by slug.
    """
    questions_dir = Path(__file__).parent / "questions"
    if not questions_dir.exists():
        print(f"[Seeder] Questions directory not found: {questions_dir} (skipping question seeding)")
        return 0

    json_files = list(questions_dir.glob("*.json"))
    if not json_files:
        print(f"[Seeder] No JSON question files found in {questions_dir}")
        return 0

    total_added = 0
    default_topic = next(iter(topic_map.values())) if topic_map else None

    for file_path in json_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = json.load(f)

            if isinstance(content, list):
                raw_problems = content
            elif isinstance(content, dict):
                if "problems" in content and isinstance(content["problems"], list):
                    raw_problems = content["problems"]
                else:
                    raw_problems = [content]
            else:
                continue

            for prob_data in raw_problems:
                slug = prob_data.get("slug")
                if not slug:
                    continue

                # Check if problem exists
                check_stmt = select(Problem).where(Problem.slug == slug)
                check_res = await db.execute(check_stmt)
                if check_res.scalar_one_or_none():
                    continue

                # Determine topic
                raw_topic_slug = prob_data.get("topic_slug", "")
                normalized_slug = TOPIC_SLUG_ALIASES.get(raw_topic_slug, raw_topic_slug.replace("-", "_"))
                topic = topic_map.get(normalized_slug) or topic_map.get(raw_topic_slug)
                if not topic and "topic_id" in prob_data:
                    t_stmt = select(Topic).where(Topic.id == prob_data["topic_id"])
                    topic = (await db.execute(t_stmt)).scalar_one_or_none()
                if not topic:
                    topic = default_topic

                if not topic:
                    print(f"[Seeder] Cannot seed problem {slug}: no valid topic found.")
                    continue

                # Create Problem
                problem = Problem(
                    title=prob_data.get("title", slug.replace("-", " ").title()),
                    slug=slug,
                    difficulty=prob_data.get("difficulty", "medium").lower(),
                    description=prob_data.get("description", ""),
                    input_format=prob_data.get("input_format"),
                    output_format=prob_data.get("output_format"),
                    constraints=prob_data.get("constraints"),
                    examples=prob_data.get("examples", []),
                    execution_mode=prob_data.get("execution_mode", "stdio"),
                    starter_code=prob_data.get("starter_code", "#include <stdio.h>\n\nint main() {\n    return 0;\n}"),
                    reference_solution=prob_data.get("reference_solution", ""),
                    hints=prob_data.get("hints", []),
                    explanation=prob_data.get("explanation"),
                    time_complexity=prob_data.get("time_complexity"),
                    space_complexity=prob_data.get("space_complexity"),
                    common_mistakes=prob_data.get("common_mistakes", []),
                    related_problems=prob_data.get("related_problems", []),
                    topic_id=topic.id,
                    created_at=utc_now(),
                )
                db.add(problem)
                await db.flush()

                # Add test cases
                test_cases_data = prob_data.get("test_cases", [])
                for idx, tc in enumerate(test_cases_data):
                    input_data = tc.get("input_data")
                    if input_data is None:
                        input_data = tc.get("input", "")

                    test_case = TestCase(
                        problem_id=problem.id,
                        input_data=input_data,
                        expected_output=tc.get("expected_output", ""),
                        is_hidden=tc.get("is_hidden", False),
                        is_edge_case=tc.get("is_edge_case", False),
                        description=tc.get("description"),
                        order_index=tc.get("order_index", idx),
                    )
                    db.add(test_case)

                # Link companies
                companies_info = prob_data.get("company_slugs") or prob_data.get("companies") or []
                for comp_item in companies_info:
                    raw_c_slug = comp_item if isinstance(comp_item, str) else comp_item.get("slug")
                    if not raw_c_slug:
                        continue
                    c_slug = COMPANY_SLUG_ALIASES.get(raw_c_slug, raw_c_slug)
                    comp_obj = company_map.get(c_slug)
                    if not comp_obj:
                        # Auto-create company if it doesn't exist so it can be tracked
                        comp_name = raw_c_slug.replace("-", " ").replace("_", " ").title()
                        comp_obj = Company(
                            name=comp_name,
                            slug=c_slug,
                            description=f"Systems and C programming challenges from {comp_name}.",
                            common_patterns=["Systems Design", "Algorithms", "Data Structures"],
                        )
                        db.add(comp_obj)
                        await db.flush()
                        company_map[c_slug] = comp_obj

                    src_type = comp_item.get("source_type", "oa") if isinstance(comp_item, dict) else "oa"
                    src_url = comp_item.get("source_url") if isinstance(comp_item, dict) else None
                    confidence = comp_item.get("confidence", 1.0) if isinstance(comp_item, dict) else 1.0

                    pc = ProblemCompany(
                        problem_id=problem.id,
                        company_id=comp_obj.id,
                        source_type=src_type,
                        source_url=src_url,
                        confidence=confidence,
                    )
                    db.add(pc)

                total_added += 1

        except Exception as e:
            print(f"[Seeder] Error loading questions from {file_path}: {e}")

    return total_added


async def seed_assessments(
    db: AsyncSession,
    company_map: Dict[str, Company],
) -> None:
    """Seed foundational mock assessments."""
    assessment_specs = [
        {
            "title": "TCS NQT Full Coding Assessment",
            "type": "company_mock",
            "duration_minutes": 60,
            "company_slug": "tcs-nqt",
            "config": {"instructions": "Complete all coding tasks. Negative marking does not apply."},
        },
        {
            "title": "Infosys Specialist Programmer Mock",
            "type": "company_mock",
            "duration_minutes": 90,
            "company_slug": "infosys",
            "config": {"instructions": "Two algorithm challenges. Focus on time complexity."},
        },
        {
            "title": "Accenture Digital Systems Assessment",
            "type": "company_mock",
            "duration_minutes": 60,
            "company_slug": "accenture",
            "config": {"instructions": "Focus on bitwise and array manipulation efficiency."},
        },
        {
            "title": "C Pointer & Memory Mastery Timed Exam",
            "type": "timed",
            "duration_minutes": 45,
            "company_slug": None,
            "config": {"instructions": "Solve pointer and memory allocation questions within the time limit."},
        },
    ]

    for spec in assessment_specs:
        stmt = select(Assessment).where(Assessment.title == spec["title"])
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            continue

        comp = company_map.get(spec["company_slug"]) if spec["company_slug"] else None
        assessment = Assessment(
            title=spec["title"],
            type=spec["type"],
            duration_minutes=spec["duration_minutes"],
            company_id=comp.id if comp else None,
            config=spec["config"],
            created_at=utc_now(),
        )
        db.add(assessment)
        await db.flush()

        # Try to link up to 2-3 existing problems
        if comp:
            q_stmt = (
                select(Problem)
                .join(ProblemCompany, ProblemCompany.problem_id == Problem.id)
                .where(ProblemCompany.company_id == comp.id)
                .limit(3)
            )
        else:
            q_stmt = select(Problem).limit(3)

        q_res = await db.execute(q_stmt)
        problems_to_link = q_res.scalars().all()

        for idx, prob in enumerate(problems_to_link):
            aq = AssessmentQuestion(
                assessment_id=assessment.id,
                problem_id=prob.id,
                order_index=idx,
                points=10 if prob.difficulty == "medium" else 20,
            )
            db.add(aq)

        print(f"[Seeder] Seeded assessment: {spec['title']}")


async def seed_user_progress(db: AsyncSession, user_id: int = 1) -> None:
    """Initialize empty progress records for each topic for the default user."""
    topics_res = await db.execute(select(Topic))
    topics = topics_res.scalars().all()

    for t in topics:
        stmt = select(Progress).where(Progress.user_id == user_id, Progress.topic_id == t.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            prog = Progress(
                user_id=user_id,
                topic_id=t.id,
                problems_solved=0,
                problems_attempted=0,
                mastery_pct=0.0,
                last_activity=None,
            )
            db.add(prog)


async def seed_all(db: AsyncSession) -> None:
    """Main seeder entrypoint: runs all seed steps idempotently."""
    print("=== [CForge Database Seeder] Starting Seeding ===")
    user = await seed_default_user(db)
    topic_map = await seed_topics(db)
    company_map = await seed_companies(db)
    added_questions = await seed_questions_from_json(db, topic_map, company_map)
    await seed_assessments(db, company_map)
    await seed_user_progress(db, user.id)
    await db.commit()
    print(f"=== [CForge Database Seeder] Finished Seeding ({added_questions} questions loaded) ===")
