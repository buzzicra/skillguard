# SkillGuard v0.3 Differentiation Plan

## Goal

Move SkillGuard from "useful scanner" to "star-worthy agent supply-chain gate" by adding features that competitors signal as valuable, while keeping SkillGuard npm-native, non-executing, and easy to adopt.

## Product Thesis

Large competitors are broad and powerful. SkillGuard wins by being smaller and sharper:

- one npm command
- no token
- no MCP server execution
- repo-local scan
- CI/SARIF/Markdown ready
- clear trust drift over time

## Scope

### 1. `skillguard inventory`

Status: implemented in v0.3.0.

List discovered agent-related files before scanning:

```text
Type        Path                         Findings  Highest
AGENTS      AGENTS.md                    0         LOW
Skill       skills/deploy/SKILL.md       2         HIGH
MCP config  .cursor/mcp.json             1         MEDIUM
Package     package.json                 0         LOW
```

Output modes:

- text table
- `--json`

Why:

- Snyk highlights inventory as a core value.
- SkillGuard can provide repo inventory without tokens or executing MCP commands.

### 2. `--changed-from <git-ref>`

Status: implemented in v0.3.0 for `scan` and `inventory`.

Scan only files changed since a git ref, but only when they are in agent-surface scope.

Example:

```bash
skillguard scan . --changed-from origin/main --fail-on HIGH
```

Why:

- PR reviewers care about new risk, not old tolerated risk.
- This makes SkillGuard useful in mature repos where legacy warnings exist.

### 3. Pre-commit Template

Status: implemented in v0.3.0 with pre-commit framework output by default and Husky output when a Husky stack is detected.

Extend `skillguard init`:

```bash
skillguard init --pre-commit
```

Writes:

- `.pre-commit-config.yaml` or `.husky/pre-commit` depending on detected repo stack

Why:

- Cisco ships pre-commit integration.
- Lightweight hooks make adoption concrete for OSS.

### 4. Threat Taxonomy Docs

Status: implemented in v0.3.0 as `docs/threats.md`.

Add `docs/threats.md` with rule codes, examples, and remediation.

Why:

- Snyk and Cisco both use threat docs to look credible.
- This gives contributors a clear map for new rules.

## Acceptance Criteria

- `npm test` includes inventory, changed-file mode, init hook generation, and threat docs asset checks.
- `npm run typecheck` clean.
- `npm run build` clean.
- `npm audit --audit-level=high` clean.
- `npm publish --dry-run --access public` shows expected tarball.
- README first screen shows `scan`, `init`, `inventory`, and Markdown/SARIF outputs.

## Non-Goals

- No LLM judge in v0.3.
- No MCP server execution in default scans.
- No cloud API dependency.
- No claim that no findings means safe.
