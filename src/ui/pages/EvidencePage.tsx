import { useMemo, useState } from 'react';
import { EVIDENCE, LITERATURE } from '../../evidence';
import { ORGAN_LABELS } from '../../domain/templates';
import { ConstraintTags, SourceLink, constraintValueText } from '../components/ConstraintText';

export function EvidencePage() {
  const [organ, setOrgan] = useState('all');
  const [region, setRegion] = useState('all');
  const [onlyEvaluable, setOnlyEvaluable] = useState(false);
  const [showFixtures, setShowFixtures] = useState(false);
  const organs = useMemo(() => Array.from(new Set(EVIDENCE.constraints.flatMap((k) => k.organKeys))).sort(), []);
  const rows = EVIDENCE.constraints.filter(
    (k) =>
      (showFixtures || !k.isTestFixture) &&
      (organ === 'all' || k.organKeys.includes(organ)) &&
      (region === 'all' || k.regions.includes(region)) &&
      (!onlyEvaluable || k.automatedEvaluation),
  );
  const lit = LITERATURE.constraints;
  return (
    <>
      <h1>Evidence Library</h1>
      <p className="muted">
        Dataset v{LITERATURE.datasetVersion} · search date {LITERATURE.searchDate} · {LITERATURE.sources.length} sources ·{' '}
        {lit.length} records ({lit.filter((k) => k.automatedEvaluation).length} enabled for automated evaluation). Coverage is not
        exhaustive. Numbers are enabled only when verified verbatim against accessible full text; everything else stays visible as
        unavailable for automated evaluation.
      </p>
      <div className="callout small">{LITERATURE.description}</div>
      <div className="card row">
        <label className="field">
          Region
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All</option>
            <option value="brain">Brain</option>
            <option value="head-neck">Head &amp; Neck</option>
            <option value="general">General</option>
          </select>
        </label>
        <label className="field">
          Organ
          <select value={organ} onChange={(e) => setOrgan(e.target.value)}>
            <option value="all">All</option>
            {organs.map((o) => (
              <option key={o} value={o}>{ORGAN_LABELS[o] ?? o}</option>
            ))}
          </select>
        </label>
        <label className="checkbox"><input type="checkbox" checked={onlyEvaluable} onChange={(e) => setOnlyEvaluable(e.target.checked)} /> Only automated-evaluation records</label>
        <label className="checkbox"><input type="checkbox" checked={showFixtures} onChange={(e) => setShowFixtures(e.target.checked)} /> Show software test fixtures</label>
        <span className="muted small">{rows.length} records</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Organ</th>
              <th>Constraint</th>
              <th>Applicability</th>
              <th>α/β (source)</th>
              <th>Recovery / interval</th>
              <th>Evidence &amp; limitations</th>
              <th>Source &amp; verbatim quote</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id} id={k.id}>
                <td>{k.organKeys.map((o) => ORGAN_LABELS[o] ?? o).join(', ')}<div className="small muted">{k.structureOrPRV}</div></td>
                <td className="small">
                  <b>{constraintValueText(k)}</b>
                  <div><ConstraintTags k={k} /></div>
                  <div className="muted">{k.extractionStatus}</div>
                </td>
                <td className="small">
                  <div><b>Disease:</b> {k.diseaseScope.join(', ')}</div>
                  <div><b>Setting:</b> {k.setting}</div>
                  <div><b>Endpoint:</b> {k.endpoint}</div>
                  <div><b>Fractionation:</b> {k.fractionationApplicability}</div>
                </td>
                <td className="small">{k.alphaBeta ?? '—'} {k.alphaBetaSource && <div className="muted">{k.alphaBetaSource}</div>}</td>
                <td className="small">
                  {k.recoveryAssumption || '—'}
                  {k.intervalCondition && <div className="muted">{k.intervalCondition}</div>}
                </td>
                <td className="small">
                  {k.evidenceType}
                  <div className="muted">{k.limitations}</div>
                  {k.notes && <div className="muted">Note: {k.notes}</div>}
                </td>
                <td className="small">
                  <SourceLink sourceKey={k.sourceKey} location={k.location} />
                  {k.quote && <blockquote className="mono" style={{ margin: '.3rem 0 0', whiteSpace: 'pre-wrap' }}>“{k.quote}”</blockquote>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Sources</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Reference</th><th>Title</th><th>Scope</th><th>Type</th><th>Access</th><th className="num">Records (enabled / listed)</th></tr>
          </thead>
          <tbody>
            {EVIDENCE.sources.filter((s) => showFixtures || !s.isTestFixture).map((s) => {
              const ks = EVIDENCE.constraints.filter((k) => k.sourceKey === s.key);
              return (
                <tr key={s.key}>
                  <td><SourceLink sourceKey={s.key} /></td>
                  <td className="small">{s.title}<div className="muted">{s.authors}. {s.journal} {s.year}</div></td>
                  <td className="small">{s.scope}</td>
                  <td className="small">{s.evidenceType}</td>
                  <td className="small">{s.accessStatus}{s.notes && <div className="muted">{s.notes}</div>}</td>
                  <td className="num">{ks.filter((k) => k.automatedEvaluation).length} / {ks.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
