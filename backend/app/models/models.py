from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, default="", nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    target_company: Mapped[Optional[str]] = mapped_column(String(64), default="tcs-nqt", nullable=True)
    streak_days: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    catalyst_row_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    submissions: Mapped[List["Submission"]] = relationship(
        "Submission", back_populates="user", cascade="all, delete-orphan"
    )
    bookmarks: Mapped[List["Bookmark"]] = relationship(
        "Bookmark", back_populates="user", cascade="all, delete-orphan"
    )
    progress: Mapped[List["Progress"]] = relationship(
        "Progress", back_populates="user", cascade="all, delete-orphan"
    )
    assessment_attempts: Mapped[List["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt", back_populates="user", cascade="all, delete-orphan"
    )


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, index=True)
    parent_topic_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True
    )
    icon: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Relationships
    parent_topic: Mapped[Optional["Topic"]] = relationship(
        "Topic", remote_side=[id], back_populates="subtopics"
    )
    subtopics: Mapped[List["Topic"]] = relationship(
        "Topic", back_populates="parent_topic"
    )
    problems: Mapped[List["Problem"]] = relationship(
        "Problem", back_populates="topic"
    )
    progress: Mapped[List["Progress"]] = relationship(
        "Progress", back_populates="topic"
    )


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    common_patterns: Mapped[Optional[Any]] = mapped_column(JSON, default=list, nullable=True)

    # Relationships
    problem_companies: Mapped[List["ProblemCompany"]] = relationship(
        "ProblemCompany", back_populates="company", cascade="all, delete-orphan"
    )
    assessments: Mapped[List["Assessment"]] = relationship(
        "Assessment", back_populates="company"
    )


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    slug: Mapped[str] = mapped_column(String(256), unique=True, index=True, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # medium, hard, very_hard
    description: Mapped[str] = mapped_column(Text, nullable=False)
    input_format: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    output_format: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    constraints: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    examples: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    execution_mode: Mapped[str] = mapped_column(String(32), default="stdio", nullable=False)  # stdio, function
    starter_code: Mapped[str] = mapped_column(Text, nullable=False)
    reference_solution: Mapped[str] = mapped_column(Text, nullable=False)
    hints: Mapped[List[Any]] = mapped_column(JSON, default=list, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_complexity: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    space_complexity: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    common_mistakes: Mapped[Optional[Any]] = mapped_column(JSON, default=list, nullable=True)
    related_problems: Mapped[Optional[Any]] = mapped_column(JSON, default=list, nullable=True)
    topic_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    topic: Mapped["Topic"] = relationship("Topic", back_populates="problems")
    test_cases: Mapped[List["TestCase"]] = relationship(
        "TestCase", back_populates="problem", cascade="all, delete-orphan", order_by="TestCase.order_index"
    )
    submissions: Mapped[List["Submission"]] = relationship(
        "Submission", back_populates="problem", cascade="all, delete-orphan"
    )
    bookmarks: Mapped[List["Bookmark"]] = relationship(
        "Bookmark", back_populates="problem", cascade="all, delete-orphan"
    )
    problem_companies: Mapped[List["ProblemCompany"]] = relationship(
        "ProblemCompany", back_populates="problem", cascade="all, delete-orphan"
    )
    assessment_questions: Mapped[List["AssessmentQuestion"]] = relationship(
        "AssessmentQuestion", back_populates="problem", cascade="all, delete-orphan"
    )


class ProblemCompany(Base):
    __tablename__ = "problem_companies"
    __table_args__ = (
        UniqueConstraint("problem_id", "company_id", name="uq_problem_company"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_type: Mapped[str] = mapped_column(String(64), default="oa", nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # Relationships
    problem: Mapped["Problem"] = relationship("Problem", back_populates="problem_companies")
    company: Mapped["Company"] = relationship("Company", back_populates="problem_companies")


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    input_data: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_edge_case: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    problem: Mapped["Problem"] = relationship("Problem", back_populates="test_cases")
    submission_results: Mapped[List["SubmissionResult"]] = relationship(
        "SubmissionResult", back_populates="test_case", cascade="all, delete-orphan"
    )


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    verdict: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    passed_tests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_tests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    execution_time_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    memory_kb: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    compiler_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stderr_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="submissions")
    problem: Mapped["Problem"] = relationship("Problem", back_populates="submissions")
    results: Mapped[List["SubmissionResult"]] = relationship(
        "SubmissionResult", back_populates="submission", cascade="all, delete-orphan"
    )


class SubmissionResult(Base):
    __tablename__ = "submission_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    submission_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    test_case_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("test_cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)  # passed, failed, error, timeout
    actual_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="results")
    test_case: Mapped[Optional["TestCase"]] = relationship("TestCase", back_populates="submission_results")


class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (
        UniqueConstraint("user_id", "problem_id", name="uq_user_problem_bookmark"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="bookmarks")
    problem: Mapped["Problem"] = relationship("Problem", back_populates="bookmarks")


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", name="uq_user_topic_progress"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problems_solved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    problems_attempted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mastery_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_activity: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="progress")
    topic: Mapped["Topic"] = relationship("Topic", back_populates="progress")


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)  # timed, practice, company_mock
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    company_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="assessments")
    questions: Mapped[List["AssessmentQuestion"]] = relationship(
        "AssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan", order_by="AssessmentQuestion.order_index"
    )
    attempts: Mapped[List["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt", back_populates="assessment", cascade="all, delete-orphan"
    )


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"
    __table_args__ = (
        UniqueConstraint("assessment_id", "problem_id", name="uq_assessment_problem"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    # Relationships
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="questions")
    problem: Mapped["Problem"] = relationship("Problem", back_populates="assessment_questions")


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    results: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="assessment_attempts")
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="attempts")
