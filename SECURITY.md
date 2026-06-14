# Security Policy

## Supported Versions

Security fixes target the latest published version.

## Reporting A Vulnerability

Please open a private advisory or email the maintainer listed on the GitHub profile. Include:

- affected version or commit
- reproduction steps
- sample file that triggers the issue
- expected vs actual behavior
- whether secrets or remote code execution are involved

Do not include real API keys, tokens, or customer data in reports.

## Scope

In scope:

- false negatives for secret exfiltration, unsafe shell, permission bypass, and MCP/skill risk patterns
- crashes on valid text input
- dependency vulnerabilities
- output that exposes more secret material than needed

Out of scope:

- attacks requiring modified local source after install
- social engineering against maintainers
- issues in third-party agent runtimes
