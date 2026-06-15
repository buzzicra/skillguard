import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type InitOptions = {
  dryRun?: boolean;
  force?: boolean;
  preCommit?: boolean;
};

export type InitResult = {
  created: string[];
  skipped: string[];
};

type InitFile = {
  path: string;
  content: string;
  mode?: number;
};

const baseInitFiles: readonly InitFile[] = [
  {
    path: '.skillguard.json',
    content: `${JSON.stringify(
      {
        ignore: ['fixtures/**'],
        severityOverrides: {},
        allow: [],
        rules: [],
      },
      null,
      2,
    )}\n`,
  },
  {
    path: '.skillguardignore',
    content: ['# Demo fixtures and generated reports', 'examples/**', 'skillguard-report.md', 'skillguard.sarif', ''].join('\n'),
  },
  {
    path: '.github/workflows/skillguard.yml',
    content: `name: SkillGuard

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  security-events: write
  actions: read

jobs:
  skillguard:
    name: Scan agent configs
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'

      - name: Run SkillGuard
        run: npx @buzzicra/skillguard scan . --preset strict --sarif skillguard.sarif --fail-on HIGH

      - name: Upload SkillGuard SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: skillguard.sarif
`,
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

const packageUsesHusky = (packageJson: unknown): boolean => {
  if (!isRecord(packageJson)) {
    return false;
  }

  const scripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  const dependencies = isRecord(packageJson.dependencies) ? packageJson.dependencies : {};
  const devDependencies = isRecord(packageJson.devDependencies) ? packageJson.devDependencies : {};
  const prepare = scripts.prepare;

  return (
    (typeof prepare === 'string' && prepare.includes('husky')) ||
    Object.hasOwn(dependencies, 'husky') ||
    Object.hasOwn(devDependencies, 'husky')
  );
};

const detectHusky = async (root: string): Promise<boolean> => {
  if (await pathExists(join(root, '.husky'))) {
    return true;
  }

  try {
    const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as unknown;
    return packageUsesHusky(packageJson);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

const preCommitFile = async (root: string): Promise<InitFile> => {
  if (await detectHusky(root)) {
    return {
      path: '.husky/pre-commit',
      mode: 0o755,
      content: `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh" 2>/dev/null || true

npx @buzzicra/skillguard scan . --changed-from HEAD --fail-on HIGH --preset strict
`,
    };
  }

  return {
    path: '.pre-commit-config.yaml',
    content: `repos:
  - repo: local
    hooks:
      - id: skillguard
        name: SkillGuard agent security scan
        entry: npx @buzzicra/skillguard scan . --changed-from HEAD --fail-on HIGH --preset strict
        language: system
        pass_filenames: false
`,
  };
};

const initFilesFor = async (root: string, options: InitOptions): Promise<readonly InitFile[]> => {
  if (options.preCommit !== true) {
    return baseInitFiles;
  }

  return [...baseInitFiles, await preCommitFile(root)];
};

export const initProject = async (root: string = process.cwd(), options: InitOptions = {}): Promise<InitResult> => {
  const created: string[] = [];
  const skipped: string[] = [];
  const initFiles = await initFilesFor(root, options);

  for (const file of initFiles) {
    const target = join(root, file.path);

    try {
      if (!options.dryRun) {
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, file.content, options.force === true ? undefined : { flag: 'wx' });
        if (file.mode !== undefined) {
          await chmod(target, file.mode);
        }
      }

      created.push(file.path);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
        skipped.push(file.path);
        continue;
      }

      throw error;
    }
  }

  return { created, skipped };
};
