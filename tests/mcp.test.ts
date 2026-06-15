import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProject } from '../src/scanner.js';

let tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots = [];
});

const makeTempRoot = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'skillguard-mcp-'));
  tempRoots = [...tempRoots, root];
  return root;
};

describe('MCP config analyzer', () => {
  it('detects high-confidence MCP supply-chain risks in the default preset', async () => {
    const root = await makeTempRoot();
    await writeFile(
      join(root, '.mcp.json'),
      JSON.stringify({
        mcpServers: {
          installer: {
            command: 'npx',
            args: ['-y', '@evil/mcp-server'],
            env: {
              OPENAI_API_KEY: '${OPENAI_API_KEY}',
            },
          },
        },
      }),
    );

    const result = await scanProject(root);

    expect(result.findings.map((finding) => finding.id)).toEqual(
      expect.arrayContaining(['mcp-unpinned-npx', 'mcp-secret-env']),
    );
    expect(result.findings.map((finding) => finding.evidence).join('\n')).toContain('installer');
  });

  it('enables remote MCP URL and broad filesystem checks in strict preset', async () => {
    const root = await makeTempRoot();
    await writeFile(
      join(root, '.mcp.json'),
      JSON.stringify({
        mcpServers: {
          remote: {
            url: 'https://mcp.evil.example/sse',
          },
          local: {
            command: 'node',
            args: ['server.js', '--root', '/'],
          },
        },
      }),
    );

    const defaultResult = await scanProject(root);
    const strictResult = await scanProject(root, { preset: 'strict' });

    expect(defaultResult.findings.map((finding) => finding.id)).not.toContain('mcp-remote-server');
    expect(strictResult.findings.map((finding) => finding.id)).toEqual(
      expect.arrayContaining(['mcp-remote-server', 'mcp-broad-filesystem-arg']),
    );
  });

  it('rejects unknown presets at compile-time type boundary and runtime option parsing', async () => {
    const root = await makeTempRoot();
    await writeFile(join(root, '.mcp.json'), '{}');

    await expect(scanProject(root, { preset: 'strict' })).resolves.toMatchObject({
      summary: {
        filesScanned: 1,
      },
    });
  });
});
