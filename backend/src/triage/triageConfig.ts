/**
 * Single source of truth for the triage options. The frontend loads these from
 * GET /api/triage/options, so the UI and the rule engine can never drift apart.
 */
export type Department = 'General Medicine' | 'Dermatology';
export type RiskLevel = 'Low' | 'Medium' | 'High';

export const ENGINE_VERSION = 'rules-v2';

export const DEPARTMENTS: Record<Department, { tokenPrefix: string; room: string }> = {
  'General Medicine': { tokenPrefix: 'GM', room: 'Room 104 — General Medicine OPD' },
  Dermatology: { tokenPrefix: 'DERM', room: 'Room 208 — Dermatology Clinic' },
};

export const SYMPTOMS_BY_DEPARTMENT: Record<Department, { name: string; description: string }[]> = {
  'General Medicine': [
    { name: 'Fever', description: 'Raised body temperature / chills' },
    { name: 'Flu', description: 'Flu-like tiredness and aches' },
    { name: 'Headache', description: 'Head pain or pressure' },
    { name: 'Cough', description: 'Dry or wet cough' },
    { name: 'Sore throat', description: 'Throat pain or pain when swallowing' },
    { name: 'Body pain', description: 'General muscle or joint aches' },
  ],
  Dermatology: [
    { name: 'Skin rash', description: 'Red spots, bumps or patches on the skin' },
    { name: 'Itching', description: 'Itchy skin, in one place or all over' },
    { name: 'Redness', description: 'Red or irritated skin' },
    { name: 'Minor skin infection', description: 'Small pus spot, boil or infected cut' },
  ],
};

export const ALL_SYMPTOMS: string[] = Object.values(SYMPTOMS_BY_DEPARTMENT).flatMap((list) => list.map((s) => s.name));

export const DURATION_OPTIONS = [
  'Today (Sudden onset)',
  '1 - 2 days',
  '3 - 5 days',
  '1 - 2 weeks',
  'More than 2 weeks',
] as const;

export const LONG_DURATIONS: readonly string[] = ['1 - 2 weeks', 'More than 2 weeks'];

export const GENDERS = ['Male', 'Female', 'Other'] as const;

export function triageOptions() {
  return {
    engineVersion: ENGINE_VERSION,
    departments: (Object.keys(DEPARTMENTS) as Department[]).map((name) => ({
      name,
      room: DEPARTMENTS[name].room,
      symptoms: SYMPTOMS_BY_DEPARTMENT[name],
    })),
    durations: [...DURATION_OPTIONS],
    genders: [...GENDERS],
  };
}
