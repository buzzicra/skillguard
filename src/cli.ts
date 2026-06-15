#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildBaseline,
  compareBaselines,
  formatBaselineComparison,
  formatBaselineReport,
  readBaseline,
  writeBaseline,
} from './baseline.js';
import { formatTextReport } from './format.js';
import { initProject } from './init.js';
import { formatInventoryReport, inventoryProject } from './inventory.js';
import { formatMarkdownReport } from './markdown.js';
import { parseRulePreset } from './presets.js';
import { formatSarifReport } from './sarif.js';
import { scanProject } from './scanner.js';
import type { RiskLevel, RulePreset, ScanOptions } from './types.js';
import { packageVersion } from './version.js';

type CliOptions = {
  command: 'scan' | 'inventory' | 'baseline' | 'init' | 'help' | 'version';
  targetPath: string;
  json: boolean;
  sarifPath?: string;
  markdownPath?: string;
  failOn?: RiskLevel;
  changedFrom?: string;
  preset?: RulePreset;
  baselinePath?: string;
  outputPath?: string;
  dryRun?: boolean;
  force?: boolean;
  preCommit?: boolean;
};

type CliIo = {
  stdout: Pick<typeof process.stdout, 'write'>;
  stderr: Pick<typeof process.stderr, 'write'>;
};

const riskOrder: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const usage = `SkillGuard

Usage:
  skillguard scan [path] [--json] [--sarif <file>] [--fail-on <LOW|MEDIUM|HIGH|CRITICAL>] [--changed-from <git-ref>] [--preset <default|oss|strict>]
  skillguard scan [path] [--markdown <file>]
  skillguard scan [path] [--baseline <skillguard.lock.json>]
  skillguard baseline [path] [--output <skillguard.lock.json>] [--preset <default|oss|strict>]
  skillguard inventory [path] [--json] [--changed-from <git-ref>] [--preset <default|oss|strict>]
  skillguard init [path] [--dry-run] [--force] [--pre-commit]
  skillguard --version
  skillguard --help

Examples:
  skillguard scan
  skillguard scan . --fail-on HIGH
  skillguard scan . --changed-from origin/main --fail-on HIGH
  skillguard scan . --preset strict
  skillguard baseline . --output skillguard.lock.json
  skillguard scan . --baseline skillguard.lock.json
  skillguard inventory . --json
  skillguard scan ~/.claude/skills --json
  skillguard scan . --sarif skillguard.sarif --fail-on HIGH
  skillguard scan . --markdown skillguard-report.md
  skillguard init --pre-commit
`;

