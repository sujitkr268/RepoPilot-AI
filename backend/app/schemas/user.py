from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class GitHubAccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    github_id: str
    github_username: str
    scope: Optional[str] = None
    created_at: datetime


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: Optional[str] = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    is_superuser: bool
    github_account: Optional[GitHubAccountRead] = None
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class LoginRequest(BaseModel):
    username_or_email: str
    password: str
