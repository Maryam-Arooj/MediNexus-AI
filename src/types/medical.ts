export type Department = 'General Medicine' | 'Dermatology';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type PatientStatus = 'Pending Review' | 'Under Review' | 'Approved';

export interface PatientRegistrationInput {
  name: string;
  age: number | '';
  gender: 'Male' | 'Female' | 'Other' | '';
  symptoms: string[];
  duration: string;
}

export interface AIAnalysisResult {
  riskLevel: RiskLevel;
  redFlags: string[];
  suggestedDepartment: Department;
  possibleConditions: string[];
  recommendedAction: string;
  shortDoctorSummary: string;
  confidenceScore: number;
}

export interface PatientRecord {
  id: string; // e.g. "SC-2026-104"
  tokenNumber: string; // e.g. "GM-042" or "DERM-018"
  createdAt: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  symptoms: string[];
  duration: string;
  department: Department;
  opdRoom: string;
  analysis: AIAnalysisResult;
  status: PatientStatus;
  doctorNotes?: string;
  approvedAt?: string;
  approvedBy?: string;
}
