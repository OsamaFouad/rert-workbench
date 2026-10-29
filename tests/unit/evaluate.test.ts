import { describe, expect, it } from 'vitest';
import { evaluateCase, evaluateCheck, findDisagreements, type CheckResult } from '../../src/engine';
import { FIX, course, k, mkCase, oar } from './helpers';

const BS = oar('brainstem');
const codes = (r: CheckResult) => r.reasons.map((x) => x.code);

describe('evaluateCheck — worked examples', () => {
  it('W4: mixed fractionation, two courses, per-phase conversion then sum (α/β 2)', () => {
    const c = mkCase(
      BS,
      [course('C1', BS.id, [[50, 25, '2018-03-01'], [10, 5, '2018-03-10']]), course('C2', BS.id, [[30, 10, '2021-06-01']])],
      { D: 20, n: 10, start: '2024-01-15' },
    );
    const r = evaluateCheck(c, BS, k('fixture-a-brainstem-dmax'), []);
    expect(r.courses[0].phases.map((p) => p.EQD2)).toEqual([50, 10]);
    expect(r.courses[0].unadjusted).toBe(60);
    expect(r.courses[1].unadjusted).toBe(37.5);
    expect(r.priorUnadjusted).toBe(97.5);
    expect(r.proposed?.EQD2).toBe(20);
    expect(r.cumulativeUnadjusted).toBe(117.5);
    expect(r.status).toBe('exceeds'); // 117.5 > 100
    expect(r.headroomUnadjusted).toBe(2.5);
    // Separate intervals per course
    expect(r.courses[0].intervalDays).toBe(2137);
    expect(r.courses[1].intervalDays).toBe(958);
    // Prescription (99 Gy) never used as OAR dose
    expect(r.courses[0].phases[0].D).toBe(50);
    expect(codes(r)).toContain('conservative-summation');
  });

  it('W5: headroom and physical ceiling; within selected constraints', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[60, 30, '2020-01-01']])], { D: 20, n: 10, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, k('fixture-a-brainstem-dmax'), []);
    expect(r.headroomUnadjusted).toBe(40);
    expect(r.physicalCeiling?.doseGy).toBeCloseTo(31.231056, 5);
    expect(r.cumulativeUnadjusted).toBe(80);
    expect(r.margin).toBe(20);
    expect(r.status).toBe('within');
  });

  it('W6: negative headroom stays visible; existing exceedance even with proposed dose missing', () => {
    const kk = { ...k('fixture-a-brainstem-dmax'), threshold: 50 };
    const c = mkCase(BS, [course('C1', BS.id, [[60, 30, '2020-01-01']])], { D: null, n: 10, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, kk, []);
    expect(r.headroomUnadjusted).toBe(-10);
    expect(r.physicalCeiling?.doseGy).toBe(0);
    expect(r.existingExceedance).toBe(true);
    expect(r.status).toBe('exceeds');
  });

  it('W7: threshold boundaries evaluated at full precision (< vs <=)', () => {
    const c = mkCase(BS, [], { D: 60, n: 30, start: '2022-01-01' }); // EQD2 exactly 60
    const le = { ...k('fixture-a-brainstem-dmax'), threshold: 60, inequality: '<=' as const };
    const lt = { ...le, inequality: '<' as const };
    expect(evaluateCheck(c, BS, le, []).status).toBe('within');
    expect(evaluateCheck(c, BS, lt, []).status).toBe('exceeds');
    // 59.9999 rounds to "60.0" for display but is still below 60
    const tiny = { ...lt, threshold: 60.0001 };
    expect(evaluateCheck(c, BS, tiny, []).status).toBe('within');
    const justOver = { ...le, threshold: 59.99999 };
    expect(evaluateCheck(c, BS, justOver, []).status).toBe('exceeds');
  });

  it('W9: α/β change recomputes per reference (fixture B uses α/β 3)', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[30, 10, '2020-01-01']])], { D: 0, n: 5, start: '2021-01-01' });
    const a = evaluateCheck(c, BS, k('fixture-a-brainstem-dmax'), []);
    const b = evaluateCheck(c, BS, k('fixture-b-brainstem-dmax'), []);
    expect(a.priorUnadjusted).toBe(37.5);
    expect(b.priorUnadjusted).toBeCloseTo(36, 12);
  });

  it('W10: recovery applied to prior EQD2 when model guards pass; unadjusted always kept', () => {
    const cord = oar('spinal-cord');
    const c = mkCase(cord, [course('C1', cord.id, [[60, 30, '2020-02-28', 'D0.03cc']])], { D: 10, n: 5, start: '2021-02-28', metric: 'D0.03cc' }, { pathway: 'head-neck' });
    const r = evaluateCheck(c, cord, k('fixture-a-spinal-cord-d0.03cc'), FIX.recoveryModels);
    expect(r.courses[0].intervalMonths).toBeCloseTo(12.0246, 4);
    expect(r.courses[0].retainedFraction).toBe(0.5);
    expect(r.priorUnadjusted).toBe(60);
    expect(r.priorAdjusted).toBe(30);
    expect(r.headroomUnadjusted).toBe(0);
    expect(r.headroomAdjusted).toBe(30);
    // default basis is unadjusted → 60 + 10*(1+2/2)/2... proposed EQD2 = 10*(1+1)/2 = 10 → 70 > 60
    expect(r.status).toBe('exceeds');
    const adj = evaluateCheck({ ...c, statusBasis: 'recovery-adjusted' }, cord, k('fixture-a-spinal-cord-d0.03cc'), FIX.recoveryModels);
    expect(adj.basisUsed).toBe('recovery-adjusted');
    expect(adj.evaluatedValue).toBe(40);
    expect(adj.status).toBe('within');
  });

  it('W11: recovery model not extended beyond its supported number of prior courses', () => {
    const cord = oar('spinal-cord');
    const c = mkCase(
      cord,
      [course('C1', cord.id, [[30, 15, '2015-01-01', 'D0.03cc']]), course('C2', cord.id, [[20, 10, '2019-01-01', 'D0.03cc']])],
      { D: 5, n: 5, start: '2022-01-01', metric: 'D0.03cc' },
      { statusBasis: 'recovery-adjusted' },
    );
    const r = evaluateCheck(c, cord, k('fixture-a-spinal-cord-d0.03cc'), FIX.recoveryModels);
    expect(r.recovery.applicable).toBe(false);
    expect(r.recovery.reason).toMatch(/at most 1 prior course/);
    expect(r.priorAdjusted).toBeNull();
    expect(r.basisUsed).toBe('unadjusted');
  });

  it('W12: no recovery discount when the limit already includes recovery', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[30, 10, '2020-01-01']])], { D: 0, n: 5, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, k('fixture-b-brainstem-dmax'), FIX.recoveryModels);
    expect(r.recovery.applicable).toBe(false);
    expect(codes(r)).toContain('recovery-in-limit');
  });

  it('W13: interval condition not met → requires review', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[30, 10, '2021-09-01']])], { D: 0, n: 5, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, k('fixture-b-brainstem-dmax'), []);
    expect(codes(r)).toContain('interval-condition-not-met');
    expect(r.status).toBe('review');
  });
});

