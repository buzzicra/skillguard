# Hacker News Launch Draft

Title:

```text
Show HN: SkillGuard - static scanner for AI agent instruction files and MCP configs
```

Post:

```text
Hi HN,

I built SkillGuard, a small open-source CLI that scans AI agent instruction files and MCP configs for risky behavior before you install or merge them.

The premise is simple: AGENTS.md, CLAUDE.md, SKILL.md, Cursor rules, package scripts, and MCP JSON are becoming supply-chain code. They can ask a coding agent to read secrets, call remote URLs, bypass approvals, or run shell commands, but normal dependency scanners usually do not inspect that layer.

Example:

npx @buzzicra/skillguard scan . --preset strict

It currently detects secret exfiltration, hardcoded tokens, curl-pipe-shell installers, destructive shell, permission bypasses, prompt injection text, unsafe eval, broad filesystem access, untrusted network calls, and structured MCP risks such as unpinned npx launchers, secret env exposure, remote MCP endpoints, and broad filesystem mounts.

It is intentionally static and local: no scanned files are executed, and the scanner itself does not need an API token. It emits text, JSON, Markdown, and SARIF, can upload to GitHub code scanning, and supports baseline drift detection for repos that already have reviewed agent files.

Repo:
https://github.com/buzzicra/skillguard

I would appreciate feedback on rule quality, false-positive handling, and agent/MCP attack paths I should add next.
```
