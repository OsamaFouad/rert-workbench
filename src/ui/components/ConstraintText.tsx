import type { Constraint } from '../../engine';
import { SOURCE_BY_KEY, sourceLabel } from '../../evidence';
import { ineqText } from '../format';

export function constraintValueText(k: Constraint): string {
  if (k.threshold === null) return 'value not available for automated evaluation';
  const q = k.doseQuantity === 'physical' ? 'Gy (physical)' : `Gy ${k.doseQuantity}${k.alphaBeta ? ` (α/β ${k.alphaBeta})` : ''}`;
  return `${k.metric} ${ineqText[k.inequality]} ${k.threshold} ${q}`;
}

export function SourceLink({ sourceKey, location }: { sourceKey: string; location?: string }) {
  const s = SOURCE_BY_KEY.get(sourceKey);
  const href = s?.doi ? `https://doi.org/${s.doi}` : s?.url;
  return (
    <span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">
          {sourceLabel(sourceKey)}
        </a>
      ) : (
        sourceLabel(sourceKey)
      )}
      {s?.isTestFixture && <span className="tag fixture">TEST FIXTURE</span>}
      {location && <span className="muted small"> · {location}</span>}
    </span>
  );
}

export function ConstraintTags({ k }: { k: Constraint }) {
  return (
    <span>
      <span className="tag">{k.scope}</span>
      <span className="tag">{k.category}</span>
      {!k.diseaseScope.includes('any') && <span className="tag warn">{k.diseaseScope.join(', ')} only</span>}
      {k.structureOrPRV !== 'unspecified' && <span className="tag">{k.structureOrPRV}</span>}
      {k.minIntervalMonths !== null && <span className="tag">interval ≥ {k.minIntervalMonths} mo</span>}
      {k.recoveryIncludedInLimit === true && <span className="tag">recovery included in limit</span>}
      {!k.automatedEvaluation && <span className="tag na">not evaluable</span>}
      {k.isTestFixture && <span className="tag fixture">SOFTWARE TEST FIXTURE</span>}
    </span>
  );
}
