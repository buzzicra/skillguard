import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type InitOptions = {
  dryRun?: boolean;
  force?: boolean;
};

export type InitResult = {
  created: string[];
  skipped: string[];
};

type InitFile = {
  path: string;
  content: string;
};

const initFiles: readonly InitFile[] = [
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
        run: npx @buzzicra/skillguard scan . --sarif skillguard.sarif --fail-on HIGH

      - name: Upload SkillGuard SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: skillguard.sarif
`,
  },
];

export const initProject = async (root: string = process.cwd(), options: InitOptions = {}): Promise<InitResult> => {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const file of initFiles) {
    const target = join(root, file.path);

    try {
      if (!options.dryRun) {
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, file.content, options.force === true ? undefined : { flag: 'wx' });
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
