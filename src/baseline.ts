import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { isIgnored } from './config.js';
import { discoverProjectFiles, scanProject } from './scanner.js';
import type {
  AgentFileType,
  BaselineComparison,
  BaselineFile,
  BaselineFinding,
  BaselineSnapshot,
  ScanOptions,
  Severity,
} from './types.js';
import { packageVersion } from './version.js';

const hash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

const sortUnique = (values: Iterable<string>): string[] => [...new Set(values)].sort((left, right) => left.localeCompare(right));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSeverity = (value: unknown): value is Severity =>
  value === 'critical' || value === 'high' || value === 'medium' || value === 'low';

const isAgentFileType = (value: unknown): value is AgentFileType =>
  value === 'AGENTS' ||
  value === 'Skill' ||
  value === 'MCP config' ||
  value === 'Cursor rule' ||
  value === 'Agent instruction' ||
  value === 'Package';

const findingFingerprint = (finding: Pick<BaselineFinding, 'ruleId' | 'filePath' | 'evidence'>): string =>
  hash([finding.ruleId, finding.filePath, finding.evidence].join('\0'));

const extractOutboundDomains = (content: string): string[] => {
  const domains: string[] = [];
  const pattern = /https?:\/\/[^\s"'`<>)}\]]+/gi;
  let match = pattern.exec(content);

  while (match !== null) {
    const urlText = match[0];

    try {
      const hostname = new URL(urlText).hostname.toLowerCase();
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        domains.push(hostname);
      }
    } catch {
      // Keep extraction best-effort; invalid URLs are already covered by scanner evidence.
    }

    match = pattern.exec(content);
  }

  return sortUnique(domains);
};

const extractSecretReferences = (content: string): string[] => {
  const refs: string[] = [];
  const pattern =
    /(?:\$|process\.env\.)([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|AUTH)[A-Z0-9_]*)/gi;
  let match = pattern.exec(content);

  while (match !== null) {
    const reference = match[1];

    if (reference !== undefined) {
      refs.push(reference.toUpperCase());
    }

    match = pattern.exec(content);
  }

  return sortUnique(refs);
};

export const buildBaseline = async (targetPath: string = process.cwd(), options: ScanOptions = {}): Promise<BaselineSnapshot> => {
  const [discovery, scan] = await Promise.all([
    discoverProjectFiles(targetPath, options),
    scanProject(targetPath, options),
  ]);
  const files: BaselineFile[] = [];
  const domainSet = new Set<string>();
  const secretSet = new Set<string>();

  for (const file of discovery.files) {
    if (isIgnored(file.path, discovery.config)) {
      continue;
    }

    const buffer = await readFile(file.absolutePath);
    const content = buffer.toString('utf8');
    files.push({
      path: file.path,
      type: file.type,
      sha256: hash(buffer),
    });
    extractOutboundDomains(content).forEach((domain) => domainSet.add(domain));
    extractSecretReferences(content).forEach((reference) => secretSet.add(reference));
  }

  const findings = scan.findings
    .map<BaselineFinding>((finding) => ({
      fingerprint: findingFingerprint({
        ruleId: finding.id,
        filePath: finding.filePath,
        evidence: finding.evidence,
      }),
      ruleId: finding.id,
      severity: finding.severity,
      filePath: finding.filePath,
      line: finding.line,
      evidence: finding.evidence,
    }))
    .sort((left, right) => left.filePath.localeCompare(right.filePath) || left.ruleId.localeCompare(right.ruleId));
  const outboundDomains = sortUnique(domainSet);
  const secretReferences = sortUnique(secretSet);

  return {
    schemaVersion: 1,
    tool: {
      name: 'skillguard',
      version: packageVersion,
    },
    generatedAt: new Date().toISOString(),
    root: discovery.root,
    summary: {
      files: files.length,
      findings: findings.length,
      outboundDomains: outboundDomains.length,
      secretReferences: secretReferences.length,
    },
    files: files.sort((left, right) => left.path.localeCompare(right.path)),
    findings,
    outboundDomains,
    secretReferences,
  };
};

export const writeBaseline = async (baseline: BaselineSnapshot, outputPath: string): Promise<void> => {
  await writeFile(outputPath, `${JSON.stringify(baseline, null, 2)}\n`);
};

const requireString = (value: unknown, label: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`Invalid baseline: ${label} must be a string`);
  }

  return value;
};

const parseStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Invalid baseline: ${label} must be a string array`);
  }

  return value;
};

const parseFiles = (value: unknown): BaselineFile[] => {
  if (!Array.isArray(value)) {
    throw new Error('Invalid baseline: files must be an array');
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error('Invalid baseline: file entries must be objects');
    }

    const type = entry.type;

    if (!isAgentFileType(type)) {
      throw new Error('Invalid baseline: file.type is invalid');
    }

    return {
      path: requireString(entry.path, 'file.path'),
      type,
      sha256: requireString(entry.sha256, 'file.sha256'),
    };
  });
};

const parseFindings = (value: unknown): BaselineFinding[] => {
  if (!Array.isArray(value)) {
    throw new Error('Invalid baseline: findings must be an array');
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error('Invalid baseline: finding entries must be objects');
    }

    const severity = entry.severity;
    const line = entry.line;

    if (!isSeverity(severity)) {
      throw new Error('Invalid baseline: finding.severity is invalid');
    }

    if (typeof line !== 'number') {
      throw new Error('Invalid baseline: finding.line must be a number');
    }

    return {
      fingerprint: requireString(entry.fingerprint, 'finding.fingerprint'),
      ruleId: requireString(entry.ruleId, 'finding.ruleId'),
      severity,
      filePath: requireString(entry.filePath, 'finding.filePath'),
      line,
      evidence: requireString(entry.evidence, 'finding.evidence'),
    };
  });
};

export const readBaseline = async (baselinePath: string): Promise<BaselineSnapshot> => {
  const parsed: unknown = JSON.parse(await readFile(baselinePath, 'utf8'));

  if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
    throw new Error('Invalid baseline: schemaVersion must be 1');
  }

  if (!isRecord(parsed.tool) || parsed.tool.name !== 'skillguard' || typeof parsed.tool.version !== 'string') {
    throw new Error('Invalid baseline: tool metadata is invalid');
  }

  return {
    schemaVersion: 1,
    tool: {
      name: 'skillguard',
      version: parsed.tool.version,
    },
    generatedAt: requireString(parsed.generatedAt, 'generatedAt'),
    root: requireString(parsed.root, 'root'),
    summary: {
      files: parseFiles(parsed.files).length,
      findings: parseFindings(parsed.findings).length,
      outboundDomains: parseStringArray(parsed.outboundDomains, 'outboundDomains').length,
      secretReferences: parseStringArray(parsed.secretReferences, 'secretReferences').length,
    },
    files: parseFiles(parsed.files),
    findings: parseFindings(parsed.findings),
    outboundDomains: parseStringArray(parsed.outboundDomains, 'outboundDomains'),
    secretReferences: parseStringArray(parsed.secretReferences, 'secretReferences'),
  };
};

const setDelta = (left: readonly string[], right: readonly string[]): string[] => {
  const rightSet = new Set(right);
  return left.filter((entry) => !rightSet.has(entry));
};

export const compareBaselines = (baseline: BaselineSnapshot, current: BaselineSnapshot): BaselineComparison => {
  const baselineFiles = new Map(baseline.files.map((file) => [file.path, file]));
  const baselineFindings = new Map(baseline.findings.map((finding) => [finding.fingerprint, finding]));
  const currentFindings = new Map(current.findings.map((finding) => [finding.fingerprint, finding]));
  const newFiles = setDelta(current.files.map((file) => file.path), baseline.files.map((file) => file.path));
  const removedFiles = setDelta(baseline.files.map((file) => file.path), current.files.map((file) => file.path));
  const changedFiles = current.files
    .filter((file) => {
      const oldFile = baselineFiles.get(file.path);
      return oldFile !== undefined && oldFile.sha256 !== file.sha256;
    })
    .map((file) => file.path);
  const newFindings = current.findings.filter((finding) => !baselineFindings.has(finding.fingerprint));
  const resolvedFindings = baseline.findings.filter((finding) => !currentFindings.has(finding.fingerprint));
  const comparison = {
    hasDrift: false,
    newFiles,
    removedFiles,
    changedFiles,
    newFindings,
    resolvedFindings,
    newOutboundDomains: setDelta(current.outboundDomains, baseline.outboundDomains),
    removedOutboundDomains: setDelta(baseline.outboundDomains, current.outboundDomains),
    newSecretReferences: setDelta(current.secretReferences, baseline.secretReferences),
    removedSecretReferences: setDelta(baseline.secretReferences, current.secretReferences),
  };

  return {
    ...comparison,
    hasDrift:
      comparison.newFiles.length > 0 ||
      comparison.removedFiles.length > 0 ||
      comparison.changedFiles.length > 0 ||
      comparison.newFindings.length > 0 ||
      comparison.resolvedFindings.length > 0 ||
      comparison.newOutboundDomains.length > 0 ||
      comparison.removedOutboundDomains.length > 0 ||
      comparison.newSecretReferences.length > 0 ||
      comparison.removedSecretReferences.length > 0,
  };
};

const renderList = (title: string, values: readonly string[]): string[] =>
  values.length === 0 ? [] : ['', `${title}:`, ...values.map((value) => `- ${value}`)];

const renderFindings = (findings: readonly BaselineFinding[]): string[] =>
  findings.length === 0
    ? []
    : [
        '',
        'New findings:',
        ...findings.map(
          (finding) =>
            `- [${finding.severity.toUpperCase()}] ${finding.ruleId} ${finding.filePath}:${finding.line} ${finding.evidence}`,
        ),
      ];

export const formatBaselineReport = (baseline: BaselineSnapshot): string =>
  [
    `Baseline files: ${baseline.summary.files}`,
    `Findings: ${baseline.summary.findings}`,
    `Outbound domains: ${baseline.summary.outboundDomains}`,
    `Secret references: ${baseline.summary.secretReferences}`,
  ].join('\n');

export const formatBaselineComparison = (comparison: BaselineComparison): string => {
  if (!comparison.hasDrift) {
    return 'Baseline drift: none';
  }

  return [
    'Baseline drift: detected',
    ...renderList('New files', comparison.newFiles),
    ...renderList('Removed files', comparison.removedFiles),
    ...renderList('Changed files', comparison.changedFiles),
    ...renderFindings(comparison.newFindings),
    ...renderList(
      'Resolved findings',
      comparison.resolvedFindings.map((finding) => `${finding.ruleId} ${finding.filePath}:${finding.line}`),
    ),
    ...renderList('New outbound domains', comparison.newOutboundDomains),
    ...renderList('Removed outbound domains', comparison.removedOutboundDomains),
    ...renderList('New secret references', comparison.newSecretReferences),
    ...renderList('Removed secret references', comparison.removedSecretReferences),
  ].join('\n');
};
