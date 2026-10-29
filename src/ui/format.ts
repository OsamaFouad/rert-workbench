// Display formatting only. Never feed these strings back into calculations.

export function fmt(v: number | null | undefined, dp = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return v.toFixed(dp);
}

export function fmtGy(v: number | null | undefined, dp = 2): string {
  return v === null || v === undefined ? '—' : `${fmt(v, dp)} Gy`;
}

export function fmtSigned(v: number | null | undefined, dp = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return (v > 0 ? '+' : '') + v.toFixed(dp);
}

export const ineqText: Record<string, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', unspecified: '?' };
