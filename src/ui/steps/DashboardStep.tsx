import { sourceLabel } from '../../evidence';
import { CaseSummary } from '../components/CaseSummary';
import { ResultsTable } from '../components/ResultsTable';
import type { StepProps } from '../pages/CaseWorkflow';
import { useEvaluation } from '../useEvaluation';

const KIND_TEXT: Record<string, string> = {
  threshold: 'different thresholds',
  metric: 'different dose metrics',
  'dose-quantity': 'different dose quantities (EQD2/BED/physical)',
  'alpha-beta': 'different α/β values',
  scope: 'per-course vs cumulative definition',
  recovery: 'different recovery / interval assumptions',
  population: 'different populations',
  category: 'different evidence categories',
  'structure-prv': 'structure vs PRV',
};

export function DashboardStep({ c, update }: StepProps) {
  const ev = useEvaluation(c);
  if (!ev) return null;
  const primary = ev.results.filter((r) => r.sourceKey === c.primarySourceKey);
  const others = ev.results.filter((r) => r.sourceKey !== c.primarySourceKey);
  return (
    <>
      <CaseSummary ev={ev} />
      <div className="row no-print" style={{ marginBottom: '.5rem' }}>
        <label className="field">
          Status basis
          <select value={c.statusBasis} onChange={(e) => update((d) => void (d.statusBasis = e.target.value as typeof c.statusBasis))}>
            <option value="unadjusted">Unadjusted (no recovery discount)</option>
            <option value="recovery-adjusted">Recovery-adjusted where a documented model applies</option>
          </select>
        </label>
        <label className="field">
          Primary reference
          <select value={c.primarySourceKey ?? ''} onChange={(e) => update((d) => void (d.primarySourceKey = e.target.value || null))} data-testid="primary-select">
            {c.selectedSourceKeys.map((k) => (
              <option key={k} value={k}>{sourceLabel(k)}</option>
            ))}
          </select>
        </label>
      </div>
      <h2>Primary reference: {c.primarySourceKey ? sourceLabel(c.primarySourceKey) : 'none selected'}</h2>
      <ResultsTable c={c} results={primary} />
      {others.length > 0 && (
        <>
          <h2>Other selected references</h2>
          <ResultsTable c={c} results={others} />
        </>
      )}
      <div className="card">
        <h2>Reference disagreements</h2>
        {ev.disagreements.length === 0 ? (
          <p className="muted">No differences between selected references for the same OAR.</p>
        ) : (
          <ul className="reasons">
            {ev.disagreements.map((d, i) => (
              <li key={i}>
                <b>{c.oars.find((o) => o.id === d.oarId)?.name}</b>: {sourceLabel(d.a.sourceKey)} ({d.a.status}) vs {sourceLabel(d.b.sourceKey)} ({d.b.status}).
                {' '}Arises from: {d.differences.map((x) => KIND_TEXT[x.kind]).join(', ') || 'input data only'}.
                <div className="small muted">{d.differences.map((x) => x.detail).join(' · ')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
