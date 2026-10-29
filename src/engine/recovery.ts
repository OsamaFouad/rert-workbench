// Recovery (time-dependent repair) models. A model is only offered when every guard passes.
// No default or universal recovery is ever applied.

import type { Constraint, RecoveryModel } from './types';

export interface RecoveryCourseInput {
  courseId: string;
  intervalMonths: number | null;
}

export interface RecoveryDecision {
  applicable: boolean;
  model: RecoveryModel | null;
  /** Why it is not applicable (shown to the user). */
  reason: string;
  /** Retained fraction per prior course, when applicable. */
  factors: Record<string, number>;
}

export function retainedFraction(model: RecoveryModel, intervalMonths: number): number | null {
  for (const band of model.factorTable) {
    const aboveMin = intervalMonths >= band.intervalMonthsMin;
    const belowMax = band.intervalMonthsMax === null || intervalMonths < band.intervalMonthsMax;
    if (aboveMin && belowMax) return band.retainedFraction;
  }
  return null;
}

export function decideRecovery(
  models: RecoveryModel[],
  organKey: string,
  constraint: Constraint,
  courses: RecoveryCourseInput[],
  quantity: 'EQD2' | 'BED',
): RecoveryDecision {
  const none = (reason: string): RecoveryDecision => ({ applicable: false, model: null, reason, factors: {} });

  if (constraint.recoveryIncludedInLimit === true) {
    return none('The selected limit already allows for recovery; applying a recovery discount would double-count it.');
  }
  const candidates = models.filter(
    (m) =>
      m.enabled &&
      m.organKeys.includes(organKey) &&
      m.appliesTo === quantity &&
      m.pairedSourceKeys.includes(constraint.sourceKey) &&
      (m.extractionStatus === 'verified-fulltext' || (m.isTestFixture === true && constraint.isTestFixture === true)),
  );
  if (candidates.length === 0) {
    return none(
      `No documented recovery model paired with this reference for ${organKey}. Recovery models from other sources are not combined with this limit.`,
    );
  }
  const model = candidates[0];
  if (courses.length > model.maxPriorCourses) {
    return none(
      `Recovery model ${model.id} was described for at most ${model.maxPriorCourses} prior course(s); ` +
        `this case has ${courses.length}. Extending it is not supported.`,
    );
  }
  const factors: Record<string, number> = {};
  for (const c of courses) {
    if (c.intervalMonths === null) return none('Interval to the proposed course is unknown for at least one prior course.');
    const f = retainedFraction(model, c.intervalMonths);
    if (f === null) {
      return none(`Interval ${c.intervalMonths.toFixed(1)} months is outside the range covered by model ${model.id}.`);
    }
    factors[c.courseId] = f;
  }
  return { applicable: true, model, reason: '', factors };
}
