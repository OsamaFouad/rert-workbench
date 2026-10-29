import { daysBetween, daysToMonths, latestDate } from '../../engine';
import { EVIDENCE_VERSION, SOURCE_BY_KEY, sourceLabel } from '../../evidence';
import { pathwayByKey } from '../../domain/templates';
import { APP_VERSION } from '../../version';
import { CaseSummary } from '../components/CaseSummary';
import { ResultsTable } from '../components/ResultsTable';
import { NOT_CLEARANCE } from '../components/Status';
import { fmt } from '../format';
import type { StepProps } from '../pages/CaseWorkflow';
import { useEvaluation } from '../useEvaluation';

const GLOBAL_ASSUMPTIONS = [
  'Linear-quadratic model with equal dose per fraction at the evaluated OAR metric (d = D/n).',
  'Each phase converted to BED/EQD2 separately, then summed; α/β fixed within each reference scenario.',
  'Near-maximum summation across courses is a conservative estimate (worst-case co-location) or relies on user-documented correspondence; it is not spatially registered dose accumulation.',
  'Mean doses are not converted to mean EQD2; Vx metrics are not summed or reconstructed.',
  'Recovery-adjusted figures appear only when a documented model for that organ and setting applies; unadjusted figures are always shown.',
  'Non-photon modalities, RBE, dose-rate and brachytherapy scenarios are flagged for review, not converted automatically.',
];

