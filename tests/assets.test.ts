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

  it('ships an MCP demo lab for launch screenshots', async () => {
    const demo = await readFile('examples/bad-mcp/.mcp.json', 'utf8');

    expect(demo).toContain('mcpServers');
    expect(demo).toContain('https://mcp.evil.example/sse');
    expect(demo).toContain('OPENAI_API_KEY');
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
    expect(action).toContain('npx -y @buzzicra/skillguard@0.5.1');
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

  it('ships launch visuals that make the README scannable', async () => {
    const mark = await readFile('docs/assets/skillguard-mark.svg', 'utf8');
    const og = await readFile('docs/assets/skillguard-og.svg', 'utf8');
    const demo = await readFile('docs/assets/mcp-demo.svg', 'utf8');

    expect(mark).toContain('<svg');
    expect(mark).toContain('SkillGuard');
    expect(og).toContain('AI agent instruction files are supply-chain code');
    expect(demo).toContain('mcp-remote-server');
    expect(demo).toContain('Risk:');
  });

  it('ships rule docs and comparison positioning', async () => {
    const readme = await readFile('README.md', 'utf8');
    const rules = await readFile('docs/rules.md', 'utf8');
    const comparison = await readFile('docs/comparison.md', 'utf8');

    expect(readme).toContain('docs/assets/mcp-demo.svg');
    expect(readme).toContain('docs/rules.md');
    expect(readme).toContain('docs/comparison.md');
    expect(rules).toContain('mcp-unpinned-npx');
    expect(rules).toContain('Preset coverage');
    expect(comparison).toContain('Dependency scanners');
    expect(comparison).toContain('Agent instruction layer');
  });
});