describe('evaluateCheck — refusal paths', () => {
  it('incompatible metric is never substituted', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[50, 25, '2020-01-01', 'D0.1cc']])], { D: 10, n: 5, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, k('fixture-a-brainstem-dmax'), []);
    expect(r.status).toBe('insufficient');
    expect(codes(r)).toContain('incompatible-metric');
    expect(r.priorUnadjusted).toBeNull();
  });
  it('missing fractionation → insufficient data', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[50, null, '2020-01-01']])], { D: 10, n: 5, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, k('fixture-a-brainstem-dmax'), []);
    expect(r.status).toBe('insufficient');
    expect(codes(r)).toContain('missing-fractionation');
  });
  it('missing proposed dose without existing exceedance → insufficient (headroom still shown)', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[50, 25, '2020-01-01']])], { D: null, n: 5, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, k('fixture-a-brainstem-dmax'), []);
    expect(r.status).toBe('insufficient');
    expect(r.headroomUnadjusted).toBe(50);
  });
  it('mean dose with an EQD2 limit → requires review (no scalar mean EQD2)', () => {
    const p = oar('parotid');
    const c = mkCase(p, [course('C1', p.id, [[26, 30, '2020-01-01', 'Dmean']])], { D: 10, n: 5, start: '2022-01-01', metric: 'Dmean' });
    const r = evaluateCheck(c, p, k('fixture-a-parotid-dmean'), []);
    expect(r.status).toBe('review');
    expect(codes(r)).toContain('mean-biological');
  });
  it('Vx constraint → requires review (no Vx summation)', () => {
    const kk = { ...k('fixture-a-brainstem-dmax'), metric: 'V50Gy' };
    const c = mkCase(BS, [], { D: 10, n: 5, start: '2022-01-01' });
    expect(evaluateCheck(c, BS, kk, []).status).toBe('review');
  });
  it('proton/brachytherapy phases are flagged, not converted silently', () => {
    const cc = course('C1', BS.id, [[50, 25, '2020-01-01']]);
    cc.phases[0].modality = 'proton';
    const c = mkCase(BS, [cc], { D: 10, n: 5, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, k('fixture-a-brainstem-dmax'), []);
    expect(r.status).toBe('review');
    expect(codes(r)).toContain('unsupported-modality');
  });
  it('summation without documented spatial basis → requires review', () => {
    const o = oar('brainstem', { summationBasis: 'not-documented' });
    const c = mkCase(o, [course('C1', o.id, [[50, 25, '2020-01-01']])], { D: 10, n: 5, start: '2022-01-01' });
    const r = evaluateCheck(c, o, k('fixture-a-brainstem-dmax'), []);
    expect(r.status).toBe('review');
    expect(codes(r)).toContain('summation-basis-not-documented');
  });
  it('population outside reference scope → requires review', () => {
    const kk = { ...k('fixture-a-brainstem-dmax'), diseaseScope: ['nasopharyngeal-carcinoma'] };
    const c = mkCase(BS, [], { D: 10, n: 5, start: '2022-01-01' });
    expect(evaluateCheck(c, BS, kk, []).status).toBe('review');
  });
  it('unverified literature record → insufficient (unavailable for automated evaluation)', () => {
    const kk = { ...k('fixture-a-brainstem-dmax'), automatedEvaluation: false, threshold: null, isTestFixture: false };
    const c = mkCase(BS, [], { D: 10, n: 5, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, kk, []);
    expect(r.status).toBe('insufficient');
    expect(codes(r)).toContain('constraint-not-available');
  });
  it('proposed start before prior course end → insufficient', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[50, 25, '2022-02-01']])], { D: 10, n: 5, start: '2022-01-01' });
    expect(codes(evaluateCheck(c, BS, k('fixture-b-brainstem-dmax'), []))).toContain('invalid-interval');
  });
  it('missing dates when the reference has an interval condition → insufficient', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[50, 25, null]])], { D: 10, n: 5, start: '2022-01-01' });
    expect(evaluateCheck(c, BS, k('fixture-b-brainstem-dmax'), []).status).toBe('insufficient');
  });
  it('per-course scope evaluates the proposed course only', () => {
    const kk = { ...k('fixture-a-brainstem-dmax'), scope: 'per-course' as const, threshold: 30 };
    const c = mkCase(BS, [course('C1', BS.id, [[60, 30, '2020-01-01']])], { D: 20, n: 10, start: '2022-01-01' });
    const r = evaluateCheck(c, BS, kk, []);
    expect(r.evaluatedValue).toBe(20);
    expect(r.status).toBe('within');
  });
});

