import { CONSTRAINT_BY_ID, sourceLabel } from '../../evidence';
import { CaseSummary } from '../components/CaseSummary';
import { DoseGrid } from '../components/DoseGrid';
import { Field, NumInput } from '../components/Inputs';
import { ResultsTable } from '../components/ResultsTable';
import type { StepProps } from '../pages/CaseWorkflow';
import { useEvaluation } from '../useEvaluation';

export function ProposedStep({ c, update }: StepProps) {
  const ev = useEvaluation(c);
  const hasPrior = (oarId: string) => c.courses.some((co) => co.phases.some((p) => p.doses.some((d) => d.oarId === oarId && d.value !== null)));
  const withPrior = c.oars.filter((o) => hasPrior(o.id));
  const withoutPrior = c.oars.filter((o) => !hasPrior(o.id));
  // Calculated headroom (physical dose ceiling for the proposed fractions) per OAR and metric, from each selected reference.
  const ceilingsFor = (oarId: string) => {
    const out: Record<string, { label: string; doseGy: number; fractions: number }[]> = {};
    for (const r of ev?.results ?? []) {
      if (r.oarId !== oarId || !r.physicalCeiling) continue;
      const k = CONSTRAINT_BY_ID.get(r.constraintId);
      const label = `${sourceLabel(r.sourceKey)}${k && k.scope !== 'cumulative' ? ' (this course only)' : ''}`;
      (out[r.metric] ??= []).push({ label, doseGy: r.physicalCeiling.doseGy, fractions: r.physicalCeiling.fractions });
    }
    return out;
  };
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
      <h2>New-plan OAR doses</h2>
      <div className="callout">
        Enter the dose each OAR receives from the <b>new (proposed) plan</b> in the highlighted column. These boxes start empty because
        step 3 (OAR Data) holds the <b>previous</b> courses only; those values are shown here, read-only, for reference. The tool adds the two.
        <br />
        These numbers come from the new plan's DVH in your planning system; the tool cannot invent them. Under each box, “≤ X Gy” is the
        <b> calculated headroom under selected assumptions</b>: the largest physical dose to that metric, in the planned number of fractions,
        that stays within each selected reference. It is not a prescribed or guaranteed-safe dose.
      </div>
      <div className="grid2">
        {withPrior.map((o) => (
          <div className="card" key={o.id}>
            <b>{o.name}</b> <span className="muted small">({o.designation})</span>
            <DoseGrid c={c} oar={o} update={update} columns="proposed" ceilings={ceilingsFor(o.id)} />
          </div>
        ))}
      </div>
      {withoutPrior.length > 0 && (
        <details className="card">
          <summary>
            {withoutPrior.length} OAR(s) with no previous dose entered ({withoutPrior.map((o) => o.name).join(', ')})
          </summary>
          <div className="grid2" style={{ marginTop: '.6rem' }}>
            {withoutPrior.map((o) => (
              <div className="card" key={o.id}>
                <b>{o.name}</b> <span className="muted small">({o.designation})</span>
                <DoseGrid c={c} oar={o} update={update} columns="proposed" ceilings={ceilingsFor(o.id)} />
              </div>
            ))}
          </div>
        </details>
      )}
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
