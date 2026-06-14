# SkillGuard v0.2 Workflow Plan

## Goal

Make SkillGuard feel like a real open-source security tool, not only a local CLI.

## Scope

- SARIF output for GitHub code scanning.
- GitHub Actions workflow that runs tests, typecheck, build, audit, SkillGuard scan, and SARIF upload.
- Demo lab with intentionally unsafe skill fixtures.
- Project configuration through `.skillguardignore` and `.skillguard.json`.
- Custom project rules for team-specific risky tokens or internal policies.

## Design

The scanner remains static and does not execute scanned files. Configuration is read only from the scan root. Ignore patterns use a small built-in glob matcher to avoid adding runtime dependencies.

SARIF is generated from the same `ScanResult` used by text and JSON output. Critical and high findings map to SARIF `error`, medium maps to `warning`, and low maps to `note`.

The workflow uses `github/codeql-action/upload-sarif@v3` after `node dist/cli.js scan . --sarif skillguard.sarif --fail-on HIGH`.

## Verification

- Unit tests for config, ignores, custom rules, SARIF, CLI SARIF output, workflow asset, and demo asset.
- Full `npm test`, `npm run typecheck`, `npm run build`, `npm audit --audit-level=high`.
