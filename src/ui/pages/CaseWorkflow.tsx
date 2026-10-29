import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ReviewCase } from '../../engine';
import { useStore } from '../../state/store';
import { StatusBadge } from '../components/Status';
import { useEvaluation } from '../useEvaluation';
import { CoursesStep } from '../steps/CoursesStep';
import { DashboardStep } from '../steps/DashboardStep';
import { EvidenceStep } from '../steps/EvidenceStep';
import { OarStep } from '../steps/OarStep';
import { ProposedStep } from '../steps/ProposedStep';
import { ReportStep } from '../steps/ReportStep';
import { SetupStep } from '../steps/SetupStep';

export interface StepProps {
  c: ReviewCase;
  update: (fn: (draft: ReviewCase) => void) => void;
}

const STEPS = [
  { key: 'setup', label: 'New Case', C: SetupStep },
  { key: 'courses', label: 'Previous Courses', C: CoursesStep },
  { key: 'oars', label: 'OAR Data', C: OarStep },
  { key: 'evidence', label: 'Evidence Comparison', C: EvidenceStep },
  { key: 'proposed', label: 'Proposed Plan', C: ProposedStep },
  { key: 'dashboard', label: 'Case Dashboard', C: DashboardStep },
  { key: 'report', label: 'Discussion Report', C: ReportStep },
] as const;

export function CaseWorkflow() {
  const { id = '', step = 'setup' } = useParams();
  const store = useStore();
  const nav = useNavigate();
  const c = store.get(id);
  const ev = useEvaluation(c);
  if (!c) {
    return (
      <div className="card">
        Case not found. <Link to="/">Back to cases</Link>
      </div>
    );
  }
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === step));
  const S = STEPS[idx];
  const update: StepProps['update'] = (fn) => {
    const draft = structuredClone(c);
    fn(draft);
    store.save(draft);
  };
  return (
    <>
      <div className="row no-print" style={{ alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{c.caseLabel}</h1>
        {ev && <StatusBadge status={ev.overall} />}
        <span className="muted small">{ev?.coverageText}</span>
        {c.includeTestFixtures && <span className="tag fixture">uses SOFTWARE TEST FIXTURES</span>}
      </div>
      <nav className="stepper" aria-label="Case workflow">
        {STEPS.map((s, i) => (
          <Link key={s.key} to={`/case/${c.id}/${s.key}`} className={i === idx ? 'active' : ''} aria-current={i === idx ? 'step' : undefined}>
            <span className="n">{i + 1}</span>
            {s.label}
          </Link>
        ))}
      </nav>
      <S.C c={c} update={update} />
      <div className="row no-print" style={{ marginTop: '1rem' }}>
        {idx > 0 && <button onClick={() => nav(`/case/${c.id}/${STEPS[idx - 1].key}`)}>← {STEPS[idx - 1].label}</button>}
        <span className="spacer" />
        {idx < STEPS.length - 1 && (
          <button className="primary" onClick={() => nav(`/case/${c.id}/${STEPS[idx + 1].key}`)}>
            {STEPS[idx + 1].label} →
          </button>
        )}
      </div>
    </>
  );
}