export function ReportStep({ c }: StepProps) {
  const ev = useEvaluation(c);
  if (!ev) return null;
  const generated = new Date().toISOString();
  const missing = Array.from(new Set(ev.results.flatMap((r) => r.reasons.filter((x) => x.level === 'insufficient').map((x) => x.message))));
  const review = Array.from(new Set(ev.results.flatMap((r) => r.reasons.filter((x) => x.level === 'review').map((x) => x.message))));
  const questions: string[] = [];
  if (ev.counts.exceeds) questions.push(`${ev.counts.exceeds} check(s) exceed the selected constraints. Which assumptions (reference, metric, summation basis) drive the exceedance?`);
  if (ev.results.some((r) => r.existingExceedance)) questions.push('Prior courses alone already reach a selected limit for at least one OAR. How should existing exceedance be weighed?');
  if (missing.length) questions.push('Can the missing dose metrics, fractionation or dates listed below be retrieved from the original plans?');
  if (review.length) questions.push('Items flagged “Requires review” need expert judgement (population fit, modality, summation basis, interval conditions).');
  if (ev.disagreements.some((d) => d.statusDiffers)) questions.push('Selected references disagree on status for at least one OAR. Which reference best matches this case and why?');
  if (ev.uncoveredOars.length) questions.push(`No selected reference covers: ${ev.uncoveredOars.map((o) => o.name).join(', ')}. How will these be assessed?`);
  if (c.notes.overlapUncertainty) questions.push('Spatial overlap uncertainty was noted — would deformable registration or plan-sum review change the near-max estimates?');
  questions.push('Is the proposed fractionation within the applicability range of the selected references?');

  const primary = ev.results.filter((r) => r.sourceKey === c.primarySourceKey);
  const others = ev.results.filter((r) => r.sourceKey !== c.primarySourceKey);
  return (
    <div className="report-page">
      <div className="row no-print">
        <button className="primary" onClick={() => window.print()}>Print / Save as PDF</button>
        <span className="muted small">Use the browser print dialog and choose “Save as PDF”.</span>
      </div>
      <h1>Reirradiation OAR dose review — discussion summary</h1>
      <p className="small">
        Case <b>{c.caseLabel}</b> (fictional) · Pathway {pathwayByKey(c.pathway)?.name ?? c.pathway} · Generated {generated}
        <br />
        ReRT Workbench v{APP_VERSION} · Evidence dataset v{EVIDENCE_VERSION} · Status basis: {c.statusBasis}
        {c.includeTestFixtures && <span className="tag fixture">includes SOFTWARE TEST FIXTURES — not literature</span>}
      </p>
      <div className="callout warn small">
        Research and educational prototype using fictional data. Software-tested and source-extracted, but not independently
        validated clinically or by medical physics. It does not recommend offering or withholding radiotherapy. {NOT_CLEARANCE}
      </div>

      <h2>Disease context</h2>
      <p>{c.disease.description || '—'}</p>
      <p className="small">Disease keys: {c.disease.diseaseKeys.join(', ') || '—'} · Setting: {c.disease.setting || '—'}</p>

      <h2>Course history</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Course</th><th>Phase</th><th>Dates</th><th className="num">Fractions</th><th className="num">Target prescription (Gy)</th><th>Technique / modality</th><th className="num">Interval to proposed</th>
            </tr>
          </thead>
          <tbody>
            {c.courses.flatMap((co) => {
              const days = daysBetween(latestDate(co.phases.map((p) => p.endDate)), c.proposed.plannedStartDate);
              return co.phases.map((p, i) => (
                <tr key={p.id}>
                  <td>{i === 0 ? co.label : ''}</td>
                  <td>{p.label}</td>
                  <td>{p.startDate ?? '?'} → {p.endDate ?? '?'}</td>
                  <td className="num">{p.fractions ?? 'missing'}</td>
                  <td className="num">{fmt(p.prescriptionDoseGy, 1)}</td>
                  <td>{p.technique} / {p.modality}</td>
                  <td className="num">{i === 0 ? (days === null ? 'not calculable' : `${days} d (${fmt(daysToMonths(days), 1)} mo)`) : ''}</td>
                </tr>
              ));
            })}
            <tr>
              <td><b>Proposed</b></td>
              <td>—</td>
              <td>start {c.proposed.plannedStartDate ?? '?'}</td>
              <td className="num">{c.proposed.fractions ?? 'missing'}</td>
              <td className="num">{fmt(c.proposed.prescriptionDoseGy, 1)}</td>
              <td>{c.proposed.technique} / {c.proposed.modality}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Selected references</h2>
      <ul className="small">
        {c.selectedSourceKeys.map((k) => {
          const s = SOURCE_BY_KEY.get(k);
          return (
            <li key={k}>
              {k === c.primarySourceKey && <b>[Primary] </b>}
              {s ? `${s.authors} (${s.year}). ${s.title}. ${s.journal}. ${s.doi ? 'doi:' + s.doi : s.url}` : k}
              {s?.isTestFixture && <span className="tag fixture">TEST FIXTURE</span>}
            </li>
          );
        })}
      </ul>

      <h2>Case summary</h2>
      <CaseSummary ev={ev} />

      <h2>OAR results — primary reference ({c.primarySourceKey ? sourceLabel(c.primarySourceKey) : 'none'})</h2>
      <ResultsTable c={c} results={primary} expandable={false} printMode />
      {others.length > 0 && (
        <>
          <h2>OAR results — other selected references</h2>
          <ResultsTable c={c} results={others} expandable={false} printMode />
        </>
      )}

      <h2>Comparison findings</h2>
      {ev.disagreements.length === 0 ? (
        <p className="small">No differences between selected references for the same OAR.</p>
      ) : (
        <ul className="small">
          {ev.disagreements.map((d, i) => (
            <li key={i}>
              {c.oars.find((o) => o.id === d.oarId)?.name}: {sourceLabel(d.a.sourceKey)} ({d.a.status}) vs {sourceLabel(d.b.sourceKey)} ({d.b.status}) —{' '}
              {d.differences.map((x) => `${x.kind}: ${x.detail}`).join('; ')}
            </li>
          ))}
        </ul>
      )}

      <h2>Calculation assumptions</h2>
      <ul className="small">{GLOBAL_ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul>

      <h2>Missing data</h2>
      <ul className="small">
        {missing.length === 0 && <li>None detected by the engine.</li>}
        {missing.map((m) => <li key={m}>{m}</li>)}
        {c.notes.missingInformation && <li>User note: {c.notes.missingInformation}</li>}
      </ul>
      <h2>Items requiring review</h2>
      <ul className="small">
        {review.length === 0 && <li>None.</li>}
        {review.map((m) => <li key={m}>{m}</li>)}
      </ul>
      <h2>Anatomy and overlap notes</h2>
      <p className="small">Anatomical changes: {c.notes.anatomicalChanges || '—'}</p>
      <p className="small">Spatial overlap uncertainty: {c.notes.overlapUncertainty || '—'}</p>

      <h2>Questions for discussion</h2>
      <ol className="small">{questions.map((q) => <li key={q}>{q}</li>)}</ol>
    </div>
  );
}
