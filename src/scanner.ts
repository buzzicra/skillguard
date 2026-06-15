import { execFile } from 'node:child_process';
import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { isIgnored, loadProjectConfig, type AllowEntry, type ProjectConfig } from './config.js';
import { calculateRisk } from './risk.js';
import { rules as builtInRules, type Rule } from './rules.js';
import type { AgentFileType, DiscoveredAgentFile, Finding, ScanOptions, ScanResult, Severity, TextScanInput } from './types.js';

const execFileAsync = promisify(execFile);

const maxFileBytes = 256 * 1024;
const maxDepth = 8;

const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'build',
  'node_modules',
  'out',
]);

const relevantNames = new Set([
  'AGENTS.md',
  'AGENT.md',
  'CLAUDE.md',
  'GEMINI.md',
  'SKILL.md',
  'package.json',
  'mcp.json',
  '.mcp.json',
  '.cursorrules',
]);

const relevantExtensions = new Set(['.md', '.json', '.jsonc', '.toml', '.yaml', '.yml']);

const normalizeRelativePath = (filePath: string): string => filePath.split(sep).join('/');

const isWithinPath = (filePath: string, directory: string): boolean =>
  filePath.startsWith(`${directory}/`) || filePath.includes(`/${directory}/`);

const isRelevantFile = (filePath: string): boolean => {
  const name = basename(filePath);
  const normalized = normalizeRelativePath(filePath);

  if (relevantNames.has(name)) {
    return true;
  }

  if (isWithinPath(normalized, '.cursor/rules')) {
    return relevantExtensions.has(extname(name));
  }

  if (isWithinPath(normalized, 'skills') || isWithinPath(normalized, '.codex') || isWithinPath(normalized, '.claude')) {
    return relevantExtensions.has(extname(name));
  }

  if (name.endsWith('.mcp.json') || name.endsWith('.mcp.yaml') || name.endsWith('.mcp.yml')) {
    return true;
  }

  return false;
};

const classifyAgentFile = (filePath: string): AgentFileType => {
  const name = basename(filePath);
  const normalized = normalizeRelativePath(filePath);

  if (name === 'AGENTS.md' || name === 'AGENT.md') {
    return 'AGENTS';
  }

  if (name === 'SKILL.md' || isWithinPath(normalized, 'skills')) {
    return 'Skill';
  }

  if (name === 'package.json') {
    return 'Package';
  }

  if (name === 'mcp.json' || name === '.mcp.json' || name.endsWith('.mcp.json') || name.endsWith('.mcp.yaml') || name.endsWith('.mcp.yml')) {
    return 'MCP config';
  }

  if (name === '.cursorrules' || isWithinPath(normalized, '.cursor/rules')) {
    return 'Cursor rule';
  }

  return 'Agent instruction';
};

const normalizeEvidence = (line: string): string =>
  line
    .trim()
    .replace(/\b(sk-[A-Za-z0-9_-]{8})[A-Za-z0-9_-]+/g, '$1...[redacted]')
    .replace(/\b(ghp_[A-Za-z0-9_]{8})[A-Za-z0-9_]+/g, '$1...[redacted]')
    .slice(0, 180);

const collectFiles = async (root: string, current: string, depth: number): Promise<string[]> => {
  if (depth > maxDepth) {
    return [];
  }

  const entries = await readdir(current, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(current, entry.name);

      if (entry.isSymbolicLink()) {
        return [];
      }

      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) {
          return [];
        }

        return collectFiles(root, fullPath, depth + 1);
      }

      if (!entry.isFile()) {
        return [];
      }

      const relativePath = relative(root, fullPath);
      return isRelevantFile(relativePath) ? [fullPath] : [];
    }),
  );

  return nested.flat();
};