describe('case summary and disagreement', () => {
  it('coverage text and no all-green when any check is not evaluable', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[30, 10, '2021-09-01']])], { D: 10, n: 5, start: '2022-01-01' });
    const e = evaluateCase(c, FIX);
    expect(e.required).toBe(2);
    expect(e.counts.within).toBe(1); // fixture A
    expect(e.counts.review).toBe(1); // fixture B interval condition
    expect(e.overall).toBe('review');
    expect(e.coverageText).toBe('1 of 2 required checks evaluable');
  });
  it('fixtures are excluded when the case does not opt in', () => {
    const c = mkCase(BS, [], { D: 10, n: 5, start: '2022-01-01' }, { includeTestFixtures: false });
    const e = evaluateCase(c, FIX);
    expect(e.required).toBe(0);
    expect(e.overall).toBe('insufficient');
    expect(e.uncoveredOars).toHaveLength(1);
  });
  it('reference switch changes numbers and status', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[60, 30, '2020-01-01']])], { D: 30, n: 10, start: '2022-01-01' });
    const a = evaluateCase(c, FIX, ['fixture-a']);
    const b = evaluateCase(c, FIX, ['fixture-b']);
    expect(a.results[0].status).toBe('within'); // 60 + 37.5 = 97.5 <= 100
    expect(b.results[0].status).toBe('exceeds'); // α/β 3: 60 + 36 = 96 ≥ 90
    expect(a.results[0].evaluatedValue).not.toBe(b.results[0].evaluatedValue);
  });
  it('explains disagreement sources', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[60, 30, '2020-01-01']])], { D: 30, n: 10, start: '2022-01-01' });
    const e = evaluateCase(c, FIX);
    const map = new Map(FIX.constraints.map((x) => [x.id, x]));
    const d = findDisagreements(e.results, map);
    expect(d).toHaveLength(1);
    expect(d[0].statusDiffers).toBe(true);
    expect(d[0].differences.map((x) => x.kind)).toEqual(expect.arrayContaining(['threshold', 'alpha-beta', 'recovery', 'category']));
  });
});

