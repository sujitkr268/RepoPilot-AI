from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class FileChangeItem(BaseModel):
    file_path: str
    original_content: str
    new_content: str
    diff: str
    explanation: str


class ChangeGenerateRequest(BaseModel):
    plan_id: str
    guidance: Optional[str] = None


class ChangeApprovalRequest(BaseModel):
    approved: bool
    notes: Optional[str] = None


class GeneratedChangeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    plan_id: str
    user_id: str
    title: str
    summary: str
    files_changed: List[Dict[str, Any]]
    unified_diff: str
    status: str
    is_approved: bool
    approval_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
