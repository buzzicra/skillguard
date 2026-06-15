# X Launch Thread

AI agent instruction files are supply-chain code.

`AGENTS.md`, `CLAUDE.md`, `SKILL.md`, Cursor rules, package scripts, and MCP configs can tell coding agents to read secrets, call remote URLs, bypass approvals, or run unsafe shell.

SkillGuard is a tiny npm-native scanner for that surface:

```bash
npx @buzzicra/skillguard scan . --preset strict
```

What it does today:

- scans agent instruction files without executing them
- detects secret exfiltration, prompt injection, dangerous shell, and broad permissions
- parses MCP JSON for unpinned package launchers, secret env exposure, remote endpoints, and broad filesystem mounts
- emits text, JSON, Markdown, and SARIF
- supports baselines, PR-only scans, and GitHub code scanning

Why I built it:

We are installing more agent instructions than we review. Existing dependency scanners miss this layer because the risk sits in prompts, rules, skills, and MCP config. SkillGuard treats those files like code.

Try it:

```bash
npx @buzzicra/skillguard init --pre-commit
npx @buzzicra/skillguard scan . --preset strict --fail-on HIGH
```

GitHub: https://github.com/buzzicra/skillguard
