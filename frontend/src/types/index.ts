export type Difficulty = 'medium' | 'hard' | 'very_hard';
export type Verdict = 'accepted' | 'wrong_answer' | 'compilation_error' | 'runtime_error' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'internal_error';
export type ExecutionMode = 'stdio' | 'function';

export interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: Difficulty;
  description: string;
  input_format: string;
  output_format: string;
  constraints: string;
  examples: Example[];
  execution_mode: ExecutionMode;
  starter_code: string;
  hints: string[];
  explanation: string;
  time_complexity: string;
  space_complexity: string;
  common_mistakes: string[];
  related_problems: string[];
  topic: Topic;
  companies: CompanyTag[];
  is_bookmarked: boolean;
  is_solved: boolean;
}

export interface ProblemListItem {
  id: number;
  title: string;
  slug: string;
  difficulty: Difficulty;
  topic_name: string;
  topic_slug: string;
  is_solved: boolean;
  is_bookmarked: boolean;
  acceptance_rate: number;
  company_slugs: string[];
}

export interface Example {
  input: string;
  output: string;
  explanation: string;
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
  description: string;
  order_index: number;
  icon: string;
  problem_count: number;
  solved_count: number;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  description: string;
  common_patterns: string[];
  problem_count: number;
  solved_count: number;
}

export interface CompanyTag {
  company_slug: string;
  company_name: string;
  source_type: string;
}

export interface TestResult {
  test_case_index: number;
  status: 'passed' | 'failed' | 'error' | 'timeout';
  input: string;
  expected_output: string;
  actual_output: string;
  time_ms: number;
  is_hidden: boolean;
  description: string;
}

export interface SubmissionResponse {
  id: number;
  verdict: Verdict;
  passed_tests: number;
  total_tests: number;
  execution_time_ms: number;
  memory_kb: number;
  compiler_output: string;
  stderr_output: string;
  test_results: TestResult[];
  submitted_at: string;
}

export interface RunResponse {
  test_results: TestResult[];
  compiler_output: string;
  stderr_output: string;
}

export interface UserStats {
  total_solved: number;
  total_attempted: number;
  acceptance_rate: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  very_hard_solved: number;
  current_streak: number;
  max_streak: number;
  topic_progress: TopicProgress[];
  recent_submissions: RecentSubmission[];
  difficulty_distribution: {difficulty: string; solved: number; total: number}[];
}

export interface TopicProgress {
  topic_name: string;
  topic_slug: string;
  solved: number;
  total: number;
  mastery_pct: number;
}

export interface RecentSubmission {
  id: number;
  problem_title: string;
  problem_slug: string;
  verdict: Verdict;
  submitted_at: string;
}

export interface Assessment {
  id: number;
  title: string;
  type: 'timed' | 'practice' | 'company_mock';
  duration_minutes: number;
  company_name?: string;
  company_slug?: string;
  question_count: number;
}

export interface AssessmentAttempt {
  id: number;
  assessment_id: number;
  started_at: string;
  finished_at?: string;
  score: number;
  max_score: number;
  results: any;
  problems: Problem[];
}

export interface RoadmapItem {
  topic: Topic;
  prerequisites: string[];
  problems: ProblemListItem[];
  is_unlocked: boolean;
}

export interface ProblemFilterParams {
  topic?: string;
  difficulty?: string;
  company?: string;
  status?: 'all' | 'solved' | 'unsolved';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  target_company?: string;
  streak_days: number;
  created_at: string;
  settings?: {
    theme?: string;
    editor_font_size?: number;
    [key: string]: any;
  };
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface CatalystStatus {
  is_configured: boolean;
  project_id: string;
  data_center: string;
  tables: {
    users: string;
    submissions: string;
    progress: string;
  };
  mode: string;
  stats?: {
    users_synced?: number;
    submissions_synced?: number;
  };
}

export interface CatalystSyncResponse {
  synced: boolean;
  catalyst_row_id?: string;
  message: string;
}

