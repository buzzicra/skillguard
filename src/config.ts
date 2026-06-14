import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { matchesGlob } from './glob.js';
import type { FindingCategory, Severity } from './types.js';

export type AllowEntry = {
  rule?: string;
  path?: string;
  contains?: string;
};

export type CustomRuleConfig = {
  id: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  pattern: string;
  recommendation: string;
};

export type ProjectConfig = {
  ignore: readonly string[];
  severityOverrides: Readonly<Record<string, Severity>>;
  allow: readonly AllowEntry[];
  rules: readonly CustomRuleConfig[];
};

const emptyConfig: ProjectConfig = {
  ignore: [],
  severityOverrides: {},
  allow: [],
  rules: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSeverity = (value: unknown): value is Severity =>
  value === 'critical' || value === 'high' || value === 'medium' || value === 'low';

const isFindingCategory = (value: unknown): value is FindingCategory =>
  value === 'secrets' ||
  value === 'shell' ||
  value === 'network' ||
  value === 'permissions' ||
  value === 'prompt-injection' ||
  value === 'supply-chain' ||
  value === 'config';

const readOptionalText = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
};

const parseIgnoreFile = (content: string | undefined): string[] => {
  if (content === undefined) {
    return [];
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
};

const parseSeverityOverrides = (value: unknown): Record<string, Severity> => {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error('Invalid .skillguard.json: severityOverrides must be an object');
  }

  return Object.entries(value).reduce<Record<string, Severity>>((overrides, [ruleId, severity]) => {
    if (!isSeverity(severity)) {
      throw new Error(`Invalid .skillguard.json: severityOverrides.${ruleId} has invalid severity`);
    }

    return { ...overrides, [ruleId]: severity };
  }, {});
};

const parseStringArray = (value: unknown, key: string): string[] => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Invalid .skillguard.json: ${key} must be a string array`);
  }

  return value;
};

const parseAllow = (value: unknown): AllowEntry[] => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('Invalid .skillguard.json: allow must be an array');
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error('Invalid .skillguard.json: allow entries must be objects');
    }

    const rule = entry.rule;
    const path = entry.path;
    const contains = entry.contains;

    if (rule !== undefined && typeof rule !== 'string') {
      throw new Error('Invalid .skillguard.json: allow.rule must be a string');
    }

    if (path !== undefined && typeof path !== 'string') {
      throw new Error('Invalid .skillguard.json: allow.path must be a string');
    }

    if (contains !== undefined && typeof contains !== 'string') {
      throw new Error('Invalid .skillguard.json: allow.contains must be a string');
    }

    return {
      ...(rule === undefined ? {} : { rule }),
      ...(path === undefined ? {} : { path }),
      ...(contains === undefined ? {} : { contains }),
    };
  });
};

const parseRules = (value: unknown): CustomRuleConfig[] => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('Invalid .skillguard.json: rules must be an array');
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error('Invalid .skillguard.json: rule entries must be objects');
    }

    const { id, title, severity, category, pattern, recommendation } = entry;

    if (
      typeof id !== 'string' ||
      typeof title !== 'string' ||
      !isSeverity(severity) ||
      !isFindingCategory(category) ||
      typeof pattern !== 'string' ||
      typeof recommendation !== 'string'
    ) {
      throw new Error('Invalid .skillguard.json: each custom rule needs id, title, severity, category, pattern, recommendation');
    }

    return { id, title, severity, category, pattern, recommendation };
  });
};

const parseJsonConfig = (content: string | undefined): ProjectConfig => {
  if (content === undefined) {
    return emptyConfig;
  }

  const parsed: unknown = JSON.parse(content);

  if (!isRecord(parsed)) {
    throw new Error('Invalid .skillguard.json: root must be an object');
  }

  return {
    ignore: parseStringArray(parsed.ignore, 'ignore'),
    severityOverrides: parseSeverityOverrides(parsed.severityOverrides),
    allow: parseAllow(parsed.allow),
    rules: parseRules(parsed.rules),
  };
};

export const loadProjectConfig = async (root: string): Promise<ProjectConfig> => {
  const [ignoreText, jsonText] = await Promise.all([
    readOptionalText(join(root, '.skillguardignore')),
    readOptionalText(join(root, '.skillguard.json')),
  ]);
  const jsonConfig = parseJsonConfig(jsonText);

  return {
    ignore: [...parseIgnoreFile(ignoreText), ...jsonConfig.ignore],
    severityOverrides: jsonConfig.severityOverrides,
    allow: jsonConfig.allow,
    rules: jsonConfig.rules,
  };
};

export const isIgnored = (filePath: string, config: ProjectConfig): boolean =>
  config.ignore.some((pattern) => matchesGlob(filePath, pattern));
