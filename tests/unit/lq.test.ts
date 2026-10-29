import { describe, expect, it } from 'vitest';
import { bed, bedFromEqd2, eqd2FromBed, lq, physicalDoseForBed } from '../../src/engine';

describe('LQ conversions (worked examples W1–W3, W5)', () => {
  it('W1: 60 Gy / 30 fx, α/β 2 → BED 120, EQD2 60', () => {
    const r = lq(60, 30, 2);
    expect(r.d).toBe(2);
    expect(r.BED).toBe(120);
    expect(r.EQD2).toBe(60);
  });
  it('W2: 30 Gy / 10 fx, α/β 2 → BED 75, EQD2 37.5', () => {
    expect(bed(30, 10, 2)).toBe(75);
    expect(eqd2FromBed(75, 2)).toBe(37.5);
  });
  it('W3: same schedule, α/β 3 → BED 60, EQD2 36', () => {
    expect(bed(30, 10, 3)).toBeCloseTo(60, 12);
    expect(lq(30, 10, 3).EQD2).toBeCloseTo(36, 12);
  });
  it('W5: physical ceiling for 40 Gy EQD2 headroom over 10 fx at α/β 2 = 10(√17 − 1)', () => {
    const D = physicalDoseForBed(bedFromEqd2(40, 2), 10, 2);
    expect(D).toBeCloseTo(10 * (Math.sqrt(17) - 1), 10);
    expect(D).toBeCloseTo(31.231056, 5);
    expect(lq(D, 10, 2).EQD2).toBeCloseTo(40, 10); // round trip
  });
  it('inverse returns 0 for non-positive BED and round-trips for many inputs', () => {
    expect(physicalDoseForBed(0, 5, 2)).toBe(0);
    expect(physicalDoseForBed(-3, 5, 2)).toBe(0);
    for (const [D, n, ab] of [[1, 1, 2], [24, 3, 2], [70, 35, 3], [45, 15, 10]] as const) {
      expect(physicalDoseForBed(bed(D, n, ab), n, ab)).toBeCloseTo(D, 9);
    }
  });
  it('rejects invalid inputs', () => {
    expect(() => bed(-1, 10, 2)).toThrow();
    expect(() => bed(10, 0, 2)).toThrow();
    expect(() => bed(10, 5, 0)).toThrow();
  });
});