describe('interval bands, alternatives, PRV siblings, source-defined physical sums', () => {
  const band = (min: number | null, max: number | null) => ({
    ...k('fixture-a-brainstem-dmax'),
    id: `band-${min}-${max}`,
    scope: 'reirradiation-course-only' as const,
    doseQuantity: 'physical' as const,
    alphaBeta: null,
    threshold: 10,
    inequality: '<' as const,
    minIntervalMonths: min,
    maxIntervalMonths: max,
    intervalRole: 'applicability' as const,
    intervalCondition: min === null ? 'gap < 2 years' : 'gap > 2 years',
  });

  it('interval-banded records: only the matching band is evaluated, the other is listed as not applicable', () => {
    const data = { ...FIX, constraints: [band(null, 24), band(24, null)] };
    const c = mkCase(BS, [course('C1', BS.id, [[50, 25, '2021-01-01']])], { D: 8, n: 5, start: '2022-01-01' });
    const e = evaluateCase(c, data, ['fixture-a']);
    expect(e.results.map((r) => r.constraintId)).toEqual(['band-null-24']);
    expect(e.results[0].status).toBe('within');
    expect(e.listed.map((l) => l.constraint.id)).toEqual(['band-24-null']);
  });

  it('interval band uses the most recent prior course', () => {
    const data = { ...FIX, constraints: [band(null, 24), band(24, null)] };
    const c = mkCase(BS, [course('C1', BS.id, [[50, 25, '2010-01-01']]), course('C2', BS.id, [[20, 10, '2021-06-01']])], { D: 8, n: 5, start: '2022-01-01' });
    expect(evaluateCase(c, data, ['fixture-a']).results[0].constraintId).toBe('band-null-24');
  });

  it('either-or alternatives count as one required check, met if any alternative is met', () => {
    const a1 = { ...k('fixture-a-brainstem-dmax'), id: 'alt-1', scope: 'reirradiation-course-only' as const, doseQuantity: 'physical' as const, alphaBeta: null, threshold: 10, inequality: '<' as const, alternativeGroup: 'g' };
    const a2 = { ...k('fixture-a-brainstem-dmax'), id: 'alt-2', threshold: 100, alternativeGroup: 'g' };
    const c = mkCase(BS, [course('C1', BS.id, [[60, 30, '2020-01-01']])], { D: 20, n: 10, start: '2022-01-01' });
    const e = evaluateCase(c, { ...FIX, constraints: [a1, a2] }, ['fixture-a']);
    expect(e.results.map((r) => r.status)).toEqual(['exceeds', 'within']);
    expect(e.required).toBe(1);
    expect(e.overall).toBe('within');
  });

  it('PRV-only record is skipped for the structure entry when a PRV entry exists, else insufficient', () => {
    const prvK = { ...k('fixture-a-brainstem-dmax'), structureOrPRV: 'PRV' as const };
    const s = oar('brainstem');
    const prv = oar('brainstem', { id: 'oar-bs-prv', designation: 'PRV' });
    const c1 = mkCase(s, [], { D: 10, n: 5, start: '2022-01-01' });
    const e1 = evaluateCase(c1, { ...FIX, constraints: [prvK] }, ['fixture-a']);
    expect(e1.results[0].status).toBe('insufficient');
    const c2 = { ...c1, oars: [s, prv], proposed: { ...c1.proposed, doses: [...c1.proposed.doses, { id: 'x', oarId: prv.id, metric: 'Dmax', value: 12, unit: 'Gy' as const }] } };
    const e2 = evaluateCase(c2, { ...FIX, constraints: [prvK] }, ['fixture-a']);
    expect(e2.results).toHaveLength(1);
    expect(e2.results[0].oarId).toBe(prv.id);
    expect(e2.results[0].status).toBe('within');
  });

  it('physical cumulative sum allowed only when the source defines it', () => {
    const phys = { ...k('fixture-a-brainstem-dmax'), doseQuantity: 'physical' as const, alphaBeta: null, threshold: 100 };
    const c = mkCase(BS, [course('C1', BS.id, [[58, 30, '2020-01-01']])], { D: 45, n: 15, start: '2022-01-01' });
    expect(evaluateCheck(c, BS, phys, []).status).toBe('review');
    const r = evaluateCheck(c, BS, { ...phys, physicalSumDefinedBySource: true }, []);
    expect(r.evaluatedValue).toBe(103);
    expect(r.status).toBe('exceeds');
  });

  it('observed associations and unverified records are listed, not counted as required checks', () => {
    const obs = { ...k('fixture-a-brainstem-dmax'), id: 'obs', category: 'observed-toxicity-association' as const };
    const unv = { ...k('fixture-a-brainstem-dmax'), id: 'unv', automatedEvaluation: false, threshold: null, extractionStatus: 'not-extracted-fulltext-unavailable' as const };
    const c = mkCase(BS, [], { D: 10, n: 5, start: '2022-01-01' });
    const e = evaluateCase(c, { ...FIX, constraints: [obs, unv] }, ['fixture-a']);
    expect(e.required).toBe(0);
    expect(e.listed).toHaveLength(2);
    expect(e.overall).toBe('insufficient');
  });
});
