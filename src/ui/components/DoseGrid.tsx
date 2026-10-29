import { useState } from 'react';
import { canonicalMetric, type DoseEntry, type Oar, type ReviewCase } from '../../engine';
import { upsertDose } from '../../domain/factory';
import { pathwayByKey } from '../../domain/templates';
import { referenceMetrics } from '../maxHint';
import { NumInput } from './Inputs';

/** Metric rows × phase columns for one OAR. `columns` decides whether prior phases, the proposed plan, or both are editable. */
export function DoseGrid({
  c,
  oar,
  update,
  columns,
  ceilings,
}: {
  c: ReviewCase;
  oar: Oar;
  update: (fn: (d: ReviewCase) => void) => void;
  columns: 'prior' | 'proposed' | 'all';
  /** Calculated headroom per metric (shown under the new-plan input; never filled in automatically). */
  ceilings?: Record<string, { label: string; doseGy: number; fractions: number }[]>;
}) {
  const [newMetric, setNewMetric] = useState('');
  const all: DoseEntry[] = [...c.courses.flatMap((co) => co.phases.flatMap((p) => p.doses)), ...c.proposed.doses].filter((d) => d.oarId === oar.id);
  const defaultMetric = pathwayByKey(c.pathway)?.oars.find((t) => t.organKey === oar.organKey)?.defaultMetric;
  // Rows: metrics the selected references use (so the user knows what to enter) + metrics already entered.
  // The template default is only a fallback when neither exists.
  const needed = referenceMetrics(c, oar);
  const enteredMetrics = all.map((d) => d.metric);
  const fallback = needed.length === 0 && enteredMetrics.length === 0 && defaultMetric ? [defaultMetric] : [];
  const metrics = Array.from(new Set([...needed, ...enteredMetrics, ...fallback]));
  const removeMetric = (m: string) => {
    if (!confirm(`Remove the ${m} row for ${oar.name}? Its values are deleted from all previous courses and the new plan.`)) return;
    update((d) => {
      d.courses.forEach((co) => co.phases.forEach((p) => (p.doses = p.doses.filter((x) => !(x.oarId === oar.id && x.metric === m)))));
      d.proposed.doses = d.proposed.doses.filter((x) => !(x.oarId === oar.id && x.metric === m));
    });
  };
  // Previous-course columns are always shown; on the Proposed Plan step they are read-only context.
  const showPrior = true;
  const priorEditable = columns !== 'proposed';
  const showProposed = columns !== 'prior';
  const unitFor = (m: string): DoseEntry['unit'] => (/^V/.test(m) ? '%' : 'Gy');
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            {showPrior &&
              c.courses.flatMap((co) =>
                co.phases.map((p) => (
                  <th key={p.id} className="num">
                    {priorEditable ? '' : 'Previous: '}
                    {co.label} / {p.label}
                    <div className="muted small">
                      {p.fractions ? `${p.fractions} fx` : 'fx missing'}
                      {priorEditable ? '' : ' · from OAR Data'}
                    </div>
                  </th>
                )),
              )}
            {showProposed && (
              <th className="num new-plan">
                New plan dose (enter)
                <div className="muted small">{c.proposed.fractions ? `${c.proposed.fractions} fx` : 'fx missing'}</div>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m}>
              <td className="mono">
                {m} <span className="muted">({unitFor(m)})</span>
                {needed.includes(m) && <div className="tag ok" title="A selected reference sets a limit on this metric">used by reference</div>}
                {priorEditable && enteredMetrics.includes(m) && (
                  <div>
                    <button className="link small" aria-label={`Remove ${m} row for ${oar.name}`} onClick={() => removeMetric(m)}>
                      remove row
                    </button>
                  </div>
                )}
              </td>
              {showPrior &&
                c.courses.flatMap((co, ci) =>
                  co.phases.map((p, pi) => (
                    <td key={p.id} className="num">
                      {!priorEditable ? (
                        <span className="muted">{p.doses.find((d) => d.oarId === oar.id && d.metric === m)?.value ?? '—'}</span>
                      ) : (
                      <NumInput
                        label={`${oar.name} ${m} ${co.label} ${p.label}`}
                        value={p.doses.find((d) => d.oarId === oar.id && d.metric === m)?.value ?? null}
                        onChange={(v) => update((d) => void (d.courses[ci].phases[pi].doses = upsertDose(d.courses[ci].phases[pi].doses, oar.id, m, v, unitFor(m))))}
                      />
                      )}
                    </td>
                  )),
                )}
              {showProposed && (
                <td className="num new-plan">
                  <NumInput
                    label={`${oar.name} ${m} proposed`}
                    value={c.proposed.doses.find((d) => d.oarId === oar.id && d.metric === m)?.value ?? null}
                    onChange={(v) => update((d) => void (d.proposed.doses = upsertDose(d.proposed.doses, oar.id, m, v, unitFor(m))))}
                  />
                  {ceilings?.[m]?.length ? (
                    <div className="small muted ceiling" data-testid={`ceiling-${oar.id}-${m}`} title="Calculated headroom under selected assumptions — not a prescribed or guaranteed-safe dose">
                      {ceilings[m].map((x) => (
                        <div key={x.label}>
                          {x.doseGy > 0 ? `≤ ${x.doseGy.toFixed(2)} Gy` : 'no headroom'} · {x.label}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row small" style={{ marginTop: '.3rem' }}>
        <input
          placeholder="Add metric, e.g. Dmax, D0.03cc, D1cc, Dmean, V20Gy"
          value={newMetric}
          onChange={(e) => setNewMetric(e.target.value)}
          aria-label={`Add metric for ${oar.name}`}
          style={{ width: '22rem' }}
        />
        <button
          disabled={!newMetric.trim()}
          onClick={() => {
            const m = canonicalMetric(newMetric);
            // Adding a metric row with no values: store an empty-valued marker on the proposed plan is avoided; use a placeholder entry in the first phase.
            update((d) => {
              const target = d.courses[0]?.phases[0];
              if (target && !target.doses.some((x) => x.oarId === oar.id && x.metric === m)) {
                target.doses.push({ id: `d-${Math.random().toString(36).slice(2, 9)}`, oarId: oar.id, metric: m, value: null, unit: unitFor(m) });
              } else if (!target && !d.proposed.doses.some((x) => x.oarId === oar.id && x.metric === m)) {
                d.proposed.doses.push({ id: `d-${Math.random().toString(36).slice(2, 9)}`, oarId: oar.id, metric: m, value: null, unit: unitFor(m) });
              }
            });
            setNewMetric('');
          }}
        >
          + Metric row
        </button>
        <span className="muted">Metrics are never substituted for each other (Dmax ≠ D0.03cc ≠ D0.1cc).</span>
      </div>
    </div>
  );
}
