import { describe, expect, it } from 'vitest';
import { calculateRisk } from '../src/risk.js';
import type { Finding } from '../src/types.js';

const finding = (severity: Finding['severity']): Finding => ({
  id: `test-${severity}`,
  title: `${severity} finding`,
  severity,
  category: 'secrets',
  filePath: 'AGENTS.md',
  line: 1,
  evidence: 'example',
  recommendation: 'fix it',
});

describe('calculateRisk', () => {
  it('returns zero risk when no findings exist', () => {
    expect(calculateRisk([])).toEqual({ score: 0, level: 'LOW' });
  });

  it('weights critical findings enough to fail loudly', () => {
    expect(calculateRisk([finding('critical')])).toEqual({
      score: 45,
      level: 'HIGH',
    });
  });

  it('treats one high severity finding as high risk', () => {
    expect(calculateRisk([finding('high')])).toEqual({
      score: 45,
      level: 'HIGH',
    });
  });

  it('caps cumulative risk at 100', () => {
    const findings = Array.from({ length: 5 }, () => finding('critical'));

    expect(calculateRisk(findings)).toEqual({
      score: 100,
      level: 'CRITICAL',
    });
  });
});
