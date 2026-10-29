// Metric vocabulary. Metrics are compared by exact canonical string: Dmax, D0.03cc, D0.1cc, D1cc are NOT interchangeable.

export type MetricClass = 'near-max' | 'dose-volume' | 'mean' | 'volume' | 'unknown';

const DCC = /^D(\d+(?:\.\d+)?)cc$/;
const DPCT = /^D(\d+(?:\.\d+)?)%$/;
const VX = /^V(\d+(?:\.\d+)?)Gy$/;

/** Normalise user input: trims, removes spaces, unifies "cm3"/"cm³" → "cc", "max" → "Dmax". */
export function canonicalMetric(raw: string): string {
  let s = raw.trim().replace(/\s+/g, '').replace(/cm3|cm³|ml|mL/g, 'cc');
  if (/^d?max$/i.test(s)) return 'Dmax';
  if (/^d?mean$/i.test(s)) return 'Dmean';
  if (/^d/.test(s)) s = 'D' + s.slice(1);
  if (/^v/.test(s)) s = 'V' + s.slice(1);
  s = s.replace(/gy$/i, 'Gy');
  return s;
}

/**
 * Near-maximum metrics: Dmax, Dxcc with x <= 1 cc, Dx% with x <= 2 %.
 * Only these may be summed across phases/courses as a conservative estimate (worst-case co-location).
 */
export function metricClass(metric: string): MetricClass {
  const m = canonicalMetric(metric);
  if (m === 'Dmax') return 'near-max';
  if (m === 'Dmean') return 'mean';
  const cc = DCC.exec(m);
  if (cc) return Number(cc[1]) <= 1 ? 'near-max' : 'dose-volume';
  const pct = DPCT.exec(m);
  if (pct) return Number(pct[1]) <= 2 ? 'near-max' : 'dose-volume';
  if (VX.test(m)) return 'volume';
  return 'unknown';
}

export function sameMetric(a: string, b: string): boolean {
  return canonicalMetric(a) === canonicalMetric(b);
}

export const COMMON_METRICS = ['Dmax', 'D0.03cc', 'D0.1cc', 'D0.5cc', 'D1cc', 'D2cc', 'D2%', 'Dmean'];
