import { CaseSummary } from '../components/CaseSummary';
import { DoseGrid } from '../components/DoseGrid';
import { Field, NumInput } from '../components/Inputs';
import { ResultsTable } from '../components/ResultsTable';
import type { StepProps } from '../pages/CaseWorkflow';
import { useEvaluation } from '../useEvaluation';

export function ProposedStep({ c, update }: StepProps) {
  const ev = useEvaluation(c);
  return (
    <>
      <div className="card row">
        <Field label="Planned start date">
          <input type="date" value={c.proposed.plannedStartDate ?? ''} onChange={(e) => update((d) => void (d.proposed.plannedStartDate = e.target.value || null))} />
        </Field>
        <Field label="Number of fractions">
          <NumInput value={c.proposed.fractions} step="1" min={1} onChange={(v) => update((d) => void (d.proposed.fractions = v))} label="Proposed fractions" />
        </Field>
        <Field label="Status basis">
          <select value={c.statusBasis} onChange={(e) => update((d) => void (d.statusBasis = e.target.value as typeof c.statusBasis))}>
            <option value="unadjusted">Unadjusted (no recovery discount)</option>
            <option value="recovery-adjusted">Recovery-adjusted where a documented model applies</option>
          </select>
        </Field>
      </div>
      <h2>Proposed-plan OAR doses</h2>
      <div className="grid2">
        {c.oars.map((o) => (
          <div className="card" key={o.id}>
            <b>{o.name}</b> <span className="muted small">({o.designation})</span>
            <DoseGrid c={c} oar={o} update={update} columns="proposed" />
          </div>
        ))}
      </div>
      <h2>Live results</h2>
      {ev && (
        <>
          <CaseSummary ev={ev} />
          <ResultsTable c={c} results={ev.results} expandable={false} />
        </>
      )}
    </>
  );
}
