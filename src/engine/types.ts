// Core data types shared by the calculation engine, evidence dataset and UI.
// The engine is pure: no React, no DOM, no Date.now(). Everything it needs is in these types.

export type Status = 'within' | 'exceeds' | 'insufficient' | 'review';

export type Modality =
  | 'photon'
  | 'electron'
  | 'proton'
  | 'carbon-ion'
  | 'brachytherapy-hdr'
  | 'brachytherapy-ldr-pdr'
  | 'radionuclide'
  | 'other';

export type Laterality = 'left' | 'right' | 'midline' | 'bilateral' | 'not-applicable';
export type Designation = 'structure' | 'PRV';

/** How the user justifies adding near-maximum doses from different courses/phases. */
export type SummationBasis =
  | 'not-documented'
  | 'documented-overlap' // spatial correspondence documented (e.g. registered review)
  | 'conservative-worst-case'; // hotspots assumed to coincide; conservative upper estimate

export interface DoseEntry {
  id: string;
  oarId: string;
  /** Canonical metric string, e.g. "Dmax", "D0.03cc", "D0.1cc", "D1cc", "D2%", "Dmean", "V20Gy". */
  metric: string;
  value: number | null;
  /** Gy for dose metrics; "%" or "cc" for Vx metrics. */
  unit: 'Gy' | '%' | 'cc';
  note?: string;
}

export interface Phase {
  id: string;
  label: string;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  fractions: number | null;
  /** Target prescription. Recorded for context ONLY. Never used as an OAR dose. */
  prescriptionDoseGy: number | null;
  technique: string;
  modality: Modality;
  doses: DoseEntry[];
}

export interface Course {
  id: string;
  label: string;
  phases: Phase[];
  notes: string;
}

export interface ProposedCourse {
  plannedStartDate: string | null;
  fractions: number | null;
  prescriptionDoseGy: number | null;
  technique: string;
  modality: Modality;
  doses: DoseEntry[];
}

export interface Oar {
  id: string;
  /** Organ key used to match evidence (e.g. "brainstem"); "custom" organs only match custom constraints. */
  organKey: string;
  name: string;
  laterality: Laterality;
  designation: Designation;
  prvMarginMm: number | null;
  summationBasis: SummationBasis;
  notes: string;
}

export interface DiseaseContext {
  /** Free-text description shown in reports. */
  description: string;
  /** Keys matched against evidence disease scope, e.g. "glioblastoma", "hnscc", "nasopharyngeal-carcinoma". */
  diseaseKeys: string[];
  setting: string; // e.g. "recurrence in previous field", "second primary"
  intent: string; // free text; the app never decides on treatment
}

export interface CaseNotes {
  missingInformation: string;
  anatomicalChanges: string;
  overlapUncertainty: string;
  general: string;
}

export interface ReviewCase {
  schemaVersion: 1;
  id: string;
  /** Fictional identifier only, e.g. "FICT-BR-001". */
  caseLabel: string;
  pathway: string; // "brain" | "head-neck" | future regions
  disease: DiseaseContext;
  oars: Oar[];
  courses: Course[];
  proposed: ProposedCourse;
  notes: CaseNotes;
  /** Source keys (references) selected for comparison. */
  selectedSourceKeys: string[];
  primarySourceKey: string | null;
  /** Whether statuses use the recovery-adjusted prior dose when a supported model applies. */
  statusBasis: 'unadjusted' | 'recovery-adjusted';
  /** Show synthetic software-test thresholds (never literature). */
  includeTestFixtures: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Evidence ----------

export type Inequality = '<' | '<=' | '>' | '>=';
export type DoseQuantity = 'EQD2' | 'BED' | 'physical';
export type ConstraintScope = 'cumulative' | 'per-course' | 'reirradiation-course-only' | 'unspecified';
export type ConstraintCategory =
  | 'planning-goal'
  | 'recommended-limit'
  | 'conditional-limit'
  | 'observed-toxicity-association'
  | 'other';
export type ExtractionStatus =
  | 'verified-fulltext'
  | 'not-extracted-fulltext-unavailable'
  | 'ambiguous'
  | 'synthetic-test-fixture';

export interface Source {
  key: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi: string;
  url: string;
  accessStatus: 'fulltext-oa' | 'abstract-only' | 'inaccessible' | 'synthetic';
  accessedDate: string;
  scope: string;
  evidenceType: string;
  regions: string[];
  notes: string;
  isTestFixture?: boolean;
}

export interface Constraint {
  id: string;
  sourceKey: string;
  location: string;
  regions: string[];
  organKeys: string[];
  structureOrPRV: Designation | 'unspecified';
  metric: string;
  doseQuantity: DoseQuantity;
  unit: 'Gy';
  inequality: Inequality | 'unspecified';
  threshold: number | null;
  thresholdText: string;
  alphaBeta: number | null;
  alphaBetaSource: string;
  scope: ConstraintScope;
  category: ConstraintCategory;
  /** ["any"] when not disease-specific. */
  diseaseScope: string[];
  setting: string;
  endpoint: string;
  fractionationApplicability: string;
  /** Minimum months between prior course end and the proposed start (inclusive). */
  minIntervalMonths: number | null;
  /** Maximum months (exclusive), for interval-banded constraints such as "gap < 2 years". */
  maxIntervalMonths: number | null;
  /**
   * "condition": the source requires this interval; not meeting it → Requires review (checked for every prior course).
   * "applicability": the constraint only applies within this band (checked on the most recent prior course);
   * outside the band it is listed as not applicable rather than evaluated.
   */
  intervalRole: 'condition' | 'applicability';
  intervalCondition: string;
  /** Records sharing a group are either-or alternatives in the source (criterion met if any alternative is met). */
  alternativeGroup: string | null;
  /** The source itself defines the limit as a simple sum of physical near-max doses across courses. */
  physicalSumDefinedBySource: boolean;
  /** Other conditions stated by the source that the user must confirm (shown, not machine-checked). */
  conditionText: string;
  recoveryAssumption: string;
  /** true when the source states that the limit already allows for recovery. */
  recoveryIncludedInLimit: boolean | null;
  evidenceType: string;
  limitations: string;
  extractionStatus: ExtractionStatus;
  /** Only true when the record is complete and verified against full text (or is a flagged test fixture). */
  automatedEvaluation: boolean;
  quote: string | null;
  notes: string;
  isTestFixture?: boolean;
}

export interface RecoveryFactorBand {
  intervalMonthsMin: number; // inclusive
  intervalMonthsMax: number | null; // exclusive; null = open-ended
  retainedFraction: number; // 0..1 applied to prior biological dose
}

export interface RecoveryModel {
  id: string;
  sourceKey: string;
  location: string;
  organKeys: string[];
  setting: string;
  /** Maximum number of prior courses the model was described for. */
  maxPriorCourses: number;
  appliesTo: 'EQD2' | 'BED';
  factorTable: RecoveryFactorBand[];
  description: string;
  quote: string | null;
  extractionStatus: ExtractionStatus;
  /** Only enabled models are ever applied; others are listed for transparency. */
  enabled: boolean;
  /** A model is applied only to constraints from these sources (never mixed silently across references). */
  pairedSourceKeys: string[];
  organText?: string;
  notes?: string;
  isTestFixture?: boolean;
}

export interface EvidenceDataset {
  datasetVersion: string;
  searchDate: string;
  description: string;
  sources: Source[];
  constraints: Constraint[];
  recoveryModels: RecoveryModel[];
}
