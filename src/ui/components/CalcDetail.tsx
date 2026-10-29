import { Fragment } from 'react';
import type { CheckResult, Constraint, ReviewCase } from '../../engine';
import { fmt, fmtGy } from '../format';

/** Full calculation trace for one check: equations, inputs, α/β, intermediates and assumptions. */
export function CalcDetail({ r, k, c }: { r: CheckResult; k: Constraint; c: ReviewCase }) {
  const ab = r.alphaBeta;
  const q = r.quantity;
  return (
    <div className="small">
      {q !== 'physical' && ab !== null && (
        <span className="eq">
          BED = D × (1 + d / (α/β)); EQD2 = BED / (1 + 2 / (α/β)); d = D / n; α/β = {ab} Gy
        </span>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Course / phase</th>
              <th className="num">Interval to proposed</th>
              <th className="num">D ({r.metric}, Gy)</th>
              <th className="num">n</th>
              <th className="num">d (Gy)</th>
              <th className="num">BED (Gy)</th>
              <th className="num">EQD2 (Gy)</th>
              <th className="num">Retained fraction</th>
              <th className="num">Adjusted {q}</th>
            </tr>
          </thead>
          <tbody>
            {r.courses.map((cc) => (
              <Fragment key={cc.courseId}>
                {cc.phases.map((p, i) => (
                  <tr key={p.phaseId}>
                    <td>{p.label}{p.modality !== 'photon' ? ` [${p.modality}]` : ''}</td>
                    <td className="num">
                      {i === 0 ? (cc.intervalDays === null ? 'unknown' : `${cc.intervalDays} d (${fmt(cc.intervalMonths, 1)} mo)`) : ''}
                    </td>
                    <td className="num">{fmt(p.D)}</td>
                    <td className="num">{p.n}</td>
                    <td className="num">{fmt(p.d, 3)}</td>
                    <td className="num">{fmt(p.BED)}</td>
                    <td className="num">{fmt(p.EQD2)}</td>
                    <td></td>
                    <td></td>
                  </tr>
                ))}
                <tr className="sub">
                  <td colSpan={6}>{cc.label} total ({q}){cc.endDate ? `, ended ${cc.endDate}` : ', end date missing'}</td>
                  <td className="num">{fmt(cc.unadjusted)}</td>
                  <td className="num">{cc.retainedFraction === null ? '—' : fmt(cc.retainedFraction, 2)}</td>
                  <td className="num">{fmt(cc.adjusted)}</td>
                </tr>
              </Fragment>
            ))}
            {r.proposed && (
              <tr>
                <td>Proposed course</td>
                <td className="num">{c.proposed.plannedStartDate ?? 'start date missing'}</td>
                <td className="num">{fmt(r.proposed.D)}</td>
                <td className="num">{r.proposed.n}</td>
                <td className="num">{fmt(r.proposed.d, 3)}</td>
                <td className="num">{fmt(r.proposed.BED)}</td>
                <td className="num">{fmt(r.proposed.EQD2)}</td>
                <td></td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p>
        Prior {q}: unadjusted <b>{fmtGy(r.priorUnadjusted)}</b>
        {r.priorAdjusted !== null && <> · recovery-adjusted <b>{fmtGy(r.priorAdjusted)}</b> (model {r.recovery.modelId})</>}
        {' '}· Recovery: {r.recovery.applicable ? 'supported scenario available' : r.recovery.reason || 'not applicable'}
      </p>
      <p>
        Limit {k.metric} {r.inequality} {k.threshold ?? 'n/a'} Gy {q} · Headroom (limit − prior): unadjusted {fmtGy(r.headroomUnadjusted)}
        {r.headroomAdjusted !== null && <>, adjusted {fmtGy(r.headroomAdjusted)}</>}
      </p>
      {r.physicalCeiling && (
        <p>
          <b>Calculated headroom under selected assumptions:</b> ≈ {fmt(r.physicalCeiling.doseGy)} Gy physical {r.metric} in{' '}
          {r.physicalCeiling.fractions} fractions ({r.physicalCeiling.basis}). Not a prescribed or guaranteed-safe dose.
        </p>
      )}
      <p className="muted">Assumptions:</p>
      <ul className="reasons">
        {r.assumptions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  );
}
