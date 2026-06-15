import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('repository assets', () => {
  it('ships a SkillGuard GitHub Actions workflow with SARIF upload', async () => {
    const workflow = await readFile('.github/workflows/skillguard.yml', 'utf8');

    expect(workflow).toContain('node dist/cli.js scan . --preset strict --sarif skillguard.sarif --fail-on HIGH');
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

  it('ships a threat taxonomy for rule reviewers', async () => {
    const taxonomy = await readFile('docs/threats.md', 'utf8');

    expect(taxonomy).toContain('SkillGuard Threat Taxonomy');
    expect(taxonomy).toContain('env-exfiltration');
    expect(taxonomy).toContain('skillguard inventory .');
  });

  it('ships a reusable GitHub Action entrypoint', async () => {
    const action = await readFile('action.yml', 'utf8');

    expect(action).toContain('name: SkillGuard');
    expect(action).toContain('npx -y @buzzicra/skillguard@0.5.0');
    expect(action).toContain('INPUT_BASELINE');
    expect(action).toContain('INPUT_PRESET');
  });

  it('ships launch-day copy assets', async () => {
    const thread = await readFile('docs/launch/x-thread.md', 'utf8');
    const hackerNews = await readFile('docs/launch/hacker-news.md', 'utf8');

    expect(thread).toContain('AI agent instruction files are supply-chain code');
    expect(thread).toContain('npx @buzzicra/skillguard');
    expect(hackerNews).toContain('Show HN: SkillGuard');
  });
});
