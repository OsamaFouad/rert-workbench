// Linear-quadratic conversions for equal-fraction schedules.
// D = physical dose at the evaluated point/metric (Gy), n = fractions, d = D/n (equal-contribution assumption).

export interface LqResult {
  D: number;
  n: number;
  d: number;
  alphaBeta: number;
  BED: number;
  EQD2: number;
}

function assertPositive(name: string, v: number) {
  if (!Number.isFinite(v) || v <= 0) throw new RangeError(`${name} must be a positive finite number, got ${v}`);
}

/** BED = D × (1 + d/(α/β)) */
export function bed(D: number, n: number, alphaBeta: number): number {
  if (!Number.isFinite(D) || D < 0) throw new RangeError(`D must be >= 0, got ${D}`);
  assertPositive('n', n);
  assertPositive('alphaBeta', alphaBeta);
  const d = D / n;
  return D * (1 + d / alphaBeta);
}

/** EQD2 = BED / (1 + 2/(α/β)) */
export function eqd2FromBed(BED: number, alphaBeta: number): number {
  assertPositive('alphaBeta', alphaBeta);
  return BED / (1 + 2 / alphaBeta);
}

export function bedFromEqd2(EQD2: number, alphaBeta: number): number {
  assertPositive('alphaBeta', alphaBeta);
  return EQD2 * (1 + 2 / alphaBeta);
}

export function lq(D: number, n: number, alphaBeta: number): LqResult {
  const BED = bed(D, n, alphaBeta);
  return { D, n, d: D / n, alphaBeta, BED, EQD2: eqd2FromBed(BED, alphaBeta) };
}

/**
 * Inverse of BED(D) for a fixed n: the physical dose D such that D(1 + D/(n·α/β)) = targetBED.
 * Solves D²/(n·αβ) + D − BED = 0 → D = (n·αβ/2)(√(1 + 4·BED/(n·αβ)) − 1).
 * Returns 0 when targetBED <= 0.
 */
export function physicalDoseForBed(targetBED: number, n: number, alphaBeta: number): number {
  assertPositive('n', n);
  assertPositive('alphaBeta', alphaBeta);
  if (targetBED <= 0) return 0;
  const k = n * alphaBeta;
  return (k / 2) * (Math.sqrt(1 + (4 * targetBED) / k) - 1);
}
