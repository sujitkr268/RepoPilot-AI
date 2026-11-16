# RepoPilot AI - System Architecture

RepoPilot AI is designed as a modular, resilient multi-agent engineering platform.

## Architecture Diagram

```mermaid
flowchart TD
    User["Open Source Contributor / Developer"]

    subgraph Frontend ["Frontend (Next.js 14 App Router)"]
        LP["Landing Page & Hero"]
        DB["Developer Dashboard"]
        WS["Engineering Workspace"]
        MN["Monaco Editor & Diff Inspector"]
        AAC["Agent Activity Center"]
    end

    subgraph Backend ["Backend (FastAPI REST API)"]
        AUTH["Auth & Session Manager"]
        RA_SVC["Repository Analyzer Service"]
        ID_SVC["Issue Discovery & Scoring Service"]
        VS_SVC["Semantic Search & Chunking Service"]
        SB_RUN["Sandbox Runner & Execution Policy"]
    end

    subgraph Agents ["LangGraph Multi-Agent Orchestrator"]
        N1["Repository Analyzer Node"]
        N2["Issue Discovery Node"]
        N3["Implementation Planner Node"]
        N4["Code Generation Node"]
        N5["Automated Testing Node"]
        N6["AI Code Review Node"]
        N7["Pull Request Node"]
    end

    subgraph External ["External Services & Storage"]
        GH["GitHub REST API & OAuth"]
        PG[("PostgreSQL / SQLite Storage")]
        LLM["Configurable LLM Provider\n(OpenAI, Anthropic, Gemini, Ollama, Mock)"]
    end

    User --> Frontend
    Frontend --> Backend
    Backend --> Agents
    Backend --> PG
    Backend --> GH
    Agents --> LLM
    Agents --> SB_RUN
```

## Key Modules

1. **Repository Analyzer**: Analyzes repository trees, dependency manifests (`package.json`, `pyproject.toml`, `Cargo.toml`), entry points, and test runners without requiring a local clone.
2. **Issue Discovery & Suitability**: Fetches real GitHub issues, parses labels, estimates difficulty, identifies required technologies, and suggests concrete contribution approaches.
3. **Implementation Planner**: Maps affected modules, explains root causes, and creates an interactive, editable checklist before code generation.
4. **Code Generation & Monaco Diff**: Synthesizes minimal idiomatic code edits and produces unified diffs inspected side-by-side.
5. **Isolated Testing**: Executes tests within an allowlisted, timed-out, resource-bounded sandbox.
6. **Code Review Agent**: Generates evidence-based audits graded across 5 severity tiers (Critical, High, Medium, Low, Informational).
7. **Human-Authorized PRs**: Gated authorization ensuring zero automated pushes without explicit developer confirmation.
