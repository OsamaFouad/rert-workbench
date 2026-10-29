// Deterministic evaluation of one OAR against one reference constraint.
// Full precision throughout; rounding happens only in UI formatters.

import { daysBetween, daysToMonths, latestDate } from './dates';
import { bedFromEqd2, lq, physicalDoseForBed } from './lq';
import { canonicalMetric, metricClass, sameMetric } from './metrics';
import { decideRecovery } from './recovery';
import type {
  Constraint,
  DoseEntry,
  DoseQuantity,
  Inequality,
  Modality,
  Oar,
  RecoveryModel,
  ReviewCase,
  Status,
} from './types';

export type ReasonLevel = 'insufficient' | 'review' | 'info';

export type ReasonCode =
  | 'test-fixture'
  | 'constraint-not-available'
  | 'alpha-beta-missing'
  | 'population-outside-scope'
  | 'structure-prv-mismatch'
  | 'observed-association'
  | 'volume-metric'
  | 'mean-biological'
  | 'unknown-metric'
  | 'scope-unspecified'
  | 'lower-bound-constraint'
  | 'missing-prior-dose'
  | 'incompatible-metric'
  | 'non-gy-unit'
  | 'missing-fractionation'
  | 'unsupported-modality'
  | 'physical-sum'
  | 'non-near-max-summation'
  | 'summation-basis-not-documented'
  | 'conservative-summation'
  | 'missing-dates'
  | 'invalid-interval'
  | 'interval-condition-not-met'
  | 'missing-proposed-dose'
  | 'missing-proposed-fractions'
  | 'recovery-not-applied'
  | 'recovery-applied'
  | 'recovery-in-limit'
  | 'existing-exceedance'
  | 'source-condition'
  | 'alternative-criterion'
  | 'source-defined-physical-sum'
  | 'no-prior-courses';

export interface Reason {
  code: ReasonCode;
  level: ReasonLevel;
  message: string;
}

export interface PhaseCalc {
  courseId: string;
  phaseId: string;
  label: string;
  modality: Modality;
  D: number;
  n: number;
  d: number;
  BED: number | null;
  EQD2: number | null;
  /** Value in the constraint's dose quantity (EQD2, BED or physical Gy). */
  value: number;
}

export interface CourseCalc {
  courseId: string;
  label: string;
  endDate: string | null;
  intervalDays: number | null;
  intervalMonths: number | null;
  phases: PhaseCalc[];
  /** Sum of phase values in the constraint quantity; null if any phase is not calculable. */
  unadjusted: number | null;
  retainedFraction: number | null;
  adjusted: number | null;
}

export interface CheckResult {
  key: string;
  oarId: string;
  constraintId: string;
  sourceKey: string;
  status: Status;
  reasons: Reason[];
  quantity: DoseQuantity;
  alphaBeta: number | null;
  metric: string;
  inequality: Inequality | 'unspecified';
  threshold: number | null;
  courses: CourseCalc[];
  priorUnadjusted: number | null;
  priorAdjusted: number | null;
  recovery: { applicable: boolean; modelId: string | null; sourceKey: string | null; reason: string };
  proposed: PhaseCalc | null;
  cumulativeUnadjusted: number | null;
  cumulativeAdjusted: number | null;
  basisUsed: 'unadjusted' | 'recovery-adjusted';
  evaluatedValue: number | null;
  headroomUnadjusted: number | null;
  headroomAdjusted: number | null;
  /** Physical dose ceiling for the proposed fraction count, for the same metric. Conditional on all assumptions. */
  physicalCeiling: { fractions: number; doseGy: number; basis: 'unadjusted' | 'recovery-adjusted' } | null;
  /** threshold − evaluatedValue (positive = below an upper limit). */
  margin: number | null;
  existingExceedance: boolean;
  assumptions: string[];
}

const SUPPORTED_MODALITIES: Modality[] = ['photon', 'electron'];

export function intervalInBand(months: number, k: Pick<Constraint, 'minIntervalMonths' | 'maxIntervalMonths'>): boolean {
  if (k.minIntervalMonths !== null && months < k.minIntervalMonths) return false;
  if (k.maxIntervalMonths !== null && months >= k.maxIntervalMonths) return false;
  return true;
}

/** Interval band check on the most recent prior course (smallest interval). */
export function intervalApplicability(c: ReviewCase, k: Constraint): 'in' | 'out' | 'unknown' | 'none' {
  if (k.minIntervalMonths === null && k.maxIntervalMonths === null) return 'none';
  if (c.courses.length === 0) return 'unknown';
  let best: number | null = null;
  for (const course of c.courses) {
    const days = daysBetween(latestDate(course.phases.map((p) => p.endDate)), c.proposed.plannedStartDate);
    if (days === null) return 'unknown';
    const m = daysToMonths(days);
    if (best === null || m < best) best = m;
  }
  return intervalInBand(best!, k) ? 'in' : 'out';
}

