# RepoPilot AI - API Reference

Base URL: `/api/v1`

## Authentication
- `GET /auth/me`: Get current authenticated developer profile.
- `POST /auth/demo`: Issue a zero-barrier demo JWT session token.
- `GET /auth/github`: Get GitHub OAuth authorization URL.
- `GET /auth/github/callback`: Exchange GitHub code for session token.
- `POST /auth/logout`: End session and clear cookies.

## Repositories
- `POST /repositories/connect`: Connect and validate a GitHub repository URL.
- `GET /repositories`: List all connected repositories for the authenticated user.
- `GET /repositories/{id}`: Retrieve detailed repository metadata.
- `POST /repositories/{id}/analyze`: Run deep AST and manifest analysis.
- `GET /repositories/{id}/analysis`: Retrieve cached technical architecture report.
- `GET /repositories/{id}/files`: Searchable, paginated file tree explorer.
- `POST /repositories/{id}/chat`: Repository-aware Q&A with cited source files and lines.

## Issues
- `GET /repositories/{id}/issues`: Fetch open GitHub issues with AI difficulty classification.
- `POST /issues/{id}/recommend`: Generate personalized contributor suitability recommendation.

## Implementation Planning
- `POST /issues/{id}/plan`: Generate structured implementation plan and editable checklist.
- `GET /plans/{id}`: Read implementation plan details.
- `PATCH /plans/{id}`: Update checklist items, strategy, or plan status.

## Code Generation
- `POST /plans/{id}/generate`: Generate proposed code modifications and unified git diff.
- `GET /changes/{id}`: Read proposed changes and diffs.
- `POST /changes/{id}/approve`: Explicit human approval gate.

## Automated Testing
- `POST /changes/{id}/test`: Execute tests inside isolated sandbox.
- `GET /test-runs/{id}`: Retrieve test run stdout, stderr, and failure analytics.

## Code Review
- `POST /changes/{id}/review`: Trigger evidence-based AI code review.
- `GET /reviews/{id}`: Read categorized findings with severity grades.

## Pull Requests
- `POST /changes/{id}/pull-request`: Prepare or submit PR (requires `confirm_push: true`).
- `GET /pull-requests/{id}`: Read pull request status.

## Agent Sessions
- `GET /agents/sessions`: List active and completed agent sessions.
- `GET /agents/sessions/{id}`: Read live telemetry events and tool executions.
- `POST /agents/sessions/{id}/cancel`: Safely cancel an active pipeline.
- `POST /agents/sessions/run-workflow`: Execute the end-to-end LangGraph pipeline.