export const isDirectInvocation = (
  entrypoint: string | undefined = process.argv[1],
  moduleUrl: string = import.meta.url,
): boolean => {
  if (entrypoint === undefined) {
    return false;
  }

  try {
    return realpathSync(entrypoint) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
};

const parseRiskLevel = (value: string): RiskLevel => {
  const normalized = value.toUpperCase();

  if (normalized === 'LOW' || normalized === 'MEDIUM' || normalized === 'HIGH' || normalized === 'CRITICAL') {
    return normalized;
  }

  throw new Error(`Invalid --fail-on level: ${value}`);
};

const parseArgs = (argv: readonly string[]): CliOptions => {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    return { command: 'help', targetPath: process.cwd(), json: false };
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    return { command: 'version', targetPath: process.cwd(), json: false };
  }

  const [command, ...rest] = argv;

  if (command !== 'scan' && command !== 'inventory' && command !== 'baseline' && command !== 'init') {
    throw new Error(`Unknown command: ${command ?? ''}`);
  }

  let targetPath = process.cwd();
  let json = false;
  let sarifPath: string | undefined;
  let markdownPath: string | undefined;
  let failOn: RiskLevel | undefined;
  let changedFrom: string | undefined;
  let preset: RulePreset | undefined;
  let baselinePath: string | undefined;
  let outputPath: string | undefined;
  let dryRun = false;
  let force = false;
  let preCommit = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (command === 'init' && arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (command === 'init' && arg === '--force') {
      force = true;
      continue;
    }

    if (command === 'init' && arg === '--pre-commit') {
      preCommit = true;
      continue;
    }

    if (command === 'init' && arg?.startsWith('--') === true) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (arg === '--preset') {
      const value = rest[index + 1];

      if (value === undefined) {
        throw new Error('--preset requires default, oss, or strict');
      }

      preset = parseRulePreset(value);
      index += 1;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    if (arg === '--fail-on') {
      if (command !== 'scan') {
        throw new Error(`Unknown option: ${arg}`);
      }

      const value = rest[index + 1];

      if (value === undefined) {
        throw new Error('--fail-on requires a level');
      }

      failOn = parseRiskLevel(value);
      index += 1;
      continue;
    }

    if (arg === '--baseline') {
      if (command !== 'scan') {
        throw new Error(`Unknown option: ${arg}`);
      }

      const value = rest[index + 1];

      if (value === undefined) {
        throw new Error('--baseline requires a file path');
      }

      baselinePath = value;
      index += 1;
      continue;
    }

    if (arg === '--output') {
      if (command !== 'baseline') {
        throw new Error(`Unknown option: ${arg}`);
      }

      const value = rest[index + 1];

      if (value === undefined) {
        throw new Error('--output requires a file path');
      }

      outputPath = value;
      index += 1;
      continue;
    }

    if (arg === '--sarif') {
      if (command !== 'scan') {
        throw new Error(`Unknown option: ${arg}`);
      }

      const value = rest[index + 1];

      if (value === undefined) {
        throw new Error('--sarif requires a file path');
      }

      sarifPath = value;
      index += 1;
      continue;
    }

    if (arg === '--markdown') {
      if (command !== 'scan') {
        throw new Error(`Unknown option: ${arg}`);
      }

      const value = rest[index + 1];

      if (value === undefined) {
        throw new Error('--markdown requires a file path');
      }

      markdownPath = value;
      index += 1;
      continue;
    }

    if (arg === '--changed-from') {
      const value = rest[index + 1];

      if (value === undefined) {
        throw new Error('--changed-from requires a git ref');
      }

      changedFrom = value;
      index += 1;
      continue;
    }

    if (arg?.startsWith('--') === true) {
      throw new Error(`Unknown option: ${arg}`);
    }

    targetPath = arg ?? targetPath;
  }

  return {
    command,
    targetPath,
    json,
    ...(sarifPath === undefined ? {} : { sarifPath }),
    ...(markdownPath === undefined ? {} : { markdownPath }),
    ...(failOn === undefined ? {} : { failOn }),
    ...(changedFrom === undefined ? {} : { changedFrom }),
    ...(preset === undefined ? {} : { preset }),
    ...(baselinePath === undefined ? {} : { baselinePath }),
    ...(outputPath === undefined ? {} : { outputPath }),
    dryRun,
    force,
    preCommit,
  };
};

export const main = async (
  argv: readonly string[] = process.argv.slice(2),
  io: CliIo = { stdout: process.stdout, stderr: process.stderr },
): Promise<number> => {
  try {
    const options = parseArgs(argv);

    if (options.command === 'help') {
      io.stdout.write(`${usage}\n`);
      return 0;
    }

    if (options.command === 'version') {
      io.stdout.write(`${packageVersion}\n`);
      return 0;
    }

    if (options.command === 'init') {
      const result = await initProject(options.targetPath, {
        ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
        ...(options.force === undefined ? {} : { force: options.force }),
        ...(options.preCommit === undefined ? {} : { preCommit: options.preCommit }),
      });
      const created = result.created.map((path) => `Created ${path}`);
      const skipped = result.skipped.map((path) => `Skipped ${path} (already exists)`);
      io.stdout.write(`${[...created, ...skipped].join('\n')}\n`);
      return 0;
    }

    const scanOptions: ScanOptions = {
      ...(options.changedFrom === undefined ? {} : { changedFrom: options.changedFrom }),
      ...(options.preset === undefined ? {} : { preset: options.preset }),
    };

    if (options.command === 'baseline') {
      const baseline = await buildBaseline(options.targetPath, scanOptions);

      if (options.outputPath !== undefined) {
        await writeBaseline(baseline, options.outputPath);
        io.stdout.write(`${formatBaselineReport(baseline)}\nCreated ${basename(options.outputPath)}\n`);
        return 0;
      }

      io.stdout.write(`${JSON.stringify(baseline, null, 2)}\n`);
      return 0;
    }

    if (options.command === 'inventory') {
      const result = await inventoryProject(options.targetPath, scanOptions);
      io.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : `${formatInventoryReport(result)}\n`);
      return 0;
    }

    const result = await scanProject(options.targetPath, scanOptions);
    const comparison =
      options.baselinePath === undefined
        ? undefined
        : compareBaselines(await readBaseline(options.baselinePath), await buildBaseline(options.targetPath, scanOptions));

    if (options.sarifPath !== undefined) {
      await writeFile(options.sarifPath, `${JSON.stringify(formatSarifReport(result), null, 2)}\n`);
    }

    if (options.markdownPath !== undefined) {
      await writeFile(options.markdownPath, `${formatMarkdownReport(result, comparison)}\n`);
    }

    const textReport =
      comparison === undefined ? formatTextReport(result) : `${formatTextReport(result)}\n\n${formatBaselineComparison(comparison)}`;
    io.stdout.write(
      options.json
        ? `${JSON.stringify(comparison === undefined ? result : { ...result, baseline: comparison }, null, 2)}\n`
        : `${textReport}\n`,
    );

    if (options.failOn !== undefined && riskOrder[result.risk.level] >= riskOrder[options.failOn]) {
      return 1;
    }

    if (comparison?.hasDrift === true) {
      return 1;
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    io.stderr.write(`skillguard: ${message}\n`);
    return 2;
  }
};

if (isDirectInvocation()) {
  const exitCode = await main();
  process.exitCode = exitCode;
}
