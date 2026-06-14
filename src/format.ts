import { severityRank } from './risk.js';
import type { Finding, ScanResult } from './types.js';

const sortFindings = (findings: readonly Finding[]): Finding[] =>
  [...findings].sort((left, right) => {
    const severityDelta = severityRank[right.severity] - severityRank[left.severity];

    if (severityDelta !== 0) {
      return severityDelta;
    }

    const pathDelta = left.filePath.localeCompare(right.filePath);
    return pathDelta !== 0 ? pathDelta : left.line - right.line;
  });

export const formatTextReport = (result: ScanResult): string => {
  const lines = [
    `Risk: ${result.risk.score}/100 ${result.risk.level}`,
    `Scanned: ${result.summary.filesScanned} files (${result.summary.filesSkipped} skipped)`,
  ];

  if (result.findings.length === 0) {
    return [...lines, '', 'No risky patterns found.'].join('\n');
  }

  const findings = sortFindings(result.findings).flatMap((finding) => [
    '',
    `[${finding.severity.toUpperCase()}] ${finding.title}`,
    `Rule: ${finding.id} (${finding.category})`,
    `File: ${finding.filePath}:${finding.line}`,
    `Evidence: ${finding.evidence}`,
    `Fix: ${finding.recommendation}`,
  ]);

  return [...lines, ...findings].join('\n');
};
