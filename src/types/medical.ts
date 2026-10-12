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
}
