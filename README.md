# RepoPilot AI 🚀
### Autonomous AI-Powered Open-Source Engineering Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg)](https://nextjs.org)
[![LangGraph](https://img.shields.io/badge/Orchestrator-LangGraph-FF6F00.svg)](https://langchain-ai.github.io/langgraph/)
[![Python](https://img.shields.io/badge/Python-3.11%2B%20%2F%203.14-blue.svg)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6.svg)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**RepoPilot AI** is an autonomous engineering assistant that takes software engineers from discovering an unfamiliar GitHub repository to a tested, reviewed, and human-approved pull request.

---

## 🌟 Key Features

1. **Repository Analyzer**: Connect any public or authenticated GitHub repository. Extracts the directory tree, analyzes manifests (`pyproject.toml`, `package.json`, `Cargo.toml`), detects frameworks, identifies entry points, and synthesizes technical architecture.
2. **AI Codebase Q&A**: Repository-aware assistant grounded in real source files with concrete file path and line range citations.
3. **Issue Discovery & Classification**: Real GitHub open issues classified into *Good First Issue*, *Bug*, *Feature Request*, *Documentation*, and *Security*, with difficulty ratings and developer suitability notes.
4. **Implementation Planning Agent**: Generates structured problem explanations, root causes, strategies, and interactive **editable checklists** before writing code.
5. **Code Generation & Monaco Diff**: Minimal, idiomatic code modifications previewed side-by-side with Monaco Editor.
6. **Isolated Sandbox Testing**: Safe test runner with command allowlists, timeout controls, and isolated temporary environments.
7. **AI Code Review Agent**: Audits generated diffs for logic, security vulnerabilities, and code quality across 5 severity tiers (Critical to Info).
8. **Human-Authorized Pull Requests**: Explicit confirmation gating ensuring no code or branches are pushed without developer approval.
9. **Agent Activity Center**: Live telemetry stream capturing agent state transitions, tool calls, execution duration, and checkpoints.

---

## 📐 Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Monaco Editor, Lucide React.
- **Backend**: FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), aiosqlite / asyncpg, PostgreSQL with pgvector.
- **Agent Orchestration**: LangGraph StateGraph, Configurable LLM Provider (OpenAI, Anthropic, Gemini, Groq, Ollama, and deterministic Mock).
- **Security & Sandboxing**: Process isolation, strict command allowlisting, SSRF protection, prompt sanitization.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to backend and create virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000` with Swagger documentation at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
# Navigate to frontend in a new terminal
cd frontend

# Install dependencies
npm install

# Run the Next.js development server
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Running Automated Tests

RepoPilot includes automated test suites covering security validation, AST parsing, issue classification, sandbox execution, LangGraph workflows, and REST APIs:

```bash
# Run full pytest suite from the project root
PYTHONPATH=backend backend/.venv/bin/pytest backend/app/tests/ -v
```

All 13 test suites execute and pass:
- `test_security.py`: URL validation, SSRF prevention, JWT token cycles, prompt sanitization.
- `test_analyzer.py`: Manifest parsing, framework detection, architecture synthesis.
- `test_issues.py`: Issue triage, difficulty heuristic, skill matching.
- `test_sandbox.py`: Security policy validation, isolated subprocess test runner.
- `test_agent_workflow.py`: End-to-end LangGraph state machine execution.
- `test_api.py`: FastAPI health, auth, repository, planning, testing, and PR endpoints.

---

## 🐳 Docker Deployment

To launch the full stack with PostgreSQL & pgvector using Docker Compose:

```bash
docker-compose up --build
```

Services:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **PostgreSQL + pgvector**: `localhost:5432`

---

## 🔒 Security Policy

- **No Host Execution**: Tests run in an isolated sandbox with memory quotas and timeouts.
- **SSRF Protection**: GitHub URLs are strictly validated to prevent intranet probing.
- **No Automatic Merges/Pushes**: All branch creation and pull requests require explicit human confirmation.

---

## 📜 License
MIT License. Built for the global open-source developer community.
