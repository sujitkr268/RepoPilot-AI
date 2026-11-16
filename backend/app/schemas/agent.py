from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class AgentEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    agent_name: str
    stage: str
    event_type: str
    message: str
    payload: Dict[str, Any]
    created_at: datetime


class AgentSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    user_id: str
    issue_id: Optional[str] = None
    session_type: str
    current_agent: str
    current_stage: str
    status: str
    state_checkpoint: Dict[str, Any]
    error_message: Optional[str] = None
    retry_count: int
    duration_seconds: float
    created_at: datetime
    updated_at: datetime
    events: List[AgentEventRead] = []
