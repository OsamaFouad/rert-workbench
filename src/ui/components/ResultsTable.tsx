import { Fragment } from 'react';
import type { CheckResult, ReviewCase } from '../../engine';
import { CONSTRAINT_BY_ID } from '../../evidence';
import { fmt, fmtSigned } from '../format';
import { CalcDetail } from './CalcDetail';
import { ConstraintTags, SourceLink, constraintValueText } from './ConstraintText';
import { StatusBadge } from './Status';

export function ResultsTable({ c, results, expandable = true, printMode = false }: { c: ReviewCase; results: CheckResult[]; expandable?: boolean; printMode?: boolean }) {
  if (results.length === 0) return <p className="muted">No checks for the selected references.</p>;
  return (
    <div className="table-wrap">
      <table data-testid="results-table">
        <thead>
          <tr>
            <th>OAR</th>
            <th style={{ minWidth: 200 }}>Reference constraint &amp; conditions</th>
            <th>Previous physical dose (metric, fx)</th>
            <th className="num">Prior BED</th>
            <th className="num">Prior EQD2 / quantity</th>
            <th className="num">Recovery-adjusted prior</th>
            <th className="num">Remaining headroom</th>
            <th className="num">Proposed contribution</th>
            <th className="num">Cumulative estimate</th>
            <th className="num">Margin to limit</th>
            <th>Status</th>
            <th>Missing information / flags</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const k = CONSTRAINT_BY_ID.get(r.constraintId)!;
            const oar = c.oars.find((o) => o.id === r.oarId)!;
            const phases = r.courses.flatMap((cc) => cc.phases);
            const priorBed = r.quantity === 'physical' || phases.length === 0 ? null : phases.reduce((s, p) => s + (p.BED ?? 0), 0);
            const priorBedValid = r.priorUnadjusted !== null && r.quantity !== 'physical' && r.courses.length > 0;
            const flags = r.reasons.filter((x) => x.level !== 'info');
            const infos = r.reasons.filter((x) => x.level === 'info');
            return (
              <Fragment key={r.key}>
                <tr data-testid={`row-${r.key}`}>
                  <td>
                    <b>{oar.name}</b>
                    <div className="small muted">{oar.designation}{oar.laterality !== 'not-applicable' ? ` · ${oar.laterality}` : ''}</div>
                  </td>
                  <td className="small">
                    <b>{constraintValueText(k)}</b>
                    <div><ConstraintTags k={k} /></div>
                    <SourceLink sourceKey={k.sourceKey} location={k.location} />
                  </td>
                  <td className="small">
                    {phases.length === 0 ? <span className="muted">—</span> : phases.map((p) => <div key={p.phaseId}>{p.label}: {fmt(p.D)} Gy / {p.n} fx</div>)}
                  </td>
                  <td className="num">{priorBedValid ? fmt(priorBed) : '—'}</td>
                  <td className="num">{fmt(r.priorUnadjusted)} <span className="muted small">{r.quantity}</span></td>
                  <td className="num">
                    {r.priorAdjusted !== null ? fmt(r.priorAdjusted) : <span className="muted small">{r.recovery.applicable ? '—' : 'not supported'}</span>}
                  </td>
                  <td className="num">
                    {fmtSigned(r.basisUsed === 'recovery-adjusted' ? r.headroomAdjusted : r.headroomUnadjusted)}
                    {r.existingExceedance && <div className="tag warn">existing exceedance</div>}
                    {r.physicalCeiling && (
                      <div className="small muted" title="Calculated headroom under selected assumptions — not a prescribed or guaranteed-safe dose">
                        ≈ {fmt(r.physicalCeiling.doseGy)} Gy / {r.physicalCeiling.fractions} fx*
                      </div>
                    )}
                  </td>
                  <td className="num">
                    {r.proposed ? (
                      <>
                        {fmt(r.proposed.value)}
                        <div className="small muted">{fmt(r.proposed.D)} Gy / {r.proposed.n} fx</div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="num">
                    {fmt(r.basisUsed === 'recovery-adjusted' ? r.cumulativeAdjusted : r.cumulativeUnadjusted)}
                    {r.basisUsed === 'recovery-adjusted' && <div className="small muted">recovery-adjusted</div>}
                  </td>
                  <td className="num">{fmtSigned(r.margin)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="small">
                    {flags.length > 0 && (
                      <ul className="reasons">
                        {flags.map((x, i) => (
                          <li key={i} className={x.level}>{x.message}</li>
                        ))}
                      </ul>
                    )}
                    {printMode && infos.length > 0 && (
                      <ul className="reasons">
                        {infos.map((x, i) => (
                          <li key={i}>{x.message}</li>
                        ))}
                      </ul>
                    )}
                    {!printMode && infos.length > 0 && <span className="muted">{infos.length} note(s) in details</span>}
                  </td>
                </tr>
                {expandable && (
                  <tr className="no-print">
                    <td colSpan={12} style={{ padding: '.2rem .5rem' }}>
                      <details>
                        <summary className="small">Calculation details: {oar.name} × {k.id}</summary>
                        <ul className="reasons small">
                          {infos.map((x, i) => (
                            <li key={i}>{x.message}</li>
                          ))}
                        </ul>
                        <CalcDetail r={r} k={k} c={c} />
                      </details>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <p className="small muted">
        * Calculated headroom under selected assumptions: the physical dose to the same metric in the proposed number of fractions that
        would reach the selected limit. Not a prescribed or guaranteed-safe dose. Values rounded for display only; statuses use full precision.
      </p>
    </div>
  );
}
