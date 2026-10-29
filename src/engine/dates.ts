// Date handling. All dates are ISO "YYYY-MM-DD" interpreted as UTC calendar dates.

export const DAYS_PER_MONTH = 30.4375; // 365.25 / 12

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse YYYY-MM-DD to a UTC day number; null for missing or invalid dates (e.g. 2023-02-30). */
export function parseIsoDate(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = ISO.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return t / 86_400_000;
}

/** Whole days from `from` to `to` (positive when `to` is later). Null if either is missing/invalid. */
export function daysBetween(from: string | null, to: string | null): number | null {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  if (a === null || b === null) return null;
  return b - a;
}

export function daysToMonths(days: number): number {
  return days / DAYS_PER_MONTH;
}

/** Latest valid date in a list; null if any entry is missing (we never guess a course end). */
export function latestDate(dates: (string | null)[]): string | null {
  let best: string | null = null;
  let bestT = -Infinity;
  for (const s of dates) {
    const t = parseIsoDate(s);
    if (t === null) return null;
    if (t > bestT) {
      bestT = t;
      best = s;
    }
  }
  return best;
}
