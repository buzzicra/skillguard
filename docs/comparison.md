# SkillGuard Comparison

SkillGuard does not try to replace code scanners, dependency scanners, or secret scanners. It covers a different layer: agent instruction and MCP configuration that tells coding agents what to trust and what to do.

## Where it fits

| Tool category | Primary layer | What it is good at | Gap SkillGuard covers |
| --- | --- | --- | --- |
| Dependency scanners | Package dependency graph | Known vulnerable packages, license risk, dependency metadata | Agent instruction layer outside dependency manifests |
| Secret scanners | Source text and commit history | Hardcoded token shapes and secret leaks | Secret references passed into MCP servers and agent workflows |
| Code scanners | Application source code | Unsafe app code patterns and policy-as-code checks | Prompt, skill, rule, and MCP config semantics |
| Runtime agent platforms | Live agent execution | Runtime control, logs, approvals, sandboxing | Pre-merge static review before agent config is installed |
| Manual review | Human judgement | Context and intent | Repeatable CI gate for common high-risk patterns |

## What makes SkillGuard different

- No scanned file execution.
- No API token required.
- Fast local CLI for npm, CI, and pre-commit.
- First-class support for `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, Cursor rules, package scripts, and MCP configs.
- Structured MCP checks for unpinned launchers, remote endpoints, secret env exposure, and broad filesystem mounts.
- SARIF output for GitHub code scanning.
- Baseline drift for reviewed agent files.

## When to use alongside other tools

Use SkillGuard before installing or merging agent config. Keep dependency, secret, and code scanners in the same CI pipeline. They catch different failure modes.

Recommended launch CI stack:

```yaml
- run: npm audit --audit-level=high
- run: npx @buzzicra/skillguard scan . --preset strict --sarif skillguard.sarif --fail-on HIGH
```
