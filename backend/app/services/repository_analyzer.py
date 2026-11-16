import json
import os
import re
from typing import Dict, Any, List, Optional, Set, Tuple
from app.integrations.github import GitHubClient


class RepositoryAnalyzerService:
    """
    Analyzes repository metadata, tree, dependency manifests, and source files
    to generate a comprehensive technical profile:
    - Languages & frameworks
    - Dependencies
    - Entry points & test frameworks
    - Architecture summary & setup/test guidance
    """

    KNOWN_MANIFESTS = {
        "package.json": "javascript/typescript",
        "requirements.txt": "python",
        "pyproject.toml": "python",
        "Pipfile": "python",
        "Cargo.toml": "rust",
        "go.mod": "go",
        "pom.xml": "java",
        "build.gradle": "java/kotlin",
        "composer.json": "php",
        "Gemfile": "ruby",
    }

    ENTRYPOINT_CANDIDATES = [
        "main.py",
        "app.py",
        "server.py",
        "wsgi.py",
        "asgi.py",
        "src/main.py",
        "src/app.py",
        "index.js",
        "index.ts",
        "src/index.ts",
        "src/main.ts",
        "src/App.tsx",
        "app/page.tsx",
        "pages/index.tsx",
        "src/main.rs",
        "cmd/main.go",
        "main.go",
    ]

    FRAMEWORK_SIGNATURES = {
        # Python
        "fastapi": ["fastapi"],
        "flask": ["flask"],
        "django": ["django"],
        "tornado": ["tornado"],
        "celery": ["celery"],
        "langchain": ["langchain"],
        "langgraph": ["langgraph"],
        # JavaScript / TypeScript
        "next.js": ["next", "next/router", "next/navigation"],
        "react": ["react", "react-dom"],
        "vue": ["vue"],
        "express": ["express"],
        "nest.js": ["@nestjs/core"],
        "svelte": ["svelte"],
        "tailwind css": ["tailwindcss"],
        # Rust
        "actix-web": ["actix-web"],
        "axum": ["axum"],
        "tokio": ["tokio"],
        # Go
        "gin": ["github.com/gin-gonic/gin"],
        "fiber": ["github.com/gofiber/fiber"],
    }

    TEST_FRAMEWORK_SIGNATURES = {
        "pytest": ["pytest", "conftest.py"],
        "unittest": ["unittest"],
        "jest": ["jest", "jest.config.js", "jest.config.ts"],
        "vitest": ["vitest", "vitest.config.ts"],
        "mocha": ["mocha"],
        "cargo test": ["tests/"],
        "go test": ["_test.go"],
    }

    def __init__(self, github_client: GitHubClient):
        self.client = github_client

    async def analyze(self, owner: str, repo: str, default_branch: str = "main") -> Dict[str, Any]:
        # 1. Fetch tree
        tree = await self.client.get_repository_tree(owner, repo, branch=default_branch)
        paths = [item.get("path", "") for item in tree if item.get("type") == "blob"]

        # 2. Detect languages from extensions
        languages = self._detect_languages(paths)

        # 3. Detect manifests & read contents
        manifest_files = [p for p in paths if os.path.basename(p) in self.KNOWN_MANIFESTS]
        dependencies: Dict[str, Any] = {}
        manifest_texts: Dict[str, str] = {}

        for m_path in manifest_files[:5]:  # read top 5 manifests
            content = await self.client.get_file_content(owner, repo, m_path, ref=default_branch)
            if content:
                manifest_texts[m_path] = content
                parsed_deps = self._parse_manifest_dependencies(m_path, content)
                if parsed_deps:
                    dependencies[m_path] = parsed_deps

        # 4. Detect frameworks
        frameworks = self._detect_frameworks(paths, manifest_texts)

        # 5. Detect entry points
        entry_points = [p for p in paths if p in self.ENTRYPOINT_CANDIDATES or any(p.endswith(f"/{ep}") for ep in self.ENTRYPOINT_CANDIDATES)]

        # 6. Detect test frameworks
        test_frameworks = self._detect_test_frameworks(paths, manifest_texts)

        # 7. Identify key directories
        key_directories = self._extract_key_directories(paths)

        # 8. Read README for architectural context
        readme_content = None
        for p in paths:
            if p.lower() in ("readme.md", "readme.rst", "readme"):
                readme_content = await self.client.get_file_content(owner, repo, p, ref=default_branch)
                break

        # 9. Synthesize architectural summary, setup instructions, and testing instructions
        primary_lang = max(languages.items(), key=lambda x: x[1])[0] if languages else "General"
        architecture_summary = self._generate_architecture_summary(
            owner, repo, primary_lang, frameworks, key_directories, entry_points, readme_content
        )
        setup_instructions = self._generate_setup_instructions(primary_lang, frameworks, manifest_files)
        testing_instructions = self._generate_testing_instructions(primary_lang, test_frameworks)
        potential_concerns = self._evaluate_concerns(paths, test_frameworks, manifest_files)

        return {
            "languages": languages,
            "frameworks": frameworks,
            "architecture_summary": architecture_summary,
            "setup_instructions": setup_instructions,
            "testing_instructions": testing_instructions,
            "entry_points": entry_points,
            "test_frameworks": test_frameworks,
            "potential_concerns": potential_concerns,
            "dependencies": dependencies,
            "key_directories": key_directories,
            "total_files": len(paths),
            "manifest_files": manifest_files,
        }

    def _detect_languages(self, paths: List[str]) -> Dict[str, int]:
        ext_map = {
            ".py": "Python",
            ".ts": "TypeScript",
            ".tsx": "TypeScript",
            ".js": "JavaScript",
            ".jsx": "JavaScript",
            ".rs": "Rust",
            ".go": "Go",
            ".java": "Java",
            ".cpp": "C++",
            ".c": "C",
            ".rb": "Ruby",
            ".php": "PHP",
            ".cs": "C#",
            ".swift": "Swift",
            ".kt": "Kotlin",
            ".html": "HTML",
            ".css": "CSS",
            ".sql": "SQL",
            ".sh": "Shell",
        }
        counts: Dict[str, int] = {}
        for path in paths:
            _, ext = os.path.splitext(path.lower())
            lang = ext_map.get(ext)
            if lang:
                counts[lang] = counts.get(lang, 0) + 1
        return counts

    def _parse_manifest_dependencies(self, path: str, content: str) -> List[str]:
        deps: List[str] = []
        filename = os.path.basename(path)
        if filename == "package.json":
            try:
                data = json.loads(content)
                deps.extend(list(data.get("dependencies", {}).keys()))
                deps.extend(list(data.get("devDependencies", {}).keys()))
            except Exception:
                pass
        elif filename in ("requirements.txt", "Pipfile"):
            for line in content.splitlines():
                line = line.strip()
                if line and not line.startswith("#"):
                    pkg = re.split(r"[=><~]", line)[0].strip()
                    if pkg:
                        deps.append(pkg)
        elif filename == "Cargo.toml":
            in_deps = False
            for line in content.splitlines():
                if "[" in line and "dependencies" in line:
                    in_deps = True
                    continue
                if in_deps and line.startswith("["):
                    in_deps = False
                if in_deps and "=" in line:
                    pkg = line.split("=")[0].strip()
                    if pkg:
                        deps.append(pkg)
        return deps[:50]  # cap manifest list to 50 items

    def _detect_frameworks(self, paths: List[str], manifest_texts: Dict[str, str]) -> List[str]:
        detected: Set[str] = set()
        all_text = " ".join(manifest_texts.values()).lower()
        all_paths = " ".join(paths).lower()

        for framework, signatures in self.FRAMEWORK_SIGNATURES.items():
            for sig in signatures:
                if sig.lower() in all_text or sig.lower() in all_paths:
                    detected.add(framework)
                    break

        return sorted(list(detected))

    def _detect_test_frameworks(self, paths: List[str], manifest_texts: Dict[str, str]) -> List[str]:
        detected: Set[str] = set()
        all_text = " ".join(manifest_texts.values()).lower()
        all_paths = " ".join(paths).lower()

        for framework, sigs in self.TEST_FRAMEWORK_SIGNATURES.items():
            for sig in sigs:
                if sig.lower() in all_text or sig.lower() in all_paths:
                    detected.add(framework)
                    break

        return sorted(list(detected))

    def _extract_key_directories(self, paths: List[str]) -> List[str]:
        dirs: Set[str] = set()
        for p in paths:
            parts = p.split("/")
            if len(parts) > 1:
                dirs.add(parts[0])
        # Return top notable directories
        standard_dirs = {"src", "app", "lib", "components", "pages", "tests", "test", "docs", "core", "api", "pkg", "cmd"}
        return sorted(list(dirs.intersection(standard_dirs) or list(dirs)[:8]))

    def _generate_architecture_summary(
        self,
        owner: str,
        repo: str,
        primary_lang: str,
        frameworks: List[str],
        key_directories: List[str],
        entry_points: List[str],
        readme_content: Optional[str],
    ) -> str:
        fw_str = ", ".join([f.title() for f in frameworks]) if frameworks else "Standard modular libraries"
        dirs_str = ", ".join(key_directories) if key_directories else "root directory structure"
        entries_str = ", ".join(entry_points[:4]) if entry_points else "standard library exports"

        summary = (
            f"**{owner}/{repo}** is primarily built using **{primary_lang}** leveraging **{fw_str}**.\n\n"
            f"- **Directory Organization**: Codebase core is partitioned across `{dirs_str}`.\n"
            f"- **Primary Entrypoints**: Initial execution flow starts at `{entries_str}`.\n"
            f"- **System Style**: Follows modern idiomatic {primary_lang} conventions with decoupled modules."
        )

        if readme_content:
            # Extract first 2 paragraphs from readme for additional context
            paragraphs = [p.strip() for p in readme_content.split("\n\n") if p.strip() and not p.strip().startswith("#")]
            if paragraphs:
                summary += f"\n\n**Overview from README**:\n> {paragraphs[0][:300]}..."

        return summary

    def _generate_setup_instructions(self, primary_lang: str, frameworks: List[str], manifests: List[str]) -> str:
        if primary_lang == "Python":
            if "pyproject.toml" in [os.path.basename(m) for m in manifests]:
                return "1. `python3 -m venv .venv`\n2. `source .venv/bin/activate`\n3. `pip install -e .`"
            return "1. `python3 -m venv .venv`\n2. `source .venv/bin/activate`\n3. `pip install -r requirements.txt`"
        elif primary_lang in ("JavaScript", "TypeScript"):
            return "1. `npm install` (or `pnpm install` / `yarn`)\n2. `npm run dev` or `npm run build`"
        elif primary_lang == "Rust":
            return "1. `cargo build`\n2. `cargo run`"
        elif primary_lang == "Go":
            return "1. `go mod download`\n2. `go build ./...`"
        return "1. Clone repository\n2. Install detected language runtime\n3. Follow project README for build instructions"

    def _generate_testing_instructions(self, primary_lang: str, test_frameworks: List[str]) -> str:
        if "pytest" in test_frameworks:
            return "Run test suite: `pytest` or `pytest tests/`"
        elif "jest" in test_frameworks:
            return "Run test suite: `npm test` or `npx jest`"
        elif "vitest" in test_frameworks:
            return "Run test suite: `npx vitest run`"
        elif "cargo test" in test_frameworks or primary_lang == "Rust":
            return "Run test suite: `cargo test`"
        elif "go test" in test_frameworks or primary_lang == "Go":
            return "Run test suite: `go test -v ./...`"
        return "Check test directory and run the project's standard test command."

    def _evaluate_concerns(
        self, paths: List[str], test_frameworks: List[str], manifests: List[str]
    ) -> List[str]:
        concerns = []
        if not test_frameworks:
            concerns.append("No automated test framework detected in repository manifests or test directories.")
        if not any("readme" in p.lower() for p in paths):
            concerns.append("Missing README file; setup and architectural guidelines may be undocumented.")
        if not manifests:
            concerns.append("No standard dependency manifest file located in repository root.")
        return concerns
