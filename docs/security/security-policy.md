# RepoPilot AI - Security Architecture & Execution Policy

RepoPilot AI interacts with external GitHub repositories, untrusted source files, and arbitrary test scripts. Strict security boundaries are enforced across all layers:

## 1. Untrusted Data Boundary
- All repository files, issue titles, issue comments, and commit messages are classified as untrusted input.
- System prompts are explicitly isolated from repo text to prevent prompt injection and instruction overriding.

## 2. Server-Side Request Forgery (SSRF) Protection
- GitHub repository URLs are strictly validated:
  - Domain must strictly be `github.com`.
  - Localhost, `127.0.0.1`, RFC1918 private IPv4 ranges, and IPv6 loopback addresses are blocked.
  - Path structure is verified against GitHub owner/repo naming regex standards.

## 3. Sandbox Command Policy
When running test suites:
- Command allowlist restricts executable binaries to approved test runners (`pytest`, `python`, `npm`, `npx`, `jest`, `vitest`, `cargo`, `go`).
- Dangerous binaries and shell patterns are banned (`rm -rf`, `curl`, `wget`, `sudo`, `chmod`, `chown`, `kill`, `/etc/`, `/var/run/`, `ssh`, `netcat`).
- Subprocesses run inside temporary directories with stripped environment variables (`CI=true`, `PYTHONDONTWRITEBYTECODE=1`).
- Execution timeouts (default: 45s) kill any hung or infinite loop processes.

## 4. Human-In-The-Loop Confirmation
- RepoPilot will never automatically push commits or open pull requests to GitHub.
- An explicit user confirmation checkbox (`confirm_push`) is mandatory before any branch or PR is created.
