import { daysBetween, daysToMonths, latestDate, type Modality } from '../../engine';
import { newCourse, newPhase } from '../../domain/factory';
import { Field, NumInput } from '../components/Inputs';
import { fmt } from '../format';
import type { StepProps } from '../pages/CaseWorkflow';
import { MODALITIES } from './SetupStep';

export function CoursesStep({ c, update }: StepProps) {
  return (
    <>
      <div className="callout">
        Record each previous radiotherapy course and its phases/boosts. Target prescription is stored for context only and is
        never used as an OAR dose. OAR doses are entered in the next step. Interval is calculated per course to the proposed start
        ({c.proposed.plannedStartDate ?? 'planned start not set'}).
      </div>
      {c.courses.map((co, ci) => {
        const end = latestDate(co.phases.map((p) => p.endDate));
        const days = daysBetween(end, c.proposed.plannedStartDate);
        return (
          <div className="card" key={co.id}>
            <div className="row">
              <Field label="Course label">
                <input value={co.label} onChange={(e) => update((d) => void (d.courses[ci].label = e.target.value))} />
              </Field>
              <div className="small" data-testid={`interval-${ci}`}>
                <b>Interval to proposed course:</b>{' '}
                {days === null ? <span className="muted">not calculable (missing end date or planned start)</span> : `${days} days (${fmt(daysToMonths(days), 1)} months)`}
                {days !== null && days < 0 && <span className="tag warn">proposed start before course end</span>}
              </div>
              <span className="spacer" />
              <button
                className="danger"
                onClick={() => confirm(`Remove ${co.label}?`) && update((d) => void d.courses.splice(ci, 1))}
              >
                Remove course
              </button>
            </div>
            <div className="table-wrap" style={{ marginTop: '.6rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Phase / boost</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Fractions</th>
                    <th>Target prescription (Gy, context only)</th>
                    <th>Technique</th>
                    <th>Modality</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {co.phases.map((p, pi) => {
                    const set = (fn: (ph: typeof p) => void) => update((d) => fn(d.courses[ci].phases[pi]));
                    return (
                      <tr key={p.id}>
                        <td><input value={p.label} onChange={(e) => set((ph) => void (ph.label = e.target.value))} aria-label="Phase label" /></td>
                        <td><input type="date" value={p.startDate ?? ''} onChange={(e) => set((ph) => void (ph.startDate = e.target.value || null))} aria-label="Phase start" /></td>
                        <td><input type="date" value={p.endDate ?? ''} onChange={(e) => set((ph) => void (ph.endDate = e.target.value || null))} aria-label="Phase end" /></td>
                        <td><NumInput className="narrow" step="1" min={1} value={p.fractions} onChange={(v) => set((ph) => void (ph.fractions = v))} label="Fractions" /></td>
                        <td><NumInput value={p.prescriptionDoseGy} onChange={(v) => set((ph) => void (ph.prescriptionDoseGy = v))} label="Prescription" /></td>
                        <td><input value={p.technique} onChange={(e) => set((ph) => void (ph.technique = e.target.value))} aria-label="Technique" /></td>
                        <td>
                          <select value={p.modality} onChange={(e) => set((ph) => void (ph.modality = e.target.value as Modality))} aria-label="Modality">
                            {MODALITIES.map((m) => (
                              <option key={m.key} value={m.key}>{m.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button className="link" onClick={() => update((d) => void d.courses[ci].phases.splice(pi, 1))}>remove</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={() => update((d) => void d.courses[ci].phases.push(newPhase(`Phase ${co.phases.length + 1}`)))}>+ Add phase / boost</button>
            <Field label="Course notes">
              <textarea value={co.notes} onChange={(e) => update((d) => void (d.courses[ci].notes = e.target.value))} />
            </Field>
          </div>
        );
      })}
      <button onClick={() => update((d) => void d.courses.push(newCourse(d.courses.length + 1)))}>+ Add previous course</button>
    </>
  );
}
