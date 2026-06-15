# SkillGuard v0.5 Launch Hardening

## Goal

Make the launch build easier to understand, easier to adopt in CI, and stronger against the MCP risks developers are actively adding to repos.

## Shipped Surface

- Structured `.mcp.json` analyzer for common high-signal MCP risks.
- `--preset default|oss|strict` to let users choose reviewer noise tolerance.
- Reusable root `action.yml` for `uses: buzzicra/skillguard@v0.5.0`.
- Launch copy drafts for X, Hacker News, and Product Hunt.

## Presets

`default` keeps high-confidence local findings on by default.

`oss` adds remote MCP endpoint detection for shared public repos.

`strict` adds broad filesystem argument checks and raises selected review-only regex rules when a team wants a tight CI gate.

## MCP Risks

- Unpinned `npx`/`pnpm dlx`/`yarn dlx` MCP launchers.
- Secret-like environment variables passed into MCP servers.
- Remote MCP server URLs.
- Broad filesystem arguments such as root or home mounts.
- Shell/network commands used directly as MCP server commands.

## Verification Gate

- Targeted v0.5 tests must pass.
- Full test suite must pass.
- TypeScript strict check must pass.
- Production build must pass.
- `npm publish --dry-run --access public` must include `action.yml` and launch docs.