export function bandText(k: Pick<Constraint, 'minIntervalMonths' | 'maxIntervalMonths'>): string {
  const lo = k.minIntervalMonths !== null ? `≥ ${k.minIntervalMonths}` : '';
  const hi = k.maxIntervalMonths !== null ? `< ${k.maxIntervalMonths}` : '';
  return `${[lo, hi].filter(Boolean).join(' and ')} months`;
}

export function satisfies(value: number, op: Inequality, threshold: number): boolean {
  switch (op) {
    case '<':
      return value < threshold;
    case '<=':
      return value <= threshold;
    case '>':
      return value > threshold;
    case '>=':
      return value >= threshold;
  }
}

function isUpperBound(op: Inequality | 'unspecified'): op is '<' | '<=' {
  return op === '<' || op === '<=';
}

interface EntryLookup {
  entry: DoseEntry | null;
  otherMetrics: string[];
}

function findEntry(doses: DoseEntry[], oarId: string, metric: string): EntryLookup {
  const forOar = doses.filter((e) => e.oarId === oarId);
  const entry = forOar.find((e) => sameMetric(e.metric, metric) && e.value !== null) ?? null;
  const otherMetrics = forOar.filter((e) => !sameMetric(e.metric, metric) && e.value !== null).map((e) => canonicalMetric(e.metric));
  return { entry, otherMetrics };
}

