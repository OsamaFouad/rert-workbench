import { useMemo } from 'react';
import { evaluateCase, findDisagreements, type ReviewCase } from '../engine';
import { CONSTRAINT_BY_ID, EVIDENCE } from '../evidence';

export function useEvaluation(c: ReviewCase | undefined) {
  return useMemo(() => {
    if (!c) return null;
    const evaluation = evaluateCase(c, EVIDENCE);
    const disagreements = findDisagreements(evaluation.results, CONSTRAINT_BY_ID);
    return { ...evaluation, disagreements };
  }, [c]);
}
