import type { Finding, Risk, RiskLevel, Severity } from './types.js';

const severityWeights: Record<Severity, number> = {
  critical: 45,
  high: 45,
  medium: 12,
  low: 5,
};

export const severityRank: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const levelForScore = (score: number): RiskLevel => {
  if (score >= 75) {
    return 'CRITICAL';
  }

  if (score >= 45) {
    return 'HIGH';
  }

  if (score >= 25) {
    return 'MEDIUM';
  }

  return 'LOW';
};

export const calculateRisk = (findings: readonly Finding[]): Risk => {
  const rawScore = findings.reduce((total, finding) => total + severityWeights[finding.severity], 0);
  const score = Math.min(100, rawScore);

  return {
    score,
    level: levelForScore(score),
  };
};
