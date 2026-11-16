import re
import ipaddress
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlparse
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode: Dict[str, Any] = {"sub": str(subject), "exp": expire, "iat": datetime.now(timezone.utc)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def validate_github_url(url: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates that a URL is a legitimate public GitHub repository URL.
    Returns: (is_valid, owner, repo_name)
    Protects against SSRF and malicious target redirects.
    """
    if not url or not isinstance(url, str):
        return False, None, None

    trimmed = url.strip()
    # Normalize github:owner/repo or https://github.com/owner/repo
    if not trimmed.startswith("http://") and not trimmed.startswith("https://"):
        trimmed = "https://" + trimmed

    try:
        parsed = urlparse(trimmed)
    except Exception:
        return False, None, None

    # Strict check: must be github.com (or api.github.com)
    hostname = (parsed.hostname or "").lower()
    if hostname != "github.com":
        return False, None, None

    # Path check: /owner/repo or /owner/repo.git
    path_parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(path_parts) < 2:
        return False, None, None

    owner = path_parts[0]
    repo = path_parts[1].removesuffix(".git")

    # Validate owner and repo names per GitHub naming rules
    # GitHub usernames: alphanumeric and single hyphens, 1-39 chars
    # Repo names: alphanumeric, hyphen, period, underscore, 1-100 chars
    owner_pattern = r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$"
    repo_pattern = r"^[a-zA-Z0-9_.-]{1,100}$"

    if not re.match(owner_pattern, owner) or not re.match(repo_pattern, repo):
        return False, None, None

    return True, owner, repo


def sanitize_prompt_input(text: str) -> str:
    """
    Basic prompt hardening to prevent untrusted repository text from
    hijacking system instructions.
    """
    if not text:
        return ""
    # Strip dangerous control chars and tag injections
    sanitized = text.replace("<|im_start|>", "").replace("<|im_end|>", "")
    sanitized = sanitized.replace("[INST]", "").replace("[/INST]", "")
    return sanitized
