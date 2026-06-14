import type { Finding, ScanResult } from './types.js';

type SarifLevel = 'error' | 'warning' | 'note';

type SarifRule = {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  help: { text: string; markdown: string };
  properties: {
    precision: 'high' | 'medium';
    tags: string[];
  };
};

type SarifResult = {
  ruleId: string;
  level: SarifLevel;
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: number };
    };
  }>;
  properties: {
    severity: Finding['severity'];
    category: Finding['category'];
    evidence: string;
  };
};

export type SarifLog = {
  version: '2.1.0';
  $schema: 'https://json.schemastore.org/sarif-2.1.0.json';
  runs: Array<{
    tool: {
      driver: {
        name: 'SkillGuard';
        informationUri: 'https://github.com/esenbora/skillguard';
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
};

const severityToLevel = (severity: Finding['severity']): SarifLevel => {
  if (severity === 'critical' || severity === 'high') {
    return 'error';
  }

  if (severity === 'medium') {
    return 'warning';
  }

  return 'note';
};

const normalizeUri = (filePath: string): string => filePath.replace(/\\/g, '/');

const uniqueRules = (findings: readonly Finding[]): SarifRule[] => {
  const seen = new Set<string>();

  return findings.flatMap((finding) => {
    if (seen.has(finding.id)) {
      return [];
    }

    seen.add(finding.id);

    return [
      {
        id: finding.id,
        name: finding.title,
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.recommendation },
        help: {
          text: finding.recommendation,
          markdown: finding.recommendation,
        },
        properties: {
          precision: finding.severity === 'low' ? 'medium' : 'high',
          tags: [finding.category, `severity:${finding.severity}`],
        },
      },
    ];
  });
};

export const formatSarifReport = (result: ScanResult): SarifLog => ({
  version: '2.1.0',
  $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
  runs: [
    {
      tool: {
        driver: {
          name: 'SkillGuard',
          informationUri: 'https://github.com/esenbora/skillguard',
          rules: uniqueRules(result.findings),
        },
      },
      results: result.findings.map((finding) => ({
        ruleId: finding.id,
        level: severityToLevel(finding.severity),
        message: {
          text: `${finding.title}: ${finding.recommendation}`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: normalizeUri(finding.filePath) },
              region: { startLine: finding.line },
            },
          },
        ],
        properties: {
          severity: finding.severity,
          category: finding.category,
          evidence: finding.evidence,
        },
      })),
    },
  ],
});
