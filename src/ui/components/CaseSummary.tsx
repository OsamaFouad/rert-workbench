import type { CaseEvaluation, Status } from '../../engine';
import { NOT_CLEARANCE, STATUS_TEXT, StatusBadge } from './Status';

export function CaseSummary({ ev }: { ev: CaseEvaluation }) {
  return (
    <div className="card" data-testid="case-summary">
      <div className="summary-tile">
        <div>
          <div className="muted small">Whole-case result (selected checks)</div>
          <StatusBadge status={ev.overall} />
        </div>
        <div>
          <div className="muted small">Coverage</div>
          <div className="big" data-testid="coverage">{ev.coverageText}</div>
        </div>
        {(Object.keys(ev.counts) as Status[]).map((s) => (
          <div key={s}>
            <div className="muted small">{STATUS_TEXT[s]}</div>
            <div className="big">{ev.counts[s]}</div>
          </div>
        ))}
      </div>
      {ev.overall !== 'within' && ev.required > 0 && ev.counts.exceeds === 0 && (
        <p className="small">The case cannot show an all-green result while any selected check is not evaluable or needs review.</p>
      )}
      <p className="small muted">{NOT_CLEARANCE}</p>
      {ev.uncoveredOars.length > 0 && (
        <p className="small">
          <b>OARs without any constraint in the selected references:</b> {ev.uncoveredOars.map((o) => o.name).join(', ')}.
        </p>
      )}
    </div>
  );
}
