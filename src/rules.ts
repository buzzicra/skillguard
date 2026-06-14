import type { FindingCategory, Severity } from './types.js';

export type Rule = {
  id: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  pattern: RegExp;
  recommendation: string;
};

export const rules: readonly Rule[] = [
  {
    id: 'env-exfiltration',
    title: 'Environment variable exfiltration',
    severity: 'critical',
    category: 'secrets',
    pattern:
      /\b(?:curl|wget|fetch|axios|httpie|Invoke-WebRequest)\b[^\n]*(?:https?:\/\/|--url)[^\n]*(?:\$[A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|AUTH)[A-Z0-9_]*|process\.env\.[A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|AUTH)[A-Z0-9_]*)/i,
    recommendation: 'Remove network calls that include environment variables or secret material.',
  },
  {
    id: 'hardcoded-secret',
    title: 'Hardcoded secret-like token',
    severity: 'critical',
    category: 'secrets',
    pattern:
      /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/,
    recommendation: 'Revoke the token, remove it from source, and load secrets from a local secret store.',
  },
  {
    id: 'curl-pipe-shell',
    title: 'Remote script piped into shell',
    severity: 'critical',
    category: 'supply-chain',
    pattern: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba)?sh\b/i,
    recommendation: 'Download, pin, inspect, and checksum remote installers before executing them.',
  },
  {
    id: 'destructive-shell',
    title: 'Destructive shell command',
    severity: 'high',
    category: 'shell',
    pattern: /\brm\s+-[A-Za-z]*r[A-Za-z]*f[A-Za-z]*\s+(?:"?\$HOME|~|\/|"\$HOME\/\.ssh|~\/\.ssh|\$HOME\/\.ssh)\b/i,
    recommendation: 'Remove destructive cleanup instructions or require explicit human approval.',
  },
  {
    id: 'permission-bypass',
    title: 'Permission bypass instruction',
    severity: 'high',
    category: 'permissions',
    pattern: /\b(?:bypassPermissions|danger-full-access|approval[_ -]?policy\s*[:=]\s*never|never ask permission)\b/i,
    recommendation: 'Require explicit approval for filesystem, network, shell, and destructive operations.',
  },
  {
    id: 'prompt-injection',
    title: 'Prompt injection instruction',
    severity: 'high',
    category: 'prompt-injection',
    pattern: /\bignore\s+(?:all\s+)?(?:previous|above|system|developer)\s+instructions\b/i,
    recommendation: 'Treat instruction override text as untrusted content, not executable agent policy.',
  },
  {
    id: 'unsafe-eval',
    title: 'Dynamic code execution',
    severity: 'high',
    category: 'shell',
    pattern: /\b(?:eval|Function)\s*\(/,
    recommendation: 'Avoid dynamic code execution in agent tools and configuration loaders.',
  },
  {
    id: 'broad-filesystem-access',
    title: 'Broad filesystem access',
    severity: 'medium',
    category: 'permissions',
    pattern: /\b(?:read|write|delete|modify)\s+(?:all\s+)?(?:files|filesystem|home directory|entire repo|everything)\b/i,
    recommendation: 'Fence file access to the smallest required project paths.',
  },
  {
    id: 'untrusted-network-call',
    title: 'Untrusted network call',
    severity: 'medium',
    category: 'network',
    pattern: /\b(?:curl|wget|fetch|axios|Invoke-WebRequest)\b[^\n]*(?:https?:\/\/(?!localhost|127\.0\.0\.1))/i,
    recommendation: 'Document why outbound network access is needed and pin trusted endpoints.',
  },
];
