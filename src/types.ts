export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RulePreset = 'default' | 'oss' | 'strict';

export type FindingCategory =
  | 'secrets'
  | 'shell'
  | 'network'
  | 'permissions'
  | 'prompt-injection'
  | 'supply-chain'
  | 'config';

export type Finding = {
  id: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  filePath: string;
  line: number;
  evidence: string;
  recommendation: string;
};

export type Risk = {
  score: number;
  level: RiskLevel;
};

export type ScanSummary = {
  filesScanned: number;
  filesSkipped: number;
  findingsBySeverity: Partial<Record<Severity, number>>;
};

export type ScanResult = {
  root: string;
  findings: Finding[];
  risk: Risk;
  summary: ScanSummary;
};

export type TextScanInput = {
  filePath: string;
  content: string;
};

export type ScanOptions = {
  changedFrom?: string;
  preset?: RulePreset;
};

export type AgentFileType =
  | 'AGENTS'
  | 'Skill'
  | 'MCP config'
  | 'Cursor rule'
  | 'Agent instruction'
  | 'Package';

export type DiscoveredAgentFile = {
  type: AgentFileType;
  path: string;
  absolutePath: string;
};

export type InventoryItem = {
  type: AgentFileType;
  path: string;
  findings: number;
  highestSeverity?: Severity;
  ignored: boolean;
};

export type InventoryResult = {
  root: string;
  items: InventoryItem[];
  summary: {
    files: number;
    ignored: number;
    findings: number;
  };
};

export type BaselineFile = {
  path: string;
  type: AgentFileType;
  sha256: string;
};

export type BaselineFinding = {
  fingerprint: string;
  ruleId: string;
  severity: Severity;
  filePath: string;
  line: number;
  evidence: string;
};

export type BaselineSnapshot = {
  schemaVersion: 1;
  tool: {
    name: 'skillguard';
    version: string;
  };
  generatedAt: string;
  root: string;
  summary: {
    files: number;
    findings: number;
    outboundDomains: number;
    secretReferences: number;
  };
  files: BaselineFile[];
  findings: BaselineFinding[];
  outboundDomains: string[];
  secretReferences: string[];
};

export type BaselineComparison = {
  hasDrift: boolean;
  newFiles: string[];
  removedFiles: string[];
  changedFiles: string[];
  newFindings: BaselineFinding[];
  resolvedFindings: BaselineFinding[];
  newOutboundDomains: string[];
  removedOutboundDomains: string[];
  newSecretReferences: string[];
  removedSecretReferences: string[];
};
