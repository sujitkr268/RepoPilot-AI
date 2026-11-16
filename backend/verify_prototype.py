import asyncio
import os
import sys

# Ensure backend is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.session import init_db


async def main():
    print("=" * 60)
    print("VERIFYING REPOPILOT AI PROTOTYPE END-TO-END")
    print("=" * 60)

    # 1. Initialize DB
    await init_db()
    print("[✓] Database initialized")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 2. Health check
        res = await client.get("/healthz")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print(f"[✓] Health check OK: {res.json()}")

        # 3. Auth Demo
        res = await client.post("/api/v1/auth/demo")
        assert res.status_code == 200, f"Auth demo failed: {res.text}"
        token_data = res.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"[✓] Auth Demo OK: user={token_data['user']['username']}")

        # 4. Connect Repository
        connect_res = await client.post(
            "/api/v1/repositories/connect",
            json={"github_url": "https://github.com/fastapi/fastapi"},
            headers=headers,
        )
        assert connect_res.status_code == 200, f"Connect failed: {connect_res.text}"
        repo = connect_res.json()
        repo_id = repo["id"]
        print(f"[✓] Connect Repo OK: {repo['owner']}/{repo['name']} (stars: {repo['stars_count']})")

        # 5. Analyze Repository
        print("[i] Analyzing repository structure and manifests...")
        an_res = await client.post(f"/api/v1/repositories/{repo_id}/analyze", headers=headers)
        assert an_res.status_code == 200, f"Analyze failed: {an_res.text}"
        an = an_res.json()
        print(f"[✓] Repository Analysis OK: frameworks={an['frameworks']}, entrypoints={len(an['entry_points'])}")

        # 6. Repository Q&A Chat
        chat_res = await client.post(
            f"/api/v1/repositories/{repo_id}/chat",
            json={"message": "How is validation configured in this repository?"},
            headers=headers,
        )
        assert chat_res.status_code == 200, f"Chat failed: {chat_res.text}"
        chat_data = chat_res.json()
        print(f"[✓] Codebase Q&A OK: {chat_data['answer'][:80]}...")

        # 7. Issue Discovery & Recommendation
        print("[i] Discovering live issues from GitHub...")
        issues_res = await client.get(f"/api/v1/repositories/{repo_id}/issues", headers=headers)
        assert issues_res.status_code == 200, f"Issues failed: {issues_res.text}"
        issues = issues_res.json()
        assert len(issues) > 0, "No issues discovered"
        first_issue = issues[0]
        print(f"[✓] Issue Discovery OK: #{first_issue['github_issue_number']} '{first_issue['title'][:40]}' (class: {first_issue['classification']})")

        # 8. Implementation Planning
        print(f"[i] Implementation Planning Agent drafting plan for issue #{first_issue['github_issue_number']}...")
        plan_res = await client.post(f"/api/v1/issues/{first_issue['id']}/plan", headers=headers)
        assert plan_res.status_code == 200, f"Plan failed: {plan_res.text}"
        plan = plan_res.json()
        print(f"[✓] Implementation Plan OK: '{plan['title']}' ({len(plan['checklist'])} tasks)")

        # 9. Code Generation
        print("[i] Code Generation Agent synthesizing minimal diff...")
        change_res = await client.post(f"/api/v1/plans/{plan['id']}/generate", headers=headers)
        assert change_res.status_code == 200, f"Codegen failed: {change_res.text}"
        change = change_res.json()
        print(f"[✓] Code Generation OK: {change['title']} ({len(change['files_changed'])} file(s) changed)")

        # 10. Automated Sandbox Testing
        print("[i] Automated Testing Agent executing test suite in isolated sandbox...")
        test_res = await client.post(f"/api/v1/changes/{change['id']}/test", headers=headers)
        assert test_res.status_code == 200, f"Testing failed: {test_res.text}"
        test_run = test_res.json()
        print(f"[✓] Sandbox Testing OK: status={test_run['status']} (duration: {test_run['duration_seconds']}s, passed: {test_run['passed_tests']})")

        # 11. AI Code Review
        print("[i] AI Code Review Agent performing evidence-based quality audit...")
        review_res = await client.post(f"/api/v1/changes/{change['id']}/review", headers=headers)
        assert review_res.status_code == 200, f"Review failed: {review_res.text}"
        review = review_res.json()
        print(f"[✓] Code Review OK: quality_score={review['quality_score']}/100, critical={review['critical_count']}")

        # 12. Pull Request Preparation (with mandatory user authorization)
        print("[i] Pull Request Agent assembling branch and PR summary...")
        pr_res = await client.post(
            f"/api/v1/changes/{change['id']}/pull-request",
            json={"confirm_push": True, "target_branch": repo["default_branch"]},
            headers=headers,
        )
        assert pr_res.status_code == 200, f"PR failed: {pr_res.text}"
        pr = pr_res.json()
        print(f"[✓] Pull Request Prep OK: title='{pr['title']}', source_branch='{pr['source_branch']}'")

        # 13. Autonomous LangGraph Multi-Agent Pipeline
        print("[i] Executing full autonomous LangGraph agent state machine...")
        workflow_res = await client.post(
            f"/api/v1/agents/sessions/run-workflow?repository_id={repo_id}&issue_title=Verify+prototype+pipeline",
            headers=headers,
        )
        assert workflow_res.status_code == 200, f"Workflow failed: {workflow_res.text}"
        session = workflow_res.json()
        print(f"[✓] LangGraph Workflow OK: session_status={session['status']}, events_recorded={len(session['events'])}")

    print("=" * 60)
    print("ALL 13 PROTOTYPE WORKFLOW STAGES VERIFIED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
