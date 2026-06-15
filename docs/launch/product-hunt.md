# Product Hunt Launch Draft

## Tagline

Static security scanning for AI agent instruction files and MCP configs.

## Description

SkillGuard scans `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, Cursor rules, package scripts, and MCP JSON for risky agent behavior before you install or merge it. It finds secret exfiltration, prompt injection, dangerous shell, broad permissions, unpinned MCP launchers, secret env exposure, remote MCP endpoints, and broad filesystem mounts.

## First Comment

AI agent instruction files are becoming supply-chain code. They can grant broad filesystem access, pass secrets into tools, or route coding agents through remote services, but most security checks still focus on dependencies and source code.

SkillGuard is intentionally small:

- local static scanner
- no API token required
- no scanned file execution
- npm-native CLI
- text, JSON, Markdown, and SARIF output
- GitHub Action support
- baseline drift detection

Try:

```bash
npx @buzzicra/skillguard scan . --preset strict
```
