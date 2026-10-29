import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ReviewCase } from '../../engine';
import { EVIDENCE_VERSION, sourcesForPathway } from '../../evidence';
import { newCase } from '../../domain/factory';
import { parseImport, type ExportFile } from '../../domain/schema';
import { PATHWAYS, pathwayByKey } from '../../domain/templates';
import { useStore } from '../../state/store';
import { APP_VERSION } from '../../version';
import { downloadJson } from '../download';
import { useEvaluation } from '../useEvaluation';
import { StatusBadge } from '../components/Status';

function exportFile(cases: ReviewCase[]): ExportFile {
  return { format: 'rert-workbench-cases', appVersion: APP_VERSION, evidenceVersion: EVIDENCE_VERSION, exportedAt: new Date().toISOString(), cases };
}

function CaseRow({ c }: { c: ReviewCase }) {
  const store = useStore();
  const nav = useNavigate();
  const ev = useEvaluation(c);
  return (
    <tr>
      <td>
        <Link to={`/case/${c.id}/setup`}>{c.caseLabel}</Link>
        {c.includeTestFixtures && <span className="tag fixture">uses test fixtures</span>}
      </td>
      <td>{pathwayByKey(c.pathway)?.name ?? c.pathway}</td>
      <td className="small">{c.disease.description || <span className="muted">—</span>}</td>
      <td className="num">{c.courses.length}</td>
      <td>{ev && <StatusBadge status={ev.overall} />}</td>
      <td className="small">{ev?.coverageText}</td>
      <td className="small">{c.updatedAt.slice(0, 10)}</td>
      <td className="no-print">
        <button onClick={() => nav(`/case/${c.id}/dashboard`)}>Dashboard</button>{' '}
        <button
          onClick={() => {
            const copy = store.duplicate(c.id);
            if (copy) nav(`/case/${copy.id}/setup`);
          }}
        >
          Duplicate
        </button>{' '}
        <button onClick={() => downloadJson(`${c.caseLabel}.rert.json`, exportFile([c]))}>Export</button>{' '}
        <button
          className="danger"
          onClick={() => {
            if (confirm(`Delete case ${c.caseLabel}? This cannot be undone (export first if needed).`)) store.remove(c.id);
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

export function CasesPage() {
  const store = useStore();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  const [pathway, setPathway] = useState(PATHWAYS[0].key);

  const create = () => {
    const n = store.cases.length + 1;
    const label = `FICT-${pathway === 'brain' ? 'BR' : 'HN'}-${String(100 + n)}`;
    const keys = sourcesForPathway(pathway, false).map((s) => s.key);
    const c = newCase(pathway, label, new Date().toISOString(), keys);
    store.save(c);
    nav(`/case/${c.id}/setup`);
  };

  const onImport = async (f: File) => {
    const res = parseImport(await f.text());
    if (res.ok) {
      store.importCases(res.cases);
      setMsg({ kind: 'ok', text: `Imported ${res.cases.length} case(s).` });
    } else setMsg({ kind: 'bad', text: res.error });
  };

  return (
    <>
      <h1>Cases</h1>
      <p className="muted">
        Workflow: New Case → Previous Courses → OAR Data → Evidence Comparison → Proposed Plan → Case Dashboard → Discussion Report.
        Use fictional identifiers only. Do not enter names, dates of birth, record numbers or any real patient data.
      </p>
      <div className="card row no-print">
        <label className="field">
          Pathway
          <select value={pathway} onChange={(e) => setPathway(e.target.value)}>
            {PATHWAYS.map((p) => (
              <option key={p.key} value={p.key}>{p.name}</option>
            ))}
          </select>
        </label>
        <button className="primary" onClick={create}>New case</button>
        <span className="spacer" />
        <button onClick={() => downloadJson(`rert-cases-${new Date().toISOString().slice(0, 10)}.json`, exportFile(store.cases))}>Export all (JSON)</button>
        <button onClick={() => fileRef.current?.click()}>Import JSON…</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          data-testid="import-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
        <button
          className="danger"
          onClick={() => {
            if (confirm('Replace all cases in this browser with the fictional demo cases?')) {
              store.resetToDemo();
              setMsg({ kind: 'ok', text: 'Reset to demo cases.' });
            }
          }}
        >
          Reset to demo
        </button>
      </div>
      {msg && <div className={`callout ${msg.kind === 'bad' ? 'bad' : ''}`} role="status">{msg.text}</div>}
      {!store.persisted && <div className="callout warn">Browser storage is unavailable; changes will be lost on reload. Export to keep them.</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Pathway</th>
              <th>Disease context</th>
              <th className="num">Prior courses</th>
              <th>Case result</th>
              <th>Coverage</th>
              <th>Updated</th>
              <th className="no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            {store.cases.map((c) => (
              <CaseRow key={c.id} c={c} />
            ))}
            {store.cases.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">No cases. Create one or reset to demo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
