# Agent Security Competitor Signals

Date: 2026-06-15

## Snapshot

SkillGuard sits in a real, fast-moving category: AI agent supply-chain security. The strongest projects already scan MCP servers, agent skills, tool descriptions, and IDE configs. The opening for SkillGuard is not "another scanner"; it is a lightweight, npm-native repository gate for agent instruction files that developers can add to CI in under a minute.

## Competitor Matrix

| Project | Signal | Strength | Gap SkillGuard Can Own |
| --- | ---: | --- | --- |
| [snyk/agent-scan](https://github.com/snyk/agent-scan) | 2575 GitHub stars on 2026-06-15 | Auto-discovers installed agent components across agents, MCP servers, and skills. Has issue-code docs and broad ecosystem coverage. | Requires Snyk token and warns that MCP config scanning may execute configured commands. SkillGuard can stay zero-token, repo-local, and non-executing by default. |
| [cisco-ai-defense/skill-scanner](https://github.com/cisco-ai-defense/skill-scanner) | 2188 GitHub stars on 2026-06-15 | Deep skill scanner with static rules, YARA, LLM-as-judge, behavioral dataflow, SARIF, pre-commit, and rich docs. | Heavier Python/cloud/LLM setup. SkillGuard can be the npm-first fast gate for JavaScript/agent repos, then optionally integrate deeper engines later. |
| [highflame-ai/ramparts](https://github.com/highflame-ai/ramparts) | 90 GitHub stars on 2026-06-15 | Strong MCP + skill story, OWASP MCP Top 10 tagging, SARIF, Markdown reports, Rust speed. | Broad scanner surface. SkillGuard can specialize in checked-in repo files and "PR changed an agent instruction" workflows. |
| [antgroup/MCPScan](https://github.com/antgroup/MCPScan) | 223 GitHub stars on 2026-06-15 | Multi-stage MCP scan using Semgrep taint analysis and optional LLM evaluation. Supports local repos and remote GitHub repos. | MCP-code oriented. SkillGuard can focus on agent instruction supply chain, npm install ergonomics, and GitHub Actions setup. |
| Smaller GitHub skill scanners | 0-21 stars in GitHub search on 2026-06-15 | Many narrow clones exist around "SKILL.md scanner" and "MCP security scanner". | Most lack positioning, CI polish, reports, stable package, or credible roadmap. SkillGuard must look like a serious tool immediately. |

## Market Pain Signals

- Agent skill risk is now concrete: Snyk research reported thousands of public skills scanned, hundreds with critical issues, and dynamic remote content execution patterns.
- MCP scanner demand is broad: projects mention tool poisoning, rug pulls, prompt injection, shadowing, unsafe file reads, command injection, and supply-chain CVEs.
- Serious scanners converge on the same output surfaces: terminal, JSON, Markdown, SARIF, CI gates, and pre-commit.
- Top projects add trust via docs: threat taxonomy, issue code reference, scan limitations, architecture docs, and reproducible demos.
- Enterprise-flavored tools are getting heavy: tokens, LLM/cloud analyzers, Python/Rust installs, IDE extensions, and execution-based MCP inspection.

## SkillGuard Positioning

SkillGuard should be:

> npm-native, no-token, non-executing security gate for AI agent instruction files in repositories.

This is narrower than Snyk/Cisco/Ramparts, but sharper for open-source adoption. A developer can paste one command into a repo, get findings, generate a Markdown report, and open a PR with SARIF.

## Differentiation Bets

1. **No Execution Guarantee**
   - Never start MCP servers or run scripts during default scans.
   - Make this explicit in README and SARIF metadata.
   - Add test fixtures proving malicious scripts are inspected as text only.

2. **PR-First Agent Supply-Chain Gate**
   - Add `skillguard init` templates for GitHub Actions and pre-commit.
   - Add changed-file scanning later: only fail when agent-related files changed.
   - Add GitHub annotation-friendly Markdown summary.

3. **Trust Baseline**
   - Add `skillguard baseline > skillguard.lock.json`.
   - Add `skillguard scan --baseline skillguard.lock.json`.
   - Detect newly added risky files, changed agent instructions, new outbound domains, and new tool grants.

4. **Agent Config Inventory**
   - Add `skillguard inventory` to list discovered `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, MCP configs, Cursor rules, and package scripts.
   - Show file type, scope, finding count, highest severity, and whether ignored.

5. **Rule Packs**
   - Ship `strict`, `oss`, and `enterprise` presets.
   - Keep defaults low-noise; strict mode can flag broader trust smells.

6. **Public Benchmark Corpus**
   - Create `examples/corpus/` with benign and malicious fixtures.
   - Publish a detection matrix against Snyk/Cisco/Ramparts concepts without claiming false superiority.

## Near-Term Roadmap

### 0.3.0

- `skillguard inventory`
- `--changed-from <git-ref>` PR-mode scan
- pre-commit template in `skillguard init`
- threat taxonomy doc and rule-code reference

### 0.4.0

- `skillguard baseline` and baseline drift detection
- new-domain and new-secret-reference tracking
- Markdown report diff section

### 0.5.0

- rule presets: `default`, `strict`, `oss`, `enterprise`
- public fixture corpus
- benchmark report page

## Source Links

- Snyk Agent Scan: https://github.com/snyk/agent-scan
- Snyk ToxicSkills research: https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/
- Cisco Skill Scanner: https://github.com/cisco-ai-defense/skill-scanner
- Cisco AI Agent Security Scanner for IDEs: https://blogs.cisco.com/ai/introducing-the-ai-agent-security-scanner-for-ides-verify-your-agents
- Ramparts: https://github.com/highflame-ai/ramparts
- AntGroup MCPScan: https://github.com/antgroup/MCPScan
- Invariant MCP-Scan article: https://invariantlabs.ai/blog/introducing-mcp-scan
- Stytch MCP-Scan deep dive: https://stytch.com/blog/mcp-scan/
