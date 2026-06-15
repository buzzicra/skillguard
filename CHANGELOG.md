# Changelog

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
