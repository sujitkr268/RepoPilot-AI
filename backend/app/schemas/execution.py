from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class TestExecutionRequest(BaseModel):
    custom_command: Optional[str] = None


class TestExecutionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    change_id: str
    user_id: str
    language_detected: str
    framework_detected: str
    command_executed: str
    sandbox_type: str
    status: str
    exit_code: Optional[int] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    duration_seconds: float
    total_tests: int
    passed_tests: int
    failed_tests: int
    skipped_tests: int
    failure_details: List[Dict[str, Any]]
    ai_failure_analysis: Optional[str] = None
    suggested_fixes: List[str]
    created_at: datetime
