import { describe, expect, it } from 'vitest';
import { suggestReferences } from '../../src/engine';
import { buildDemoCases } from '../../src/demo/cases';
import { EVIDENCE } from '../../src/evidence';
import { FIX, course, k, mkCase, oar } from './helpers';

const BS = oar('brainstem');

describe('reference suggestions', () => {
  it('ranks population match first and never uses thresholds', () => {
    const a = { ...k('fixture-a-brainstem-dmax'), diseaseScope: ['glioblastoma'] };
    const b = { ...k('fixture-b-brainstem-dmax'), diseaseScope: ['hnscc'], minIntervalMonths: null };
    const c = mkCase(BS, [course('C1', BS.id, [[50, 25, '2020-01-01']])], { D: 10, n: 5, start: '2022-01-01' });
    const order = (aThr: number) =>
      suggestReferences(c, { ...FIX, constraints: [{ ...a, threshold: aThr }, b] }, ['fixture-a', 'fixture-b']).map((x) => x.sourceKey);
    expect(order(100)).toEqual(['fixture-a', 'fixture-b']);
    expect(order(1)).toEqual(['fixture-a', 'fixture-b']); // a stricter/looser limit does not change the ranking
    const s = suggestReferences(c, { ...FIX, constraints: [a, b] }, ['fixture-a', 'fixture-b']);
    expect(s[0].population).toBe('match');
    expect(s[1].population).toBe('mismatch');
    expect(s[1].recommended).toBe(false);
  });

  it('reports metrics the user still needs to enter', () => {
    const c = mkCase(BS, [course('C1', BS.id, [[50, 25, '2020-01-01', 'D0.03cc']])], { D: null, n: 5, start: '2022-01-01' });
    const s = suggestReferences(c, FIX, ['fixture-a']);
    expect(s[0].missingMetrics).toEqual([{ oarName: 'brainstem', metrics: ['Dmax'] }]);
    expect(s[0].evaluableNow).toBe(0);
  });

  it('demo BR-001: glioma-specific reference ranks above cross-site; H&N-only references are not suggested', () => {
    const c = buildDemoCases().find((x) => x.id === 'demo-br-001')!;
    const s = suggestReferences(c, EVIDENCE, ['paradis-2019-consult-appendixE2', 'hgg-frac-reirt-2025', 'nash-2025-cord-brainstem-audit']);
    expect(s.map((x) => x.sourceKey)).toEqual(['hgg-frac-reirt-2025', 'paradis-2019-consult-appendixE2', 'nash-2025-cord-brainstem-audit']);
    expect(s.find((x) => x.sourceKey === 'nash-2025-cord-brainstem-audit')!.recommended).toBe(false);
  });
});
