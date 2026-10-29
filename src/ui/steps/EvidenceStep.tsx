import { Link } from 'react-router-dom';
import { canonicalMetric, constraintsForOar } from '../../engine';
import { EVIDENCE, sourceLabel, sourcesForPathway } from '../../evidence';
import { ConstraintTags, SourceLink, constraintValueText } from '../components/ConstraintText';
import type { StepProps } from '../pages/CaseWorkflow';
import { useEvaluation } from '../useEvaluation';

export function EvidenceStep({ c, update }: StepProps) {
  const sources = sourcesForPathway(c.pathway, c.includeTestFixtures);
  const selected = sources.filter((s) => c.selectedSourceKeys.includes(s.key));
  const ev = useEvaluation(c);
  const enteredMetrics = (oarId: string) =>
    new Set(
      [...c.courses.flatMap((co) => co.phases.flatMap((p) => p.doses)), ...c.proposed.doses]
        .filter((d) => d.oarId === oarId && d.value !== null)
        .map((d) => canonicalMetric(d.metric)),
    );
  return (
    <>
      <div className="card">
        <h2>Select references</h2>
        <p className="muted small">
          References are compared side by side. Thresholds are never averaged, the most permissive value is never chosen automatically,
          and unrelated references are never combined. Pick a primary reference for the report.
        </p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={c.includeTestFixtures}
            onChange={(e) =>
              update((d) => {
                d.includeTestFixtures = e.target.checked;
                if (!e.target.checked) {
                  const fixtureKeys = new Set(EVIDENCE.sources.filter((s) => s.isTestFixture).map((s) => s.key));
                  d.selectedSourceKeys = d.selectedSourceKeys.filter((k) => !fixtureKeys.has(k));
                  if (d.primarySourceKey && fixtureKeys.has(d.primarySourceKey)) d.primarySourceKey = d.selectedSourceKeys[0] ?? null;
                }
              })
            }
          />
          Show synthetic SOFTWARE TEST FIXTURES (not literature)
        </label>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Use</th>
                <th>Primary</th>
                <th>Reference</th>
                <th>Scope / population</th>
                <th>Evidence type</th>
                <th>Access</th>
                <th className="num">Checks (evaluable / listed)</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => {
                const ks = EVIDENCE.constraints.filter((k) => k.sourceKey === s.key && k.category !== 'other');
                const on = c.selectedSourceKeys.includes(s.key);
                return (
                  <tr key={s.key}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Use ${sourceLabel(s.key)}`}
                        checked={on}
                        onChange={(e) =>
                          update((d) => {
                            d.selectedSourceKeys = e.target.checked ? [...d.selectedSourceKeys, s.key] : d.selectedSourceKeys.filter((x) => x !== s.key);
                            if (!e.target.checked && d.primarySourceKey === s.key) d.primarySourceKey = d.selectedSourceKeys[0] ?? null;
                            if (e.target.checked && !d.primarySourceKey) d.primarySourceKey = s.key;
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        name="primary"
                        aria-label={`Primary ${sourceLabel(s.key)}`}
                        disabled={!on}
                        checked={c.primarySourceKey === s.key}
                        onChange={() => update((d) => void (d.primarySourceKey = s.key))}
                      />
                    </td>
                    <td>
                      <SourceLink sourceKey={s.key} />
                      <div className="small muted">{s.title}</div>
                    </td>
                    <td className="small">{s.scope}</td>
                    <td className="small">{s.evidenceType}</td>
                    <td className="small">{s.accessStatus}</td>
                    <td className="num">
                      {ks.filter((k) => k.automatedEvaluation).length} / {ks.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Side-by-side comparison</h2>
        {selected.length === 0 && <p className="muted">No reference selected.</p>}
        {c.oars.map((o) => {
          const metrics = enteredMetrics(o.id);
          const rows = selected.map((s) => ({ s, ks: constraintsForOar(EVIDENCE.constraints.filter((k) => k.sourceKey === s.key && k.category !== 'other'), o) }));
          if (rows.every((r) => r.ks.length === 0)) return null;
          return (
            <div key={o.id}>
              <h3>{o.name} <span className="muted small">({o.designation})</span></h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {rows.map((r) => (
                        <th key={r.s.key} style={{ minWidth: 220 }}>
                          {sourceLabel(r.s.key)}
                          {c.primarySourceKey === r.s.key && <span className="tag ok">primary</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {rows.map((r) => (
                        <td key={r.s.key} className="small">
                          {r.ks.length === 0 && <span className="muted">No record for this organ.</span>}
                          {r.ks.map((k) => {
                            const metricOk = metrics.has(canonicalMetric(k.metric));
                            const popOk = k.diseaseScope.includes('any') || k.diseaseScope.some((x) => c.disease.diseaseKeys.includes(x));
                            return (
                              <div key={k.id} style={{ marginBottom: '.5rem' }}>
                                <b>{constraintValueText(k)}</b>
                                <div><ConstraintTags k={k} /></div>
                                <div className="muted">{k.endpoint} · {k.location}</div>
                                {!metricOk && <div className="tag warn">case has no {k.metric} data</div>}
                                {!popOk && <div className="tag warn">population differs from case</div>}
                              </div>
                            );
                          })}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {ev && ev.disagreements.length > 0 && (
        <div className="card">
          <h2>Where selected references differ</h2>
          <ul className="reasons">
            {ev.disagreements.map((d, i) => (
              <li key={i}>
                <b>{c.oars.find((o) => o.id === d.oarId)?.name}</b>: {sourceLabel(d.a.sourceKey)} vs {sourceLabel(d.b.sourceKey)} —{' '}
                {d.differences.map((x) => `${x.kind} (${x.detail})`).join('; ')}
                {d.statusDiffers && <span className="tag warn">statuses differ</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="small muted">
        Full extraction details (quotes, limitations, α/β sources) are in the <Link to="/evidence">Evidence Library</Link>.
      </p>
    </>
  );
}
