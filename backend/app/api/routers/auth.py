from datetime import timedelta
from typing import Dict, Any, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash
from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User, GitHubAccount
from app.schemas.user import UserRead, Token, LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserRead)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/demo", response_model=Token)
async def login_demo_user(db: AsyncSession = Depends(get_db)):
    """Provides a zero-friction demo authentication token for instant platform evaluation."""
    email = "developer@repopilot.io"
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        user = User(
            email=email,
            username="repopilot_dev",
            full_name="RepoPilot Developer",
            avatar_url="https://github.com/ghost.png",
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user.id)
    return Token(access_token=token, token_type="bearer", user=user)


@router.get("/github")
async def github_oauth_redirect():
    """Generates GitHub OAuth authorization URL."""
    client_id = settings.GITHUB_CLIENT_ID or "REPOPILOT_GITHUB_CLIENT_ID"
    redirect_uri = settings.GITHUB_REDIRECT_URI
    scope = "repo,read:user,user:email"
    url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}"
    return {"url": url, "configured": bool(settings.GITHUB_CLIENT_ID)}


@router.get("/github/callback", response_model=Token)
async def github_oauth_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """Exchanges GitHub OAuth code for access token and creates or updates user session."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth credentials (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET) not configured in .env.",
        )

    # Exchange code for token
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    payload = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_res = await client.post(token_url, headers=headers, json=payload)
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to obtain GitHub access token.")

        # Fetch GitHub User info
        user_res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"},
        )
        gh_user = user_res.json()

    github_id = str(gh_user.get("id"))
    username = gh_user.get("login") or f"gh_user_{github_id}"
    email = gh_user.get("email") or f"{username}@users.noreply.github.com"
    avatar_url = gh_user.get("avatar_url")
    full_name = gh_user.get("name") or username

    # Check existing user
    stmt = select(GitHubAccount).where(GitHubAccount.github_id == github_id)
    res = await db.execute(stmt)
    gh_acc = res.scalar_one_or_none()

    if gh_acc:
        user_res = await db.execute(select(User).where(User.id == gh_acc.user_id))
        user = user_res.scalar_one()
        gh_acc.access_token_encrypted = access_token
    else:
        user = User(
            email=email,
            username=username,
            full_name=full_name,
            avatar_url=avatar_url,
        )
        db.add(user)
        await db.flush()

        gh_acc = GitHubAccount(
            user_id=user.id,
            github_id=github_id,
            github_username=username,
            access_token_encrypted=access_token,
            scope="repo,read:user,user:email",
        )
        db.add(gh_acc)

    await db.commit()
    await db.refresh(user)

    app_token = create_access_token(user.id)
    return Token(access_token=app_token, token_type="bearer", user=user)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="repopilot_session")
    return {"message": "Successfully logged out."}
