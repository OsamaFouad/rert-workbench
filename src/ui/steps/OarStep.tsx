import type { Designation, Laterality, SummationBasis } from '../../engine';
import { uid } from '../../domain/factory';
import { ORGAN_LABELS } from '../../domain/templates';
import { LITERATURE } from '../../evidence';
import { DoseGrid } from '../components/DoseGrid';
import { Field, NumInput } from '../components/Inputs';
import { referenceMetrics } from '../maxHint';
import type { StepProps } from '../pages/CaseWorkflow';

export const SUMMATION_LABEL: Record<SummationBasis, string> = {
  'not-documented': 'Not documented (no summation)',
  'documented-overlap': 'Spatial correspondence documented',
  'conservative-worst-case': 'Conservative worst-case (hotspots assumed co-located)',
};

function coverage(organKey: string) {
  const ks = LITERATURE.constraints.filter((k) => k.organKeys.includes(organKey) && k.category !== 'other');
  return { evaluable: ks.filter((k) => k.automatedEvaluation).length, listed: ks.length };
}

export function OarStep({ c, update }: StepProps) {
  return (
    <>
      <div className="callout">
        <b>This step is for the previous course(s) only.</b> Doses from the new (proposed) plan are entered in step 5, Proposed Plan,
        where these previous values are shown again for reference.
        <br />
        Enter the dose <b>received by each OAR</b> per phase (from the plan DVH), not the target prescription. Template organs are
        suggestions only; a template organ does not imply a validated reirradiation constraint exists. Near-maximum doses are summed
        across courses only when you document the spatial basis below.
      </div>
      {c.oars.map((o, oi) => {
        const cov = coverage(o.organKey);
        const set = (fn: (x: typeof o) => void) => update((d) => fn(d.oars[oi]));
        return (
          <div className="card" key={o.id}>
            <div className="row">
              <Field label="OAR name">
                <input value={o.name} onChange={(e) => set((x) => void (x.name = e.target.value))} />
              </Field>
              <Field label="Organ (evidence key)">
                <select value={o.organKey} onChange={(e) => set((x) => void (x.organKey = e.target.value))}>
                  {Object.entries(ORGAN_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Laterality">
                <select value={o.laterality} onChange={(e) => set((x) => void (x.laterality = e.target.value as Laterality))}>
                  {['left', 'right', 'midline', 'bilateral', 'not-applicable'].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Structure or PRV">
                <select value={o.designation} onChange={(e) => set((x) => void (x.designation = e.target.value as Designation))}>
                  <option value="structure">Structure</option>
                  <option value="PRV">PRV</option>
                </select>
              </Field>
              {o.designation === 'PRV' && (
                <Field label="PRV margin (mm)">
                  <NumInput className="narrow" value={o.prvMarginMm} onChange={(v) => set((x) => void (x.prvMarginMm = v))} label="PRV margin" />
                </Field>
              )}
              <Field label="Summation basis across courses">
                <select value={o.summationBasis} onChange={(e) => set((x) => void (x.summationBasis = e.target.value as SummationBasis))}>
                  {Object.entries(SUMMATION_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <span className="spacer" />
              {referenceMetrics(c, o).length > 0 && (
                <span className="small" data-testid={`needs-${o.id}`}>
                  Selected references use: <b className="mono">{referenceMetrics(c, o).join(', ')}</b>
                </span>
              )}
              <span className="small">
                {cov.evaluable > 0 ? (
                  <span className="tag ok">{cov.evaluable} verified numeric record(s) in dataset</span>
                ) : (
                  <span className="tag na">No verified reirradiation constraint in dataset</span>
                )}
              </span>
              <button className="link" onClick={() => update((d) => void d.oars.splice(oi, 1))}>remove</button>
            </div>
            <DoseGrid c={c} oar={o} update={update} columns="prior" />
            <Field label="OAR notes">
              <input value={o.notes} onChange={(e) => set((x) => void (x.notes = e.target.value))} style={{ width: '100%' }} />
            </Field>
          </div>
        );
      })}
      <button
        onClick={() =>
          update((d) =>
            void d.oars.push({
              id: uid('oar'),
              organKey: 'custom',
              name: 'Custom organ',
              laterality: 'not-applicable',
              designation: 'structure',
              prvMarginMm: null,
              summationBasis: 'not-documented',
              notes: '',
            }),
          )
        }
      >
        + Add custom OAR
      </button>
      <div className="card" style={{ marginTop: '1rem' }}>
        <h2>Case-level notes</h2>
        <div className="grid2">
          <Field label="Missing information">
            <textarea value={c.notes.missingInformation} onChange={(e) => update((d) => void (d.notes.missingInformation = e.target.value))} />
          </Field>
          <Field label="Anatomical changes since previous courses">
            <textarea value={c.notes.anatomicalChanges} onChange={(e) => update((d) => void (d.notes.anatomicalChanges = e.target.value))} />
          </Field>
          <Field label="Uncertainty about spatial overlap">
            <textarea value={c.notes.overlapUncertainty} onChange={(e) => update((d) => void (d.notes.overlapUncertainty = e.target.value))} />
          </Field>
        </div>
      </div>
    </>
  );
}