export function evaluateCheck(c: ReviewCase, oar: Oar, k: Constraint, models: RecoveryModel[]): CheckResult {
  const reasons: Reason[] = [];
  const assumptions: string[] = [];
  const add = (level: ReasonLevel, code: ReasonCode, message: string) => reasons.push({ level, code, message });

  const result: CheckResult = {
    key: `${oar.id}::${k.id}`,
    oarId: oar.id,
    constraintId: k.id,
    sourceKey: k.sourceKey,
    status: 'insufficient',
    reasons,
    quantity: k.doseQuantity,
    alphaBeta: k.alphaBeta,
    metric: canonicalMetric(k.metric),
    inequality: k.inequality,
    threshold: k.threshold,
    courses: [],
    priorUnadjusted: null,
    priorAdjusted: null,
    recovery: { applicable: false, modelId: null, sourceKey: null, reason: '' },
    proposed: null,
    cumulativeUnadjusted: null,
    cumulativeAdjusted: null,
    basisUsed: 'unadjusted',
    evaluatedValue: null,
    headroomUnadjusted: null,
    headroomAdjusted: null,
    physicalCeiling: null,
    margin: null,
    existingExceedance: false,
    assumptions,
  };

  if (k.isTestFixture) add('info', 'test-fixture', 'Synthetic software test fixture. Not a literature value.');

  // ---- Applicability of the reference to this case ----
  if (!k.diseaseScope.includes('any') && !k.diseaseScope.some((d) => c.disease.diseaseKeys.includes(d))) {
    add(
      'review',
      'population-outside-scope',
      `Reference population (${k.diseaseScope.join(', ')}) does not match the case disease context (${c.disease.diseaseKeys.join(', ') || 'not set'}).`,
    );
  }
  if (k.structureOrPRV !== 'unspecified' && k.structureOrPRV !== oar.designation) {
    add(
      'insufficient',
      'structure-prv-mismatch',
      `Reference applies to the ${k.structureOrPRV}; entered data is for the ${oar.designation}. Add the ${k.structureOrPRV} as a separate OAR entry.`,
    );
  }
  if (k.conditionText) add('info', 'source-condition', `Source condition (confirm it applies): ${k.conditionText}`);
  if (k.alternativeGroup) add('info', 'alternative-criterion', 'Either-or criterion in the source: this record is one alternative; the criterion is met if any alternative is met.');
  if (k.category === 'observed-toxicity-association') {
    add('info', 'observed-association', 'This value is an observed toxicity association, not an established tolerance limit.');
  }

  // ---- Is the constraint usable at all? ----
  if (!k.automatedEvaluation || k.threshold === null || k.inequality === 'unspecified') {
    add('insufficient', 'constraint-not-available', 'Numerical value not verified from full text; unavailable for automated evaluation.');
    return finish(result);
  }
  if (k.doseQuantity !== 'physical' && (k.alphaBeta === null || !(k.alphaBeta > 0))) {
    add('insufficient', 'alpha-beta-missing', 'The reference does not state an α/β value; biological dose cannot be computed for it.');
    return finish(result);
  }
  if (!isUpperBound(k.inequality)) {
    add('review', 'lower-bound-constraint', `Inequality "${k.inequality}" is not an upper limit; headroom is not defined.`);
  }
  const mClass = metricClass(k.metric);
  if (mClass === 'volume') {
    add('review', 'volume-metric', 'Volume metrics (Vx) are not summed or reconstructed across courses from isolated DVH entries.');
    return finish(result);
  }
  if (mClass === 'mean' && k.doseQuantity !== 'physical') {
    add('review', 'mean-biological', 'A mean physical dose cannot be converted into a true mean BED/EQD2 with the scalar formula.');
    return finish(result);
  }
  if (mClass === 'unknown') {
    add('review', 'unknown-metric', `Metric "${k.metric}" is not in the supported vocabulary.`);
    return finish(result);
  }

  const cumulative = k.scope === 'cumulative' || k.scope === 'unspecified';
  if (k.scope === 'unspecified') {
    add('review', 'scope-unspecified', 'The source does not state whether the limit is per course or cumulative; shown as cumulative for review only.');
  }

  const quantity = k.doseQuantity;
  const ab = k.alphaBeta ?? 0;
  const metric = canonicalMetric(k.metric);

  const calcPhase = (
    courseId: string,
    phaseId: string,
    label: string,
    doses: DoseEntry[],
    fractions: number | null,
    modality: Modality,
    isProposed: boolean,
  ): PhaseCalc | null => {
    const { entry, otherMetrics } = findEntry(doses, oar.id, metric);
    const where = isProposed ? 'proposed plan' : label;
    if (!entry || entry.value === null || !Number.isFinite(entry.value)) {
      if (otherMetrics.length > 0) {
        add(
          'insufficient',
          'incompatible-metric',
          `${where}: reference requires ${metric}; entered metric(s) ${otherMetrics.join(', ')} are not substituted.`,
        );
      } else if (isProposed) {
        add('insufficient', 'missing-proposed-dose', `Proposed-plan ${metric} not entered.`);
      } else {
        add('insufficient', 'missing-prior-dose', `${where}: ${metric} not entered for ${oar.name}.`);
      }
      return null;
    }
    if (entry.unit !== 'Gy') {
      add('insufficient', 'non-gy-unit', `${where}: dose unit must be Gy.`);
      return null;
    }
    if (entry.value < 0) {
      add('insufficient', 'missing-prior-dose', `${where}: negative dose is invalid.`);
      return null;
    }
    if (fractions === null || !(fractions > 0) || !Number.isInteger(fractions)) {
      add(
        'insufficient',
        isProposed ? 'missing-proposed-fractions' : 'missing-fractionation',
        `${where}: number of fractions missing or invalid.`,
      );
      return null;
    }
    if (!SUPPORTED_MODALITIES.includes(modality)) {
      add(
        'review',
        'unsupported-modality',
        `${where}: modality "${modality}" needs RBE, dose-rate or brachytherapy modelling; the photon LQ model is not applied automatically.`,
      );
    }
    const D = entry.value;
    if (quantity === 'physical') {
      return { courseId, phaseId, label, modality, D, n: fractions, d: D / fractions, BED: null, EQD2: null, value: D };
    }
    const r = lq(D, fractions, ab);
    return {
      courseId,
      phaseId,
      label,
      modality,
      D,
      n: fractions,
      d: r.d,
      BED: r.BED,
      EQD2: r.EQD2,
      value: quantity === 'EQD2' ? r.EQD2 : r.BED,
    };
  };

  // ---- Prior courses (each with its own interval) ----
  let priorOk = true;
  let phaseCount = 0;
  if (cumulative) {
    if (c.courses.length === 0) add('info', 'no-prior-courses', 'No previous courses recorded.');
    for (const course of c.courses) {
      const endDate = latestDate(course.phases.map((p) => p.endDate));
      const intervalDays = daysBetween(endDate, c.proposed.plannedStartDate);
      const intervalMonths = intervalDays === null ? null : daysToMonths(intervalDays);
      const phases: PhaseCalc[] = [];
      let courseOk = course.phases.length > 0;
      if (course.phases.length === 0) add('insufficient', 'missing-prior-dose', `${course.label}: no phases recorded.`);
      for (const p of course.phases) {
        const pc = calcPhase(course.id, p.id, `${course.label} / ${p.label}`, p.doses, p.fractions, p.modality, false);
        if (pc) phases.push(pc);
        else courseOk = false;
      }
      phaseCount += course.phases.length;
      if (intervalDays === null) {
        if (k.minIntervalMonths !== null || k.maxIntervalMonths !== null) {
          add('insufficient', 'missing-dates', `${course.label}: end date or planned start missing; interval condition cannot be checked.`);
        }
      } else if (intervalDays < 0) {
        add('insufficient', 'invalid-interval', `${course.label}: proposed start is before the end of this course.`);
      } else if (k.intervalRole === 'condition' && intervalMonths !== null && !intervalInBand(intervalMonths, k)) {
        add(
          'review',
          'interval-condition-not-met',
          `${course.label}: interval ${intervalMonths.toFixed(1)} months is outside the reference condition (${k.intervalCondition || bandText(k)}).`,
        );
      }
      const unadjusted = courseOk ? phases.reduce((s, p) => s + p.value, 0) : null;
      if (!courseOk) priorOk = false;
      result.courses.push({
        courseId: course.id,
        label: course.label,
        endDate,
        intervalDays,
        intervalMonths,
        phases,
        unadjusted,
        retainedFraction: null,
        adjusted: null,
      });
    }
  }

  // Per-course limits: still record intervals and check interval conditions/bands.
  if (!cumulative) {
    for (const course of c.courses) {
      const endDate = latestDate(course.phases.map((p) => p.endDate));
      const intervalDays = daysBetween(endDate, c.proposed.plannedStartDate);
      const intervalMonths = intervalDays === null ? null : daysToMonths(intervalDays);
      if (intervalDays === null && (k.minIntervalMonths !== null || k.maxIntervalMonths !== null)) {
        add('insufficient', 'missing-dates', `${course.label}: end date or planned start missing; interval condition cannot be checked.`);
      } else if (intervalDays !== null && intervalDays < 0) {
        add('insufficient', 'invalid-interval', `${course.label}: proposed start is before the end of this course.`);
      } else if (k.intervalRole === 'condition' && intervalMonths !== null && !intervalInBand(intervalMonths, k)) {
        add('review', 'interval-condition-not-met', `${course.label}: interval ${intervalMonths.toFixed(1)} months is outside the reference condition (${k.intervalCondition || bandText(k)}).`);
      }
      result.courses.push({ courseId: course.id, label: course.label, endDate, intervalDays, intervalMonths, phases: [], unadjusted: null, retainedFraction: null, adjusted: null });
    }
  }
  if (k.intervalRole === 'applicability' && intervalApplicability(c, k) === 'out') {
    add('review', 'interval-condition-not-met', `This record applies only for an interval of ${bandText(k)} since the most recent course; the case is outside that band.`);
  }

  // ---- Proposed course ----
  const proposed = calcPhase('proposed', 'proposed', 'Proposed course', c.proposed.doses, c.proposed.fractions, c.proposed.modality, true);
  result.proposed = proposed;
  phaseCount += 1;

  // ---- Summation rules ----
  if (cumulative && phaseCount > 1) {
    if (quantity === 'physical' && !k.physicalSumDefinedBySource) {
      add('review', 'physical-sum', 'Physical doses from different schedules are not added; the reference uses physical dose.');
    } else if (mClass !== 'near-max') {
      add('review', 'non-near-max-summation', `${metric} is not a near-maximum metric; it cannot be summed across courses without registered dose accumulation.`);
    } else if (oar.summationBasis === 'not-documented') {
      add(
        'review',
        'summation-basis-not-documented',
        'Spatial correspondence of hotspots is not documented; mark it as documented or as a conservative worst-case assumption to sum.',
      );
    } else {
      if (quantity === 'physical') {
        add('info', 'source-defined-physical-sum', 'The source defines this limit as a simple sum of physical doses across courses (no biological correction).');
      }
      add(
        'info',
        'conservative-summation',
        oar.summationBasis === 'documented-overlap'
          ? 'Near-maximum doses summed with documented spatial correspondence. Not voxel-wise registered accumulation.'
          : 'Conservative estimate: near-maximum doses summed as if co-located. Not spatially registered dose accumulation.',
      );
    }
  }

  assumptions.push(`d = D/n (equal dose per fraction at the evaluated ${metric}).`);
  if (quantity !== 'physical') assumptions.push(`α/β = ${ab} Gy (${k.alphaBetaSource || 'as stated by the reference'}), kept fixed for this scenario.`);
  assumptions.push('Each phase is converted separately before biological doses are combined.');
  assumptions.push('Target prescription dose is never used as OAR dose.');

  // ---- Prior totals and recovery ----
  if (cumulative && priorOk) {
    result.priorUnadjusted = result.courses.reduce((s, cc) => s + (cc.unadjusted ?? 0), 0);
    if (quantity !== 'physical' && result.courses.length > 0) {
      const decision = decideRecovery(
        models,
        oar.organKey,
        k,
        result.courses.map((cc) => ({ courseId: cc.courseId, intervalMonths: cc.intervalMonths })),
        quantity,
      );
      result.recovery = {
        applicable: decision.applicable,
        modelId: decision.model?.id ?? null,
        sourceKey: decision.model?.sourceKey ?? null,
        reason: decision.reason,
      };
      if (decision.applicable) {
        let total = 0;
        for (const cc of result.courses) {
          cc.retainedFraction = decision.factors[cc.courseId];
          cc.adjusted = (cc.unadjusted ?? 0) * cc.retainedFraction;
          total += cc.adjusted;
        }
        result.priorAdjusted = total;
        add('info', 'recovery-applied', `Recovery-adjusted scenario available (model ${decision.model!.id}); applied to prior ${quantity}, not to physical Gy.`);
      } else if (k.recoveryIncludedInLimit === true) {
        add('info', 'recovery-in-limit', decision.reason);
      } else {
        add('info', 'recovery-not-applied', decision.reason);
      }
    }
  } else if (!cumulative) {
    result.priorUnadjusted = 0;
  }

  const useAdjusted = c.statusBasis === 'recovery-adjusted' && result.priorAdjusted !== null;
  result.basisUsed = useAdjusted ? 'recovery-adjusted' : 'unadjusted';
  if (c.statusBasis === 'recovery-adjusted' && !useAdjusted && cumulative && result.courses.length > 0) {
    assumptions.push('Recovery-adjusted basis requested but not supported here; status uses the unadjusted calculation.');
  }
  const priorForStatus = useAdjusted ? result.priorAdjusted : result.priorUnadjusted;

  // ---- Cumulative and headroom ----
  if (result.priorUnadjusted !== null && proposed) {
    result.cumulativeUnadjusted = result.priorUnadjusted + proposed.value;
    if (result.priorAdjusted !== null) result.cumulativeAdjusted = result.priorAdjusted + proposed.value;
  }
  const thr = k.threshold;
  const op = k.inequality;
  if (isUpperBound(op)) {
    if (result.priorUnadjusted !== null) result.headroomUnadjusted = thr - result.priorUnadjusted;
    if (result.priorAdjusted !== null) result.headroomAdjusted = thr - result.priorAdjusted;
    const headroom = useAdjusted ? result.headroomAdjusted : result.headroomUnadjusted;
    if (headroom !== null && priorForStatus !== null) {
      result.existingExceedance = cumulative && result.courses.length > 0 && !satisfies(priorForStatus, op, thr);
      if (result.existingExceedance) {
        add('info', 'existing-exceedance', 'Previous courses alone already reach or exceed the selected limit (headroom ≤ 0 or limit not met).');
      }
      const n = c.proposed.fractions;
      if (n !== null && n > 0 && Number.isInteger(n)) {
        let doseGy: number;
        if (quantity === 'physical') doseGy = Math.max(0, headroom);
        else doseGy = physicalDoseForBed(quantity === 'EQD2' ? bedFromEqd2(headroom, ab) : headroom, n, ab);
        result.physicalCeiling = { fractions: n, doseGy, basis: result.basisUsed };
      }
    }
  }

  result.evaluatedValue =
    proposed && priorForStatus !== null ? (cumulative ? priorForStatus + proposed.value : proposed.value) : null;
  if (result.evaluatedValue !== null && isUpperBound(op)) result.margin = thr - result.evaluatedValue;

  return finish(result);
}

function finish(r: CheckResult): CheckResult {
  const has = (level: ReasonLevel) => r.reasons.some((x) => x.level === level);
  const insufficientCodes = r.reasons.filter((x) => x.level === 'insufficient').map((x) => x.code);
  const onlyProposedMissing =
    insufficientCodes.length > 0 &&
    insufficientCodes.every((code) => code === 'missing-proposed-dose' || code === 'missing-proposed-fractions');

  if (has('insufficient')) {
    // Prior courses alone exceeding an upper limit is a definite exceedance, whatever the proposed dose.
    r.status = r.existingExceedance && onlyProposedMissing && !has('review') ? 'exceeds' : 'insufficient';
    return r;
  }
  if (has('review')) {
    r.status = 'review';
    return r;
  }
  if (r.evaluatedValue === null || r.threshold === null || r.inequality === 'unspecified') {
    r.status = 'insufficient';
    return r;
  }
  r.status = satisfies(r.evaluatedValue, r.inequality, r.threshold) ? 'within' : 'exceeds';
  return r;
}
