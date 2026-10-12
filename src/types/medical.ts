export type Department = 'General Medicine' | 'Dermatology';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type PatientStatus = 'Pending Review' | 'Under Review' | 'Approved';
export type Gender = 'Male' | 'Female' | 'Other';

export interface CaseFormInput {
  name: string;
  age: number | '';
  gender: Gender | '';
  symptoms: string[];
  duration: string;
  /** Emergency danger signs ticked by the patient (ids from GET /api/triage/options). */
  dangerSigns?: string[];
}

export interface TriageAnalysis {
  engineVersion: string;
  riskLevel: RiskLevel;
  riskReason: string | null;
  redFlags: string[];
  suggestedDepartment: Department;
  recommendedAction: string;
  actionOverriddenByDoctor: boolean;
  // Doctor-only fields (absent for patients)
  defaultRecommendedAction?: string;
  possibleConditions?: string[];
  handoverSummary?: string;
}

export interface CaseReview {
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  clinicalNotes?: string | null; // doctor-only
}

export interface PatientRecord {
  id: string; // public id, e.g. "SC-2026-0007"
  tokenNumber: string; // e.g. "GM-01"
  createdAt: string; // ISO
  updatedAt: string; // ISO
  name: string;
  age: number;
  gender: Gender;
  symptoms: string[];
  duration: string;
  department: Department;
  opdRoom: string;
  dangerSigns?: string[];
  emergency?: boolean;
  analysis: TriageAnalysis | null; // null only for damaged legacy records
  status: PatientStatus;
  review: CaseReview;
  canEdit: boolean;
  isLegacyUnlinked?: boolean;
}

export interface TriageOptions {
  engineVersion: string;
  departments: { name: Department; room: string; symptoms: { name: string; description: string }[] }[];
  durations: string[];
  genders: Gender[];
  dangerSigns: DangerSignOption[];
  aiEnabled?: boolean;
}

export interface DangerSignOption {
  id: string;
  label: string;
  labelUr: string;
}

// ─── AI (Google Gemini) — suggestions only, never a diagnosis ────────────────
export interface EmergencyMatch extends DangerSignOption {
  source: 'checklist' | 'text' | 'ai';
}

export interface EmergencyResult {
  isEmergency: boolean;
  matched: EmergencyMatch[];
  guidance: string[];
}

export type Likelihood = 'more likely' | 'possible' | 'less likely';

export interface SymptomAnalysis {
  summary: string;
  symptoms: string[];
  duration: string | null;
  age: number | null;
  gender: Gender | null;
  otherSymptoms: string[];
  possibleConditions: { name: string; likelihood: Likelihood; reason: string }[];
  guidance: { selfCare: string[]; seeDoctorIf: string[]; avoid: string[] };
  emergencyConcern: boolean;
  unclear: boolean;
  disclaimer: string;
}

export interface SymptomAssistResponse {
  emergency: EmergencyResult;
  ai: SymptomAnalysis | null;
  aiStatus: 'ok' | 'disabled' | 'unavailable';
  aiMessage: string | null;
}

export interface DocumentExplanation {
  documentType: 'lab_report' | 'prescription' | 'other_medical' | 'not_medical' | 'unreadable';
  summary: string;
  tests: { name: string; value: string; unit: string; referenceRange: string; flag: 'high' | 'low' | 'normal' | 'unclear'; meaning: string }[];
  medicines: { name: string; strength: string; howToTakeAsWritten: string; durationAsWritten: string; generalPurpose: string }[];
  questionsForDoctor: string[];
  warnings: string[];
  disclaimer: string;
  medicineNotice: string | null;
}

export interface CaseSummary {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  questionsToAsk: string[];
  disclaimer: string;
}