const listChangedPaths = async (root: string, changedFrom: string): Promise<Set<string>> => {
  try {
    const { stdout } = await execFileAsync('git', [
      '-C',
      root,
      'diff',
      '--name-only',
      '--diff-filter=ACMRTUXB',
      changedFrom,
      '--',
    ]);

    return new Set(
      stdout
        .toString()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown git error';
    throw new Error(`Unable to resolve --changed-from ${changedFrom}: ${message}`);
  }
};

export const discoverProjectFiles = async (
  targetPath: string = process.cwd(),
  options: ScanOptions = {},
): Promise<{ root: string; files: DiscoveredAgentFile[]; config: ProjectConfig }> => {
  const root = resolve(targetPath);
  const rootStat = await lstat(root);

  if (options.changedFrom !== undefined && !rootStat.isDirectory()) {
    throw new Error('--changed-from requires a directory target');
  }

  const config = rootStat.isDirectory()
    ? await loadProjectConfig(root)
    : {
        ignore: [],
        severityOverrides: {},
        allow: [],
        rules: [],
      };
  const discovered = rootStat.isDirectory() ? await collectFiles(root, root, 0) : [root];
  const changedPaths = options.changedFrom === undefined ? undefined : await listChangedPaths(root, options.changedFrom);
  const files = discovered
    .map<DiscoveredAgentFile>((file) => {
      const relativePath = rootStat.isDirectory() ? normalizeRelativePath(relative(root, file)) : basename(file);

      return {
        type: classifyAgentFile(relativePath),
        path: relativePath,
        absolutePath: file,
      };
    })
    .filter((file) => changedPaths === undefined || changedPaths.has(file.path));

  return { root, files, config };
};

const countBySeverity = (findings: readonly Finding[]): Partial<Record<Severity, number>> =>
  findings.reduce<Partial<Record<Severity, number>>>((counts, finding) => {
    return {
      ...counts,
      [finding.severity]: (counts[finding.severity] ?? 0) + 1,
    };
  }, {});

const customRules = (config: ProjectConfig): Rule[] =>
  config.rules.map((rule) => ({
    ...rule,
    pattern: new RegExp(rule.pattern),
  }));

const allowedByEntry = (finding: Finding, entry: AllowEntry): boolean => {
  if (entry.rule !== undefined && entry.rule !== finding.id) {
    return false;
  }

  if (entry.path !== undefined && entry.path !== finding.filePath) {
    return false;
  }

  if (entry.contains !== undefined && !finding.evidence.includes(entry.contains)) {
    return false;
  }

  return true;
};

const applyConfig = (finding: Finding, config: ProjectConfig): Finding | undefined => {
  const severity = config.severityOverrides[finding.id] ?? finding.severity;
  const configuredFinding: Finding = { ...finding, severity };

  if (config.allow.some((entry) => allowedByEntry(configuredFinding, entry))) {
    return undefined;
  }

  return configuredFinding;
};

export const scanText = ({ filePath, content }: TextScanInput, config: ProjectConfig = {
  ignore: [],
  severityOverrides: {},
  allow: [],
  rules: [],
}): Finding[] => {
  const lines = content.split(/\r?\n/);
  const activeRules = [...builtInRules, ...customRules(config)];

  return lines.flatMap((line, index) => {
    return activeRules
      .filter((rule) => rule.pattern.test(line))
      .flatMap<Finding>((rule) => {
        const finding = applyConfig(
          {
            id: rule.id,
            title: rule.title,
            severity: rule.severity,
            category: rule.category,
            filePath,
            line: index + 1,
            evidence: normalizeEvidence(line),
            recommendation: rule.recommendation,
          },
          config,
        );

        return finding === undefined ? [] : [finding];
      });
  });
};

export const scanProject = async (targetPath: string = process.cwd(), options: ScanOptions = {}): Promise<ScanResult> => {
  const { root, files, config } = await discoverProjectFiles(targetPath, options);
  const findings: Finding[] = [];
  let filesScanned = 0;
  let filesSkipped = 0;

  for (const file of files) {
    const fileStat = await stat(file.absolutePath);

    if (fileStat.size > maxFileBytes) {
      filesSkipped += 1;
      continue;
    }

    const buffer = await readFile(file.absolutePath);

    if (buffer.includes(0)) {
      filesSkipped += 1;
      continue;
    }

    if (isIgnored(file.path, config)) {
      filesSkipped += 1;
      continue;
    }

    findings.push(...scanText({ filePath: file.path, content: buffer.toString('utf8') }, config));
    filesScanned += 1;
  }

  return {
    root,
    findings,
    risk: calculateRisk(findings),
    summary: {
      filesScanned,
      filesSkipped,
      findingsBySeverity: countBySeverity(findings),
    },
  };
};
