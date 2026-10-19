from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------
# Base Configuration
# ---------------------------------------------------------
class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# User Schemas
# ---------------------------------------------------------
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    display_name: Optional[str] = Field(None, max_length=128)
    settings: Optional[Dict[str, Any]] = None


class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    display_name: Optional[str] = None
    target_company: Optional[str] = "tcs-nqt"


class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserResponse(ORMModel):
    id: int
    username: str
    email: str
    display_name: str
    target_company: Optional[str] = "tcs-nqt"
    streak_days: int = 1
    created_at: datetime
    settings: Dict[str, Any] = {}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---------------------------------------------------------
# Topic Schemas
# ---------------------------------------------------------
class TopicBrief(ORMModel):
    id: int
    name: str
    slug: str
    icon: Optional[str] = None


class TopicResponse(ORMModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    order_index: int = 0
    parent_topic_id: Optional[int] = None
    icon: Optional[str] = None
    problem_count: int = 0
    solved_count: int = 0


# ---------------------------------------------------------
# Company Schemas
# ---------------------------------------------------------
class CompanyBrief(ORMModel):
    id: int
    name: str
    slug: str


class CompanyResponse(ORMModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    common_patterns: Optional[Any] = None
    problem_count: int = 0
    solved_count: int = 0


# ---------------------------------------------------------
# Test Case Schemas
# ---------------------------------------------------------
class TestCaseSample(ORMModel):
    id: int
    input_data: str
    expected_output: str
    is_edge_case: bool = False
    description: Optional[str] = None
    order_index: int = 0


# ---------------------------------------------------------
# Problem Schemas
# ---------------------------------------------------------
class ProblemFilter(BaseModel):
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    company: Optional[str] = None
    search: Optional[str] = None
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


class ProblemListItem(ORMModel):
    id: int
    title: str
    slug: str
    difficulty: str
    topic_id: int
    topic_slug: Optional[str] = None
    topic_name: Optional[str] = None
    companies: List[CompanyBrief] = []
    execution_mode: str = "stdio"
    created_at: datetime
    submission_count: int = 0
    is_solved: Optional[bool] = None
    is_bookmarked: Optional[bool] = None


class ProblemListResponse(BaseModel):
    items: List[ProblemListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class ProblemDetail(ORMModel):
    id: int
    title: str
    slug: str
    difficulty: str
    description: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    examples: List[Dict[str, Any]] = []
    execution_mode: str = "stdio"
    starter_code: str
    hints_count: int = 0
    explanation: Optional[str] = None
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None
    common_mistakes: Optional[Any] = None
    related_problems: Optional[Any] = None
    topic: Optional[TopicBrief] = None
    companies: List[CompanyBrief] = []
    sample_test_cases: List[TestCaseSample] = []
    is_bookmarked: Optional[bool] = False
    user_status: Optional[str] = None  # "solved", "attempted", "unattempted"


class ProblemSolutionResponse(BaseModel):
    slug: str
    title: str
    reference_solution: str
    explanation: Optional[str] = None
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None


class ProblemHintResponse(BaseModel):
    slug: str
    level: int
    total_hints: int
    hint: str


# ---------------------------------------------------------
# Code Execution & Judge Schemas
# ---------------------------------------------------------
class RunCodeRequest(BaseModel):
    problem_slug: Optional[str] = None
    code: str
    custom_input: Optional[str] = None


class SubmitCodeRequest(BaseModel):
    problem_slug: str
    code: str
    user_id: int = 1


class ExecuteRequest(BaseModel):
    code: str
    stdin: str = ""


class ExecuteResponse(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    signal: Optional[str] = None
    compile_output: Optional[str] = None


class TestResult(BaseModel):
    test_case_id: Optional[int] = None
    order_index: int = 0
    is_sample: bool = False
    is_hidden: bool = False
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    actual_output: Optional[str] = None
    status: str  # "passed", "failed", "runtime_error", "timeout", "compile_error"
    time_ms: float = 0.0
    error_message: Optional[str] = None


class VerdictResponse(BaseModel):
    submission_id: Optional[int] = None
    verdict: str  # "Accepted", "Wrong Answer", "Compilation Error", "Runtime Error", "Time Limit Exceeded"
    passed_tests: int
    total_tests: int
    execution_time_ms: float = 0.0
    memory_kb: int = 0
    compiler_output: Optional[str] = None
    stderr_output: Optional[str] = None
    results: List[TestResult] = []


# ---------------------------------------------------------
# Submission Schemas
# ---------------------------------------------------------
class SubmissionResultResponse(ORMModel):
    id: int
    test_case_id: Optional[int] = None
    status: str
    actual_output: Optional[str] = None
    time_ms: Optional[float] = None


class SubmissionResponse(ORMModel):
    id: int
    user_id: int
    problem_id: int
    problem_slug: Optional[str] = None
    problem_title: Optional[str] = None
    code: str
    verdict: str
    passed_tests: int
    total_tests: int
    execution_time_ms: Optional[float] = None
    memory_kb: Optional[int] = None
    compiler_output: Optional[str] = None
    stderr_output: Optional[str] = None
    submitted_at: datetime
    results: List[SubmissionResultResponse] = []


# ---------------------------------------------------------
# Bookmark Schemas
# ---------------------------------------------------------
class BookmarkCreate(BaseModel):
    problem_id: int


class BookmarkResponse(ORMModel):
    id: int
    user_id: int
    problem_id: int
    created_at: datetime
    problem: Optional[ProblemListItem] = None


# ---------------------------------------------------------
# Progress & Stats Schemas
# ---------------------------------------------------------
class ProgressResponse(ORMModel):
    id: int
    topic_id: int
    topic_name: str
    topic_slug: str
    problems_solved: int
    problems_attempted: int
    mastery_pct: float
    last_activity: Optional[datetime] = None


class DifficultyBreakdown(BaseModel):
    medium: int = 0
    hard: int = 0
    very_hard: int = 0


class UserStatsResponse(BaseModel):
    user_id: int
    username: str
    display_name: str
    problems_solved: int
    problems_attempted: int
    total_problems: int
    acceptance_rate: float
    streak_days: int
    difficulty_breakdown: DifficultyBreakdown
    topic_breakdown: List[ProgressResponse] = []


# ---------------------------------------------------------
# Topic / Roadmap Detail Schemas
# ---------------------------------------------------------
class TopicDetailResponse(TopicResponse):
    subtopics: List[TopicResponse] = []
    problems: List[ProblemListItem] = []


class RoadmapTopic(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    order_index: int = 0
    icon: Optional[str] = None
    problem_count: int = 0
    prerequisites: List[str] = []
    subtopics: List[str] = []


class CompanyDetailResponse(CompanyResponse):
    problems: List[ProblemListItem] = []


# ---------------------------------------------------------
# Assessment Schemas
# ---------------------------------------------------------
class AssessmentQuestionDetail(ORMModel):
    id: int
    problem_id: int
    problem_title: str
    problem_slug: str
    difficulty: str
    points: int
    order_index: int


class AssessmentResponse(ORMModel):
    id: int
    title: str
    type: str  # timed, practice, company_mock
    duration_minutes: int
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    question_count: int = 0
    total_points: int = 0
    created_at: datetime
    config: Optional[Dict[str, Any]] = None


class AssessmentDetailResponse(AssessmentResponse):
    questions: List[AssessmentQuestionDetail] = []


class AssessmentAttemptCreate(BaseModel):
    user_id: int = 1


class AssessmentAttemptSubmit(BaseModel):
    user_id: int = 1
    answers: Optional[Dict[str, Any]] = None


class AssessmentAttemptResponse(ORMModel):
    id: int
    user_id: int
    assessment_id: int
    assessment_title: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None
    score: float = 0.0
    max_score: float = 0.0
    results: Optional[Dict[str, Any]] = None
