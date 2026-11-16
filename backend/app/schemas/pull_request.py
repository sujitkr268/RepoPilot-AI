from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PullRequestCreateRequest(BaseModel):
    branch_name: Optional[str] = None
    target_branch: str = "main"
    title: Optional[str] = None
    body: Optional[str] = None
    confirm_push: bool = Field(..., description="Must explicitly confirm push and PR creation")


class PullRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    change_id: str
    user_id: str
    github_pr_number: Optional[int] = None
    html_url: Optional[str] = None
    target_branch: str
    source_branch: str
    title: str
    body: str
    state: str
    is_user_authorized: bool
    created_at: datetime
    updated_at: datetime
