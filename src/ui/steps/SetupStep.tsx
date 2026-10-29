import type { Modality } from '../../engine';
import { oarsFromTemplate } from '../../domain/factory';
import { DISEASE_KEYS, PATHWAYS } from '../../domain/templates';
import { Field, NumInput } from '../components/Inputs';
import type { StepProps } from '../pages/CaseWorkflow';

export const MODALITIES: { key: Modality; label: string }[] = [
  { key: 'photon', label: 'Photon (external beam)' },
  { key: 'electron', label: 'Electron' },
  { key: 'proton', label: 'Proton (RBE-weighted — flagged for review)' },
  { key: 'carbon-ion', label: 'Carbon ion (flagged for review)' },
  { key: 'brachytherapy-hdr', label: 'Brachytherapy HDR (flagged for review)' },
  { key: 'brachytherapy-ldr-pdr', label: 'Brachytherapy LDR/PDR (flagged for review)' },
  { key: 'radionuclide', label: 'Radionuclide (flagged for review)' },
  { key: 'other', label: 'Other (flagged for review)' },
];

export function SetupStep({ c, update }: StepProps) {
  const looksReal = !/^FICT-/i.test(c.caseLabel);
  return (
    <>
      <div className="card">
        <h2>Case identity</h2>
        <div className="grid2">
          <Field label="Fictional case identifier" required>
            <input value={c.caseLabel} onChange={(e) => update((d) => void (d.caseLabel = e.target.value))} />
          </Field>
          <Field label="Anatomical pathway">
            <select
              value={c.pathway}
              onChange={(e) => {
                const v = e.target.value;
                const replace = confirm('Replace the OAR list with the template for this pathway? Entered OAR doses will be removed.');
                update((d) => {
                  d.pathway = v;
                  if (replace) {
                    d.oars = oarsFromTemplate(v);
                    d.courses.forEach((co) => co.phases.forEach((p) => (p.doses = [])));
                    d.proposed.doses = [];
                  }
                });
              }}
            >
              {PATHWAYS.map((p) => (
                <option key={p.key} value={p.key}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>
        {looksReal && <div className="callout warn">Identifier does not start with “FICT-”. Use fictional identifiers only.</div>}
      </div>
      <div className="card">
        <h2>Disease context</h2>
        <p className="muted small">Used only to check whether a reference’s population applies. Disease-specific evidence (e.g. glioblastoma) is flagged for other diseases.</p>
        <div style={{ margin: '.4rem 0' }}>
          {DISEASE_KEYS.map((dk) => (
            <label key={dk.key} className="checkbox">
              <input
                type="checkbox"
                checked={c.disease.diseaseKeys.includes(dk.key)}
                onChange={(e) =>
                  update((d) => {
                    d.disease.diseaseKeys = e.target.checked
                      ? [...d.disease.diseaseKeys, dk.key]
                      : d.disease.diseaseKeys.filter((x) => x !== dk.key);
                  })
                }
              />
              {dk.label}
            </label>
          ))}
        </div>
        <div className="grid2">
          <Field label="Description (histology, site, prior treatments)">
            <textarea value={c.disease.description} onChange={(e) => update((d) => void (d.disease.description = e.target.value))} />
          </Field>
          <Field label="Setting (e.g. in-field recurrence, second primary)">
            <textarea value={c.disease.setting} onChange={(e) => update((d) => void (d.disease.setting = e.target.value))} />
          </Field>
          <Field label="Discussion intent / notes (no decision is made by this tool)">
            <textarea value={c.disease.intent} onChange={(e) => update((d) => void (d.disease.intent = e.target.value))} />
          </Field>
        </div>
      </div>
      <div className="card">
        <h2>Proposed course (schedule)</h2>
        <p className="muted small">Intervals are calculated separately from the end of each previous course to this planned start date.</p>
        <div className="row">
          <Field label="Planned start date">
            <input type="date" value={c.proposed.plannedStartDate ?? ''} onChange={(e) => update((d) => void (d.proposed.plannedStartDate = e.target.value || null))} />
          </Field>
          <Field label="Number of fractions">
            <NumInput value={c.proposed.fractions} step="1" min={1} onChange={(v) => update((d) => void (d.proposed.fractions = v))} label="Proposed fractions" />
          </Field>
          <Field label="Target prescription (Gy, context only)">
            <NumInput value={c.proposed.prescriptionDoseGy} onChange={(v) => update((d) => void (d.proposed.prescriptionDoseGy = v))} label="Proposed prescription" />
          </Field>
          <Field label="Technique">
            <input value={c.proposed.technique} onChange={(e) => update((d) => void (d.proposed.technique = e.target.value))} />
          </Field>
          <Field label="Modality">
            <select value={c.proposed.modality} onChange={(e) => update((d) => void (d.proposed.modality = e.target.value as Modality))}>
              {MODALITIES.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </>
  );
}
