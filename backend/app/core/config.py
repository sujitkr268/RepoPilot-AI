from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "RepoPilot AI"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security & Auth
    SECRET_KEY: str = "repopilot-super-secret-development-key-change-in-production-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Database
    # Defaults to SQLite async for zero-friction local run/testing; supports PostgreSQL asyncpg via DATABASE_URL
    DATABASE_URL: str = "sqlite+aiosqlite:///./repopilot.db"

    # GitHub OAuth & API
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GITHUB_REDIRECT_URI: str = "http://localhost:3000/auth/callback"
    GITHUB_DEFAULT_TOKEN: Optional[str] = None  # Optional personal access token for higher GitHub rate limits

    # LLM Provider Configuration
    # Supported: mock, openai, anthropic, gemini, groq, ollama
    LLM_PROVIDER: str = "mock"  # default to deterministic mock provider unless configured
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_API_KEY: Optional[str] = None
    LLM_BASE_URL: Optional[str] = None
    LLM_TEMPERATURE: float = 0.2

    # Execution Sandbox Settings
    SANDBOX_TIMEOUT_SECONDS: int = 45
    SANDBOX_MAX_MEMORY_MB: int = 512
    SANDBOX_ALLOW_NETWORK: bool = False
    DOCKER_AVAILABLE: bool = False


settings = Settings()
