import { Link } from 'react-router-dom';
import { canonicalMetric, constraintsForOar, suggestReferences } from '../../engine';
import { EVIDENCE, sourceLabel, sourcesForPathway } from '../../evidence';
import { ConstraintTags, SourceLink, constraintValueText } from '../components/ConstraintText';
import type { StepProps } from '../pages/CaseWorkflow';
import { useEvaluation } from '../useEvaluation';

export function EvidenceStep({ c, update }: StepProps) {
  const sources = sourcesForPathway(c.pathway, c.includeTestFixtures);
  const selected = sources.filter((s) => c.selectedSourceKeys.includes(s.key));
  const ev = useEvaluation(c);
  const suggestions = suggestReferences(c, EVIDENCE, sources.map((s) => s.key));
  const recommended = suggestions.filter((x) => x.recommended).map((x) => x.sourceKey);
  const POP_TAG = { match: ['ok', 'matches case'], general: ['', 'cross-site'], mismatch: ['warn', 'different population'] } as const;
  const enteredMetrics = (oarId: string) =>
    new Set(
      [...c.courses.flatMap((co) => co.phases.flatMap((p) => p.doses)), ...c.proposed.doses]
        .filter((d) => d.oarId === oarId && d.value !== null)
        .map((d) => canonicalMetric(d.metric)),
    );
  return (
    <>
      <div className="card" data-testid="suggestions">
        <h2>Suggested references for this case</h2>
        <p className="muted small">
          Ranked by fit to your case: population match, then how many checks your entered data can evaluate, then organs covered.
          Limit values are <b>not</b> used for ranking, so a reference is never suggested for being more permissive. You decide.
        </p>
        {c.disease.diseaseKeys.length === 0 && (
          <div className="callout warn small">No disease selected in step 1 (New Case), so no reference can match the population. Set it for better suggestions.</div>
        )}
        {suggestions.length === 0 ? (
          <p className="muted">No reference in the dataset has an evaluable limit for this pathway.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reference</th>
                  <th>Population</th>
                  <th>Your OARs covered</th>
                  <th className="num">Evaluable now</th>
                  <th>To get more checks, enter</th>
                  <th>Selected</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((x, i) => (
                  <tr key={x.sourceKey} data-testid={`suggest-${x.sourceKey}`}>
                    <td className="num">{i + 1}</td>
                    <td>
                      <SourceLink sourceKey={x.sourceKey} />
                      {x.recommended ? <span className="tag ok">suggested</span> : <span className="tag na">not suggested</span>}
                    </td>
                    <td><span className={`tag ${POP_TAG[x.population][0]}`}>{POP_TAG[x.population][1]}</span></td>
                    <td className="small">{x.organsCovered.join(', ') || '—'}</td>
                    <td className="num">{x.evaluableNow} / {x.checks}</td>
                    <td className="small">
                      {x.missingMetrics.length === 0 ? '—' : x.missingMetrics.map((m) => `${m.oarName}: ${m.metrics.join(' or ')}`).join('; ')}
                    </td>
                    <td>{c.selectedSourceKeys.includes(x.sourceKey) ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          className="primary"
          disabled={recommended.length === 0}
          onClick={() =>
            update((d) => {
              d.selectedSourceKeys = recommended;
              d.primarySourceKey = recommended[0] ?? null;
            })
          }
        >
          Use suggested references ({recommended.length})
        </button>{' '}
        <span className="muted small">Replaces the current selection; the top-ranked one becomes primary. You can still change both below.</span>
      </div>

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
        <div className="row" style={{ margin: '.4rem 0' }}>
          <button
            onClick={() =>
              update((d) => {
                d.selectedSourceKeys = sources.map((x) => x.key);
                if (!d.primarySourceKey || !d.selectedSourceKeys.includes(d.primarySourceKey)) d.primarySourceKey = recommended[0] ?? sources[0]?.key ?? null;
              })
            }
          >
            Select all ({sources.length})
          </button>
          <button
            onClick={() =>
              update((d) => {
                d.selectedSourceKeys = [];
                d.primarySourceKey = null;
              })
            }
          >
            Clear all
          </button>
          <span className="muted small">
            Selecting all also adds references for other populations; those checks show “Requires review”, so the case cannot turn all-green.
          </span>
        </div>
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
