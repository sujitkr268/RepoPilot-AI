import pytest
from app.services.repository_analyzer import RepositoryAnalyzerService
from app.integrations.github import GitHubClient


class DummyGitHubClient(GitHubClient):
    async def get_repository_tree(self, owner: str, repo: str, branch: str = "main"):
        return [
            {"path": "package.json", "type": "blob", "size": 120},
            {"path": "src/index.ts", "type": "blob", "size": 450},
            {"path": "src/components/App.tsx", "type": "blob", "size": 890},
            {"path": "tests/app.test.ts", "type": "blob", "size": 320},
            {"path": "README.md", "type": "blob", "size": 500},
        ]

    async def get_file_content(self, owner: str, repo: str, path: str, ref=None):
        if path == "package.json":
            return '{"dependencies": {"react": "^18.0.0", "next": "^14.0.0"}, "devDependencies": {"vitest": "^1.0.0"}}'
        if path == "README.md":
            return "# Sample App\n\nThis is a Next.js and React application for demonstration."
        return ""


@pytest.mark.asyncio
async def test_repository_analyzer_service():
    client = DummyGitHubClient()
    analyzer = RepositoryAnalyzerService(client)

    result = await analyzer.analyze("test-owner", "test-repo")

    assert "TypeScript" in result["languages"]
    assert "react" in result["frameworks"]
    assert "next.js" in result["frameworks"]
    assert "vitest" in result["test_frameworks"]
    assert "src/index.ts" in result["entry_points"]
    assert "architecture_summary" in result
    assert "setup_instructions" in result
    assert "testing_instructions" in result
