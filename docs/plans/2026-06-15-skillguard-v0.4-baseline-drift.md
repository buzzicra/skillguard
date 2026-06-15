# SkillGuard v0.4 Baseline Drift Plan

## Goal

Turn SkillGuard from a point-in-time scanner into a trust-drift gate. Maintainers can review current agent files once, commit a baseline, and fail future scans when agent trust changes.

## Implemented Scope

### `skillguard baseline`

Writes a lockfile snapshot:

```bash
skillguard baseline . --output skillguard.lock.json
```

The snapshot records:

- discovered agent-surface files
- SHA-256 content hashes
- finding fingerprints
- outbound domains
- secret references

### `scan --baseline`

Compares the current repo against a reviewed baseline:

```bash
skillguard scan . --baseline skillguard.lock.json
```

The scan exits with code `1` when drift exists.

### Drift Signals

SkillGuard reports:

- new files
- removed files
- changed files
- new findings
- resolved findings
- new outbound domains
- removed outbound domains
- new secret references
- removed secret references

## Non-Goals

- No remote registry trust scoring.
- No runtime MCP execution.
- No claim that an unchanged baseline means the repo is safe.
- No automatic baseline update without explicit user command.

## Verification Gates

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=high`
- `npm publish --dry-run --access public`
