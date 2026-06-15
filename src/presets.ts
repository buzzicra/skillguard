import type { RulePreset, Severity } from './types.js';

type PresetPolicy = {
  disabledRegexRules: readonly string[];
  enabledMcpRules: readonly string[];
  severityOverrides: Readonly<Record<string, Severity>>;
};

export const presetNames = ['default', 'oss', 'strict'] as const satisfies readonly RulePreset[];

const defaultPolicy: PresetPolicy = {
  disabledRegexRules: [],
  enabledMcpRules: ['mcp-unpinned-npx', 'mcp-secret-env', 'mcp-dangerous-command'],
  severityOverrides: {},
};

const ossPolicy: PresetPolicy = {
  ...defaultPolicy,
  enabledMcpRules: [...defaultPolicy.enabledMcpRules, 'mcp-remote-server'],
};

const strictPolicy: PresetPolicy = {
  ...ossPolicy,
  enabledMcpRules: [...ossPolicy.enabledMcpRules, 'mcp-broad-filesystem-arg'],
  severityOverrides: {
    'broad-filesystem-access': 'high',
    'untrusted-network-call': 'high',
  },
};

export const parseRulePreset = (value: string): RulePreset => {
  if (value === 'default' || value === 'oss' || value === 'strict') {
    return value;
  }

  throw new Error(`Invalid --preset: ${value}`);
};

export const presetPolicy = (preset: RulePreset = 'default'): PresetPolicy => {
  if (preset === 'oss') {
    return ossPolicy;
  }

  if (preset === 'strict') {
    return strictPolicy;
  }

  return defaultPolicy;
};
