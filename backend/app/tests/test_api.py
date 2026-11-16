import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.session import init_db


@pytest_asyncio.fixture(autouse=True, loop_scope="function")
async def setup_db():
    await init_db()


@pytest.mark.asyncio
async def test_health_and_root():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

        root_resp = await client.get("/")
        assert root_resp.status_code == 200
        assert root_resp.json()["name"] == "RepoPilot AI"


@pytest.mark.asyncio
async def test_auth_and_profile():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        demo_resp = await client.post("/api/v1/auth/demo")
        assert demo_resp.status_code == 200
        data = demo_resp.json()
        assert "access_token" in data
        token = data["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "developer@repopilot.io"


@pytest.mark.asyncio
async def test_repositories_and_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Connect Repo
        connect_payload = {"github_url": "https://github.com/fastapi/fastapi"}
        repo_resp = await client.post("/api/v1/repositories/connect", json=connect_payload)
        assert repo_resp.status_code == 200
        repo = repo_resp.json()
        repo_id = repo["id"]

        # 2. List repos
        list_resp = await client.get("/api/v1/repositories")
        assert list_resp.status_code == 200
        assert any(r["id"] == repo_id for r in list_resp.json())

        # 3. Analyze repo
        an_resp = await client.post(f"/api/v1/repositories/{repo_id}/analyze")
        assert an_resp.status_code == 200
        assert "languages" in an_resp.json()

        # 4. List files
        files_resp = await client.get(f"/api/v1/repositories/{repo_id}/files")
        assert files_resp.status_code == 200

        # 5. Repo Q&A Chat
        chat_resp = await client.post(
            f"/api/v1/repositories/{repo_id}/chat",
            json={"message": "Explain how validation works in this project"},
        )
        assert chat_resp.status_code == 200
        assert "answer" in chat_resp.json()

        # 6. List issues
        issues_resp = await client.get(f"/api/v1/repositories/{repo_id}/issues")
        assert issues_resp.status_code == 200
        issues = issues_resp.json()

        if issues:
            issue_id = issues[0]["id"]
            # 7. Generate implementation plan
            plan_resp = await client.post(f"/api/v1/issues/{issue_id}/plan")
            assert plan_resp.status_code == 200
            plan = plan_resp.json()
            plan_id = plan["id"]

            # 8. Generate code changes
            change_resp = await client.post(f"/api/v1/plans/{plan_id}/generate")
            assert change_resp.status_code == 200
            change = change_resp.json()
            change_id = change["id"]

            # 9. Test in sandbox
            test_resp = await client.post(f"/api/v1/changes/{change_id}/test")
            assert test_resp.status_code == 200
            assert test_resp.json()["status"] in ("passed", "failed")

            # 10. AI Code review
            review_resp = await client.post(f"/api/v1/changes/{change_id}/review")
            assert review_resp.status_code == 200
            assert "quality_score" in review_resp.json()

            # 11. Prepare PR (with explicit confirmation)
            pr_resp = await client.post(
                f"/api/v1/changes/{change_id}/pull-request",
                json={"confirm_push": True, "target_branch": "master"},
            )
            assert pr_resp.status_code == 200
            assert pr_resp.json()["is_user_authorized"] is True
