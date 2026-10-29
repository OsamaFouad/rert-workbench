import { describe, expect, it } from 'vitest';
import { canonicalMetric, daysBetween, daysToMonths, latestDate, metricClass, parseIsoDate, sameMetric } from '../../src/engine';

describe('dates (W8)', () => {
  it('counts the leap day: 2020-02-28 → 2021-02-28 is 366 days', () => {
    expect(daysBetween('2020-02-28', '2021-02-28')).toBe(366);
    expect(daysToMonths(366)).toBeCloseTo(12.0246, 4);
  });
  it('non-leap year is 365 days', () => {
    expect(daysBetween('2021-03-01', '2022-03-01')).toBe(365);
  });
  it('rejects invalid and missing dates', () => {
    expect(parseIsoDate('2023-02-30')).toBeNull();
    expect(parseIsoDate('2023/02/01')).toBeNull();
    expect(daysBetween(null, '2023-01-01')).toBeNull();
  });
  it('latestDate returns null if any phase end date is missing (no guessing)', () => {
    expect(latestDate(['2020-01-10', '2020-03-01'])).toBe('2020-03-01');
    expect(latestDate(['2020-01-10', null])).toBeNull();
  });
  it('negative intervals are reported, not clipped', () => {
    expect(daysBetween('2024-05-10', '2024-05-01')).toBe(-9);
  });
});

describe('metrics', () => {
  it('canonicalises spelling but never merges different metrics', () => {
    expect(canonicalMetric('d0.03 cm3')).toBe('D0.03cc');
    expect(canonicalMetric('max')).toBe('Dmax');
    expect(sameMetric('Dmax', 'D0.03cc')).toBe(false);
    expect(sameMetric('D0.1cc', 'D0.03cc')).toBe(false);
    expect(sameMetric('D1 cc', 'D1cc')).toBe(true);
  });
  it('classifies metrics', () => {
    expect(metricClass('Dmax')).toBe('near-max');
    expect(metricClass('D0.03cc')).toBe('near-max');
    expect(metricClass('D1cc')).toBe('near-max');
    expect(metricClass('D2cc')).toBe('dose-volume');
    expect(metricClass('D2%')).toBe('near-max');
    expect(metricClass('Dmean')).toBe('mean');
    expect(metricClass('V20Gy')).toBe('volume');
    expect(metricClass('foo')).toBe('unknown');
  });
});
