import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initProject } from '../src/init.js';

let tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots = [];
});

const makeTempRoot = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'skillguard-init-'));
  tempRoots = [...tempRoots, root];
  return root;
};

describe('initProject', () => {
  it('creates config, ignore file, and GitHub Actions workflow', async () => {
    const root = await makeTempRoot();

    const result = await initProject(root);

    expect(result.created).toEqual([
      '.skillguard.json',
      '.skillguardignore',
      '.github/workflows/skillguard.yml',
    ]);
    expect(await readFile(join(root, '.skillguard.json'), 'utf8')).toContain('"severityOverrides"');
    expect(await readFile(join(root, '.skillguardignore'), 'utf8')).toContain('examples/**');
    expect(await readFile(join(root, '.github/workflows/skillguard.yml'), 'utf8')).toContain(
      'npx @buzzicra/skillguard scan . --preset strict --sarif skillguard.sarif --fail-on HIGH',
    );
  });

  it('does not overwrite existing files unless force is enabled', async () => {
    const root = await makeTempRoot();
    await writeFile(join(root, '.skillguard.json'), '{"custom":true}\n');

    const result = await initProject(root);

    expect(result.created).toContain('.skillguardignore');
    expect(result.skipped).toContain('.skillguard.json');
    expect(await readFile(join(root, '.skillguard.json'), 'utf8')).toBe('{"custom":true}\n');
  });

  it('reports planned files without writing during dry run', async () => {
    const root = await makeTempRoot();

    const result = await initProject(root, { dryRun: true });

    expect(result.created).toEqual([
      '.skillguard.json',
      '.skillguardignore',
      '.github/workflows/skillguard.yml',
    ]);
    await expect(readFile(join(root, '.skillguard.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('can add a pre-commit framework hook', async () => {
    const root = await makeTempRoot();

    const result = await initProject(root, { preCommit: true });

    expect(result.created).toContain('.pre-commit-config.yaml');
    expect(await readFile(join(root, '.pre-commit-config.yaml'), 'utf8')).toContain('npx @buzzicra/skillguard scan . --changed-from HEAD --fail-on HIGH');
    expect(await readFile(join(root, '.pre-commit-config.yaml'), 'utf8')).toContain('--preset strict');
  });

  it('uses Husky when the project already has a Husky stack', async () => {
    const root = await makeTempRoot();
    await mkdir(join(root, '.husky'), { recursive: true });

    const result = await initProject(root, { preCommit: true });

    expect(result.created).toContain('.husky/pre-commit');
    expect(await readFile(join(root, '.husky/pre-commit'), 'utf8')).toContain('--changed-from HEAD --fail-on HIGH');
    expect(await readFile(join(root, '.husky/pre-commit'), 'utf8')).toContain('--preset strict');
    expect((await stat(join(root, '.husky/pre-commit'))).mode & 0o111).toBeGreaterThan(0);
  });
});
