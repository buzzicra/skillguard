import { basename } from 'node:path';
import type { Finding } from './types.js';

type McpAnalysisInput = {
  filePath: string;
  content: string;
  enabledRuleIds: readonly string[];
};

type McpServer = Record<string, unknown>;

const dangerousCommands = new Set(['bash', 'sh', 'zsh', 'fish', 'powershell', 'pwsh', 'cmd', 'curl', 'wget']);
const broadFlags = new Set(['--root', '--dir', '--directory', '--path', '--workspace', '--allow', '--mount']);
const secretNamePattern = /(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|AUTH)/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEnabled = (enabledRuleIds: readonly string[], ruleId: string): boolean => enabledRuleIds.includes(ruleId);

const isMcpConfigPath = (filePath: string): boolean => {
  const name = basename(filePath);
  return name === 'mcp.json' || name === '.mcp.json' || name.endsWith('.mcp.json');
};

const parseJsonObject = (content: string): Record<string, unknown> | undefined => {
  try {
    const parsed: unknown = JSON.parse(content);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const lineFor = (content: string, needles: readonly string[]): number => {
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';

    if (needles.some((needle) => needle.length > 0 && line.includes(needle))) {
      return index + 1;
    }
  }

  return 1;
};

const finding = (
  input: Pick<McpAnalysisInput, 'filePath' | 'content'>,
  details: Omit<Finding, 'filePath' | 'line'> & { lineNeedles: readonly string[] },
): Finding => ({
  id: details.id,
  title: details.title,
  severity: details.severity,
  category: details.category,
  filePath: input.filePath,
  line: lineFor(input.content, details.lineNeedles),
  evidence: details.evidence.slice(0, 180),
  recommendation: details.recommendation,
});

const packageArg = (command: string, args: readonly string[]): string | undefined => {
  const normalized = command.toLowerCase();

  if (normalized === 'npx') {
    return args.find((arg) => !arg.startsWith('-'));
  }

  if ((normalized === 'pnpm' || normalized === 'yarn') && args[0] === 'dlx') {
    return args.slice(1).find((arg) => !arg.startsWith('-'));
  }

  return undefined;
};

const isPinnedPackage = (packageName: string): boolean => {
  if (packageName.startsWith('@')) {
    return /^@[^/]+\/[^@]+@[^@]+$/.test(packageName);
  }

  return packageName.includes('@');
};

const externalUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    const parsed = new URL(value);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }

    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1') {
      return undefined;
    }

    return value;
  } catch {
    return undefined;
  }
};

const broadPath = (value: string): string | undefined => {
  if (value === '/' || value === '~' || value === '$HOME' || value === '${HOME}') {
    return value;
  }

  if (value.startsWith('~/') || value.startsWith('$HOME/') || value.startsWith('${HOME}/')) {
    return value;
  }

  return undefined;
};

const broadFilesystemArg = (args: readonly string[]): string | undefined => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';
    const direct = broadPath(arg);

    if (direct !== undefined) {
      return direct;
    }

    const [flag, value] = arg.split('=', 2);

    if (flag !== undefined && value !== undefined && broadFlags.has(flag)) {
      const broadValue = broadPath(value);

      if (broadValue !== undefined) {
        return broadValue;
      }
    }

    if (broadFlags.has(arg)) {
      const next = args[index + 1];

      if (next !== undefined) {
        const broadValue = broadPath(next);

        if (broadValue !== undefined) {
          return broadValue;
        }
      }
    }
  }

  return undefined;
};

const secretEnvKeys = (env: unknown): string[] => {
  if (!isRecord(env)) {
    return [];
  }

  return Object.entries(env)
    .filter(([key, value]) => secretNamePattern.test(key) || (typeof value === 'string' && secretNamePattern.test(value)))
    .map(([key]) => key);
};

const analyzeServer = (
  input: McpAnalysisInput,
  serverName: string,
  server: McpServer,
): Finding[] => {
  const findings: Finding[] = [];
  const command = typeof server.command === 'string' ? server.command : undefined;
  const args = toStringArray(server.args);
  const normalizedCommand = command?.toLowerCase();

  if (
    command !== undefined &&
    normalizedCommand !== undefined &&
    isEnabled(input.enabledRuleIds, 'mcp-dangerous-command') &&
    dangerousCommands.has(normalizedCommand)
  ) {
    findings.push(
      finding(input, {
        id: 'mcp-dangerous-command',
        title: 'Dangerous MCP command',
        severity: 'high',
        category: 'supply-chain',
        lineNeedles: [serverName, command],
        evidence: `MCP server ${serverName} runs ${command}`,
        recommendation: 'Replace shell/network MCP launch commands with pinned local packages or reviewed binaries.',
      }),
    );
  }

  const packageName = command === undefined ? undefined : packageArg(command, args);

  if (
    packageName !== undefined &&
    isEnabled(input.enabledRuleIds, 'mcp-unpinned-npx') &&
    !isPinnedPackage(packageName)
  ) {
    findings.push(
      finding(input, {
        id: 'mcp-unpinned-npx',
        title: 'Unpinned MCP package installer',
        severity: 'high',
        category: 'supply-chain',
        lineNeedles: [serverName, packageName],
        evidence: `MCP server ${serverName} uses unpinned package ${packageName}`,
        recommendation: 'Pin MCP packages to an exact reviewed version before sharing or installing the config.',
      }),
    );
  }

  if (isEnabled(input.enabledRuleIds, 'mcp-secret-env')) {
    findings.push(
      ...secretEnvKeys(server.env).map((envKey) =>
        finding(input, {
          id: 'mcp-secret-env',
          title: 'MCP server receives secret-like environment variable',
          severity: 'high',
          category: 'secrets',
          lineNeedles: [serverName, envKey],
          evidence: `MCP server ${serverName} env ${envKey}`,
          recommendation: 'Pass only the minimum required secrets to MCP servers and document why each one is needed.',
        }),
      ),
    );
  }

  const remoteUrl = externalUrl(server.url);

  if (remoteUrl !== undefined && isEnabled(input.enabledRuleIds, 'mcp-remote-server')) {
    findings.push(
      finding(input, {
        id: 'mcp-remote-server',
        title: 'Remote MCP server endpoint',
        severity: 'medium',
        category: 'network',
        lineNeedles: [serverName, remoteUrl],
        evidence: `MCP server ${serverName} url ${remoteUrl}`,
        recommendation: 'Review remote MCP provenance, permissions, authentication, and data flow before trusting it.',
      }),
    );
  }

  const broadArg = broadFilesystemArg(args);

  if (broadArg !== undefined && isEnabled(input.enabledRuleIds, 'mcp-broad-filesystem-arg')) {
    findings.push(
      finding(input, {
        id: 'mcp-broad-filesystem-arg',
        title: 'Broad MCP filesystem argument',
        severity: 'high',
        category: 'permissions',
        lineNeedles: [serverName, broadArg],
        evidence: `MCP server ${serverName} exposes broad filesystem path ${broadArg}`,
        recommendation: 'Scope MCP filesystem access to explicit project directories instead of home or root paths.',
      }),
    );
  }

  return findings;
};

export const analyzeMcpConfig = (input: McpAnalysisInput): Finding[] => {
  if (!isMcpConfigPath(input.filePath)) {
    return [];
  }

  const parsed = parseJsonObject(input.content);

  if (parsed === undefined || !isRecord(parsed.mcpServers)) {
    return [];
  }

  return Object.entries(parsed.mcpServers).flatMap(([serverName, server]) =>
    isRecord(server) ? analyzeServer(input, serverName, server) : [],
  );
};
