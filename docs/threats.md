# SkillGuard Threat Taxonomy

SkillGuard treats agent instruction files as supply-chain code. These files can steer AI coding agents, grant tool access, route secrets to remote services, or ask users to weaken security controls.

SkillGuard is a static, non-executing scanner. It reads files as text and never starts MCP servers, runs scripts, installs packages, or calls remote analyzers during a scan.

## Rule Reference

| Rule ID | Severity | Category | Detects | Fix |
| --- | --- | --- | --- | --- |
| `env-exfiltration` | Critical | Secrets | Network calls that include environment variables or secret-like names. | Remove the outbound secret flow and move credentials into a local secret store. |
| `hardcoded-secret` | Critical | Secrets | Token shapes for OpenAI, GitHub, Google, Slack, and similar credentials. | Revoke the token, remove it from source, and rotate affected credentials. |
| `curl-pipe-shell` | Critical | Supply chain | Remote installers piped directly into `sh` or `bash`. | Download, pin, inspect, and checksum installers before execution. |
| `destructive-shell` | High | Shell | Destructive recursive deletes against home, root, or SSH paths. | Remove destructive commands or require explicit human approval. |
| `permission-bypass` | High | Permissions | Instructions that disable approval, use broad filesystem access, or skip permission prompts. | Keep approval gates for filesystem, network, shell, and destructive operations. |
| `prompt-injection` | High | Prompt injection | Instructions that tell the agent to ignore previous, system, or developer instructions. | Treat the text as untrusted content and remove override instructions. |
| `unsafe-eval` | High | Shell | Dynamic code execution through `eval(...)` or `Function(...)`. | Replace dynamic execution with explicit, reviewed code paths. |
| `broad-filesystem-access` | Medium | Permissions | Requests to read, write, delete, or modify all files or the whole repo. | Fence file access to the smallest required project paths. |
| `untrusted-network-call` | Medium | Network | Outbound HTTP calls to non-localhost URLs. | Document required endpoints, pin trusted domains, and review data flow. |

## Threat Families

### Secret Exfiltration

Agent files can ask an AI agent to read environment variables, local credential stores, or config files and send them to a remote host. These findings are critical because the agent may already have access to developer credentials.

### Tool And Script Supply Chain

Remote installers, dynamic downloads, and implicit setup commands can turn a Markdown skill into executable supply-chain risk. SkillGuard flags high-risk setup patterns without executing them.

### Permission Downgrade

Agent configs sometimes ask the runtime to skip approvals or use broad filesystem access. That weakens the security model around the agent and should be reviewed like a privileged code change.

### Prompt Injection

Instruction files can embed text that attempts to override higher-priority policy. SkillGuard flags common override patterns so maintainers can remove them before sharing a skill or merging a PR.

## Review Workflow

1. Run `skillguard inventory .` to see the agent surface in the repo.
2. Run `skillguard scan . --fail-on HIGH` before merging.
3. Use `skillguard scan . --changed-from origin/main --fail-on HIGH` in PR checks to focus on new agent-surface risk.
4. Commit `skillguard.lock.json` from `skillguard baseline . --output skillguard.lock.json` after reviewing known agent files.
5. Use `skillguard scan . --baseline skillguard.lock.json` to catch trust drift.
6. Commit allow rules only when the behavior is intentional, reviewed, and scoped to a specific rule/path/evidence fragment.
7. Keep secret scanning, dependency auditing, sandboxing, and human review in place. SkillGuard is one static guardrail, not a full security program.
