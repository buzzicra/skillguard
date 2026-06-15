# Changelog

## 0.5.1

- Added launch-ready visual assets for README, social previews, and MCP scan screenshots.
- Added `docs/rules.md` with preset coverage, examples, and remediation guidance.
- Added `docs/comparison.md` to explain where SkillGuard fits beside dependency, secret, and code scanners.
- Added `examples/bad-mcp/.mcp.json` for repeatable MCP demo screenshots.

## 0.5.0

- Added structured MCP config analysis for unpinned package launchers, secret env exposure, dangerous commands, remote endpoints, and broad filesystem mounts.
- Added `--preset default|oss|strict` for scan, inventory, and baseline workflows.
- Added reusable `action.yml` so repos can run `uses: buzzicra/skillguard@v0.5.0`.
- Added launch-day copy assets for X, Hacker News, and Product Hunt.

## 0.4.0

- Added `skillguard baseline` for lockfile snapshots.
- Added `scan --baseline <file>` drift detection.
- Added domain, secret-reference, file-change, and finding drift reports.
- Added baseline drift output to text, JSON, and Markdown scan reports.
- Hardened hardcoded-token evidence redaction before reports and baselines store findings.

## 0.3.0

- Added `skillguard inventory` with text and JSON output.
- Added `--changed-from <git-ref>` for PR-focused scans.
- Added optional pre-commit hook generation through `skillguard init --pre-commit`.
- Added a threat taxonomy and competitor-signal roadmap docs.

## 0.2.0

- Added `skillguard init` for one-command project setup.
- Added `--markdown <file>` reports for shareable security reviews.
- Added npm-bin-safe init workflow template using `npx @buzzicra/skillguard`.
- Added regression coverage for init scaffolding and Markdown reports.

## 0.1.3

- Fixed npm `.bin` symlink execution.
- Ensured published CLI bin is executable.
- Published working npm package as `@buzzicra/skillguard`.
