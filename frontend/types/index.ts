export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  github_account?: {
    github_username: string;
    scope?: string;
  };
}

export interface RepositoryAnalysis {
  id: string;
  repository_id: string;
  status: string;
  languages: Record<string, number>;
  frameworks: string[];
  architecture_summary?: string;
  setup_instructions?: string;
  testing_instructions?: string;
  entry_points: string[];
  test_frameworks: string[];
  potential_concerns: string[];
  dependencies: Record<string, string[]>;
  key_directories: string[];
}

export interface Repository {
  id: string;
  github_url: string;
  owner: string;
  name: string;
  default_branch: string;
  description?: string;
  is_private: boolean;
  stars_count: number;
  forks_count: number;
  open_issues_count: number;
  primary_language?: string;
  analysis?: RepositoryAnalysis;
  created_at: string;
  updated_at: string;
}

export interface RepositoryFile {
  id: string;
  path: string;
  type: string;
  size_bytes: number;
  extension?: string;
  is_important: boolean;
  sha?: string;
  content?: string;
}

export interface SourceReference {
  file_path: string;
  start_line?: number;
  end_line?: number;
  snippet?: string;
}

export interface ChatResponse {
  answer: string;
  references: SourceReference[];
  suggested_files: string[];
}

export interface Issue {
  id: string;
  repository_id: string;
  github_issue_number: number;
  title: string;
  body?: string;
  html_url: string;
  state: string;
  labels: string[];
  classification: string;
  estimated_difficulty: string;
  difficulty_score: number;
  required_skills: string[];
  suggested_approach?: string;
  suitability_reason?: string;
  comments_count: number;
}

export interface ChecklistItem {
  id: number;
  description: string;
  completed: boolean;
  file_path?: string;
}

export interface ImplementationPlan {
  id: string;
  issue_id: string;
  title: string;
  problem_explanation: string;
  root_cause_analysis?: string;
  strategy_overview: string;
  affected_files: string[];
  checklist: ChecklistItem[];
  dependencies: string[];
  potential_side_effects: string[];
  testing_strategy: string;
  status: string;
  created_at: string;
}

export interface FileChange {
  file_path: string;
  original_content: string;
  new_content: string;
  diff: string;
  explanation: string;
}

export interface GeneratedChange {
  id: string;
  plan_id: string;
  title: string;
  summary: string;
  files_changed: FileChange[];
  unified_diff: string;
  status: string;
  is_approved: boolean;
  approval_notes?: string;
}

export interface TestExecution {
  id: string;
  change_id: string;
  language_detected: string;
  framework_detected: string;
  command_executed: string;
  sandbox_type: string;
  status: string;
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  duration_seconds: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  ai_failure_analysis?: string;
  suggested_fixes: string[];
}

export interface ReviewFinding {
  severity: "Critical" | "High" | "Medium" | "Low" | "Informational";
  category: string;
  file_path: string;
  line_reference?: number;
  explanation: string;
  evidence: string;
  suggested_correction: string;
}

export interface CodeReview {
  id: string;
  change_id: string;
  overall_status: string;
  summary: string;
  quality_score: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  findings: ReviewFinding[];
}

export interface PullRequest {
  id: string;
  change_id: string;
  github_pr_number?: number;
  html_url?: string;
  target_branch: string;
  source_branch: string;
  title: string;
  body: string;
  state: string;
  is_user_authorized: boolean;
}

export interface AgentEvent {
  id: string;
  session_id: string;
  agent_name: string;
  stage: string;
  event_type: string;
  message: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface AgentSession {
  id: string;
  repository_id: string;
  session_type: string;
  current_agent: string;
  current_stage: string;
  status: string;
  duration_seconds: number;
  events: AgentEvent[];
  created_at: string;
}
