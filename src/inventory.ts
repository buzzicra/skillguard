import { isIgnored } from './config.js';
import { severityRank } from './risk.js';
import { discoverProjectFiles, scanProject } from './scanner.js';
import type { Finding, InventoryItem, InventoryResult, ScanOptions, Severity } from './types.js';

const highestSeverity = (findings: readonly Finding[]): Severity | undefined =>
  findings.reduce<Severity | undefined>((highest, finding) => {
    if (highest === undefined || severityRank[finding.severity] > severityRank[highest]) {
      return finding.severity;
    }

    return highest;
  }, undefined);

const pad = (value: string, width: number): string => value.padEnd(width, ' ');

export const inventoryProject = async (targetPath: string = process.cwd(), options: ScanOptions = {}): Promise<InventoryResult> => {
  const [discovery, scan] = await Promise.all([
    discoverProjectFiles(targetPath, options),
    scanProject(targetPath, options),
  ]);
  const findingsByPath = scan.findings.reduce<Record<string, Finding[]>>((groups, finding) => {
    return {
      ...groups,
      [finding.filePath]: [...(groups[finding.filePath] ?? []), finding],
    };
  }, {});
  const items: InventoryItem[] = discovery.files.map((file) => {
    const ignored = isIgnored(file.path, discovery.config);
    const findings = ignored ? [] : findingsByPath[file.path] ?? [];
    const severity = highestSeverity(findings);

    return {
      type: file.type,
      path: file.path,
      findings: findings.length,
      ...(severity === undefined ? {} : { highestSeverity: severity }),
      ignored,
    };
  });

  return {
    root: discovery.root,
    items,
    summary: {
      files: items.length,
      ignored: items.filter((item) => item.ignored).length,
      findings: scan.findings.length,
    },
  };
};

export const formatInventoryReport = (result: InventoryResult): string => {
  const header = [
    `Inventory: ${result.summary.files} agent files`,
    `Ignored: ${result.summary.ignored}`,
    `Findings: ${result.summary.findings}`,
  ];

  if (result.items.length === 0) {
    return [...header, '', 'No agent instruction files found.'].join('\n');
  }

  const rows = result.items.map((item) => ({
    type: item.type,
    path: item.path,
    findings: item.findings.toString(),
    highest: item.highestSeverity?.toUpperCase() ?? '-',
    ignored: item.ignored ? 'yes' : 'no',
  }));
  const widths = {
    type: Math.max('Type'.length, ...rows.map((row) => row.type.length)),
    path: Math.max('Path'.length, ...rows.map((row) => row.path.length)),
    findings: Math.max('Findings'.length, ...rows.map((row) => row.findings.length)),
    highest: Math.max('Highest'.length, ...rows.map((row) => row.highest.length)),
    ignored: Math.max('Ignored'.length, ...rows.map((row) => row.ignored.length)),
  };
  const table = [
    `${pad('Type', widths.type)}  ${pad('Path', widths.path)}  ${pad('Findings', widths.findings)}  ${pad('Highest', widths.highest)}  ${pad('Ignored', widths.ignored)}`,
    `${'-'.repeat(widths.type)}  ${'-'.repeat(widths.path)}  ${'-'.repeat(widths.findings)}  ${'-'.repeat(widths.highest)}  ${'-'.repeat(widths.ignored)}`,
    ...rows.map(
      (row) =>
        `${pad(row.type, widths.type)}  ${pad(row.path, widths.path)}  ${pad(row.findings, widths.findings)}  ${pad(row.highest, widths.highest)}  ${pad(row.ignored, widths.ignored)}`,
    ),
  ];

  return [...header, '', ...table].join('\n');
};
