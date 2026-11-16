from typing import TypedDict, Optional, List, Dict, Any


class AgentWorkflowState(TypedDict, total=False):
    # Session metadata
    session_id: str
    user_id: str
    repository_id: str
    issue_id: Optional[str]
    plan_id: Optional[str]
    change_id: Optional[str]
    test_id: Optional[str]
    review_id: Optional[str]
    pr_id: Optional[str]

    # Target repository context
    owner: str
    repo: str
    default_branch: str
    languages: Dict[str, Any]
    frameworks: List[str]
    architecture_summary: Optional[str]
    key_directories: List[str]
    entry_points: List[str]
    test_frameworks: List[str]

    # Retrieved code context
    retrieved_chunks: List[Dict[str, Any]]
    query: Optional[str]

    # Issues
    raw_issues: List[Dict[str, Any]]
    classified_issues: List[Dict[str, Any]]
    selected_issue: Optional[Dict[str, Any]]

    # Implementation Plan
    plan_data: Optional[Dict[str, Any]]
    is_plan_approved: bool

    # Generated Code Change
    change_data: Optional[Dict[str, Any]]
    is_change_approved: bool

    # Sandbox Testing Results
    test_results: Optional[Dict[str, Any]]

    # Code Review Findings
    review_results: Optional[Dict[str, Any]]

    # Pull Request Data
    pr_data: Optional[Dict[str, Any]]
    pr_authorized: bool

    # Workflow execution telemetry
    current_agent: str
    current_stage: str
    status: str  # running, paused, waiting_approval, completed, failed
    events: List[Dict[str, Any]]
    error: Optional[str]
