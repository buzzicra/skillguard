import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('repository assets', () => {
  it('ships a SkillGuard GitHub Actions workflow with SARIF upload', async () => {
    const workflow = await readFile('.github/workflows/skillguard.yml', 'utf8');

    expect(workflow).toContain('node dist/cli.js scan . --sarif skillguard.sarif --fail-on HIGH');
    expect(workflow).toContain('actions/checkout@v5');
    expect(workflow).toContain('actions/setup-node@v5');
    expect(workflow).toContain('github/codeql-action/upload-sarif@v4');
    expect(workflow).toContain('security-events: write');
  });

  it('ships a demo lab that intentionally triggers scanner rules', async () => {
    const demo = await readFile('examples/bad-skill/SKILL.md', 'utf8');

    expect(demo).toContain('$OPENAI_API_KEY');
    expect(demo).toContain('curl');
  });
});
