import { describe, expect, it } from 'vitest';
import { evaluateCase, findDisagreements } from '../../src/engine';
import { buildDemoCases } from '../../src/demo/cases';
import { CONSTRAINT_BY_ID, EVIDENCE, FIXTURES, LITERATURE } from '../../src/evidence';
import { caseSchema } from '../../src/domain/schema';

const demos = Object.fromEntries(buildDemoCases().map((c) => [c.id, c]));
const ev = (id: string) => evaluateCase(demos[id], EVIDENCE);
const res = (id: string, constraintId: string, oarId?: string) =>
  ev(id).results.find((r) => r.constraintId === constraintId && (!oarId || r.oarId === oarId))!;

describe('evidence dataset integrity', () => {
  it('literature dataset contains no test fixtures and fixtures are all flagged', () => {
    expect(LITERATURE.constraints.some((k) => k.isTestFixture)).toBe(false);
    expect(LITERATURE.sources.some((s) => s.isTestFixture)).toBe(false);
    expect(FIXTURES.constraints.every((k) => k.isTestFixture)).toBe(true);
    expect(FIXTURES.recoveryModels.every((m) => m.isTestFixture)).toBe(true);
  });
  it('every enabled literature record is verified from full text with quote, location, numeric upper limit', () => {
    for (const k of LITERATURE.constraints.filter((x) => x.automatedEvaluation)) {
      expect(k.extractionStatus, k.id).toBe('verified-fulltext');
      expect(k.quote, k.id).toBeTruthy();
      expect(k.location, k.id).toBeTruthy();
      expect(k.threshold, k.id).not.toBeNull();
      expect(['<', '<='], k.id).toContain(k.inequality);
      expect(k.category, k.id).not.toBe('observed-toxicity-association');
      if (k.doseQuantity !== 'physical') expect(k.alphaBeta, k.id).not.toBeNull();
      expect(LITERATURE.sources.some((s) => s.key === k.sourceKey), k.id).toBe(true);
    }
  });
  it('records without verified full text never carry an enabled threshold', () => {
    for (const k of LITERATURE.constraints.filter((x) => x.extractionStatus !== 'verified-fulltext')) expect(k.automatedEvaluation, k.id).toBe(false);
  });
  it('only paired, enabled recovery models are applied', () => {
    for (const m of LITERATURE.recoveryModels.filter((x) => x.enabled)) {
      expect(m.extractionStatus).toBe('verified-fulltext');
      expect(m.pairedSourceKeys.length).toBeGreaterThan(0);
      expect(m.factorTable.length).toBeGreaterThan(0);
    }
  });
});

describe('demo cases (hand-computed expectations)', () => {
  it('all demo cases validate against the import schema', () => {
    for (const c of Object.values(demos)) expect(caseSchema.safeParse(c).success, c.id).toBe(true);
  });

  it('BR-001: fully evaluable and within selected constraints (8 of 8)', () => {
    const e = ev('demo-br-001');
    expect(e.coverageText).toBe('8 of 8 required checks evaluable');
    expect(e.overall).toBe('within');
    // Paradis brainstem D0.1cc, α/β 2.5: prior 50/30 → EQD2 46.296; proposed 17/10 → 15.867; total 62.163 ≤ 64
    const r = res('demo-br-001', 'paradis-2019-consult-appendixE2-brainstem-1');
    expect(r.priorUnadjusted).toBeCloseTo(46.2963, 3);
    expect(r.proposed?.EQD2).toBeCloseTo(15.8667, 3);
    expect(r.evaluatedValue).toBeCloseTo(62.163, 2);
    // Paired recovery model: interval 2021-04-12 → 2024-05-06 = 1120 d = 36.8 mo → 50% retained
    expect(r.courses[0].intervalDays).toBe(1120);
    expect(r.recovery.applicable).toBe(true);
    expect(r.priorAdjusted).toBeCloseTo(23.148, 3);
    // HGG brainstem: physical sum 52 + 18 = 70 ≤ 100
    expect(res('demo-br-001', 'hgg-frac-reirt-2025-brainstem-1').evaluatedValue).toBe(70);
  });

  it('BR-002: exceedance on both references', () => {
    const e = ev('demo-br-002');
    expect(e.overall).toBe('exceeds');
    expect(res('demo-br-002', 'hgg-frac-reirt-2025-brainstem-1').evaluatedValue).toBe(102);
    expect(res('demo-br-002', 'hgg-frac-reirt-2025-brainstem-1').status).toBe('exceeds');
    expect(res('demo-br-002', 'paradis-2019-consult-appendixE2-brainstem-1').status).toBe('exceeds');
  });

  it('HN-001: insufficient data from missing fractionation and incompatible metric', () => {
    const e = ev('demo-hn-001');
    expect(e.evaluable).toBe(0);
    expect(e.overall).toBe('insufficient');
    const codes = e.results.flatMap((r) => r.reasons.map((x) => x.code));
    expect(codes).toContain('incompatible-metric');
    expect(codes).toContain('missing-fractionation');
  });

  it('HN-002: references disagree; Nash within, Paradis exceeds; recovery switch changes Paradis status', () => {
    const nash = res('demo-hn-002', 'nash-2025-cord-brainstem-audit-spinal-cord-1');
    expect(nash.oarId).toBe('hn2-cordprv');
    expect(nash.evaluatedValue).toBeCloseTo(50.37, 1);
    expect(nash.status).toBe('within');
    const par = res('demo-hn-002', 'paradis-2019-consult-appendixE2-spinal-cord-1', 'hn2-cordprv');
    expect(par.evaluatedValue).toBeCloseTo(51.62, 1);
    expect(par.status).toBe('exceeds');
    const d = findDisagreements(ev('demo-hn-002').results, CONSTRAINT_BY_ID);
    expect(d.some((x) => x.statusDiffers)).toBe(true);
    const adj = evaluateCase({ ...demos['demo-hn-002'], statusBasis: 'recovery-adjusted' }, EVIDENCE);
    const parAdj = adj.results.find((r) => r.constraintId === par.constraintId && r.oarId === 'hn2-cordprv')!;
    expect(parAdj.basisUsed).toBe('recovery-adjusted');
    expect(parAdj.status).toBe('within');
    // Nash has no paired recovery model: unchanged
    expect(adj.results.find((r) => r.constraintId === nash.constraintId)!.basisUsed).toBe('unadjusted');
  });

  it('HN-003: recovery not extended to two prior courses; carotid has no evaluable constraint', () => {
    const e = ev('demo-hn-003');
    const par = e.results.find((r) => r.constraintId === 'paradis-2019-consult-appendixE2-spinal-cord-1')!;
    expect(par.recovery.applicable).toBe(false);
    expect(par.recovery.reason).toMatch(/at most 1 prior course/);
    expect(par.basisUsed).toBe('unadjusted');
    expect(par.courses.map((c) => c.intervalDays)).toEqual([4490, 2152]);
    const nash = e.results.find((r) => r.constraintId === 'nash-2025-cord-brainstem-audit-spinal-cord-1')!;
    expect(nash.evaluatedValue).toBeCloseTo(65.46, 1);
    expect(e.uncoveredOars.map((o) => o.id)).toContain('hn3-car');
  });
});
