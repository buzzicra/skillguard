export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

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
