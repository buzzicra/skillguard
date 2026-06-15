import { formatBaselineComparison } from './baseline.js';
import { severityRank } from './risk.js';
import type { BaselineComparison, Finding, ScanResult, Severity } from './types.js';

const severityLabels: Array<{ key: Severity; label: string }> = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

const sortFindings = (findings: readonly Finding[]): Finding[] =>
  [...findings].sort((left, right) => {
    const severityDelta = severityRank[right.severity] - severityRank[left.severity];

    if (severityDelta !== 0) {
      return severityDelta;
    }

    const pathDelta = left.filePath.localeCompare(right.filePath);
    return pathDelta !== 0 ? pathDelta : left.line - right.line;
  });

const escapeTableCell = (value: string): string => value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

const renderSeverityTable = (result: ScanResult): string[] => [
  '| Severity | Findings |',
  '| --- | ---: |',
  ...severityLabels.map(({ key, label }) => `| ${label} | ${result.summary.findingsBySeverity[key] ?? 0} |`),
];

const renderFindings = (result: ScanResult): string[] => {
  if (result.findings.length === 0) {
    return ['## Findings', '', 'No risky patterns found.'];
  }

  return [
    '## Findings',
    '',
    '| Severity | Rule | Location | Evidence | Recommendation |',
    '| --- | --- | --- | --- | --- |',
    ...sortFindings(result.findings).map((finding) =>
      [
        finding.severity.toUpperCase(),
        escapeTableCell(finding.title),
        `${escapeTableCell(finding.filePath)}:${finding.line}`,
        `\`${escapeTableCell(finding.evidence)}\``,
        escapeTableCell(finding.recommendation),
      ].join(' | '),
    ).map((row) => `| ${row} |`),
  ];
};

const renderBaselineComparison = (comparison: BaselineComparison | undefined): string[] => {
  if (comparison === undefined) {
    return [];
  }

  return ['## Baseline Drift', '', '```text', formatBaselineComparison(comparison), '```', ''];
};

export const formatMarkdownReport = (result: ScanResult, comparison?: BaselineComparison): string =>
  [
    '# SkillGuard Security Report',
    '',
    `**Risk:** ${result.risk.score}/100 ${result.risk.level}`,
    `**Scanned:** ${result.summary.filesScanned} files (${result.summary.filesSkipped} skipped)`,
    `**Root:** \`${result.root}\``,
    '',
    '## Severity Summary',
    '',
    ...renderSeverityTable(result),
    '',
    ...renderFindings(result),
    '',
    ...renderBaselineComparison(comparison),
    '## Recommended Next Steps',
    '',
    '- Fix critical and high findings before installing or sharing agent configs.',
    '- Review medium findings for expected network access and file-system scope.',
    '- Commit `.skillguard.json` allow rules only for reviewed, intentional behavior.',
    '- Run SkillGuard in CI with `--fail-on HIGH` to block risky changes.',
  ].join('\n');
