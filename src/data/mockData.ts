import { Department, PatientRecord, PatientRegistrationInput, AIAnalysisResult, RiskLevel } from '../types/medical';

export const DEPARTMENTS = {
  GENERAL_MEDICINE: 'General Medicine' as Department,
  DERMATOLOGY: 'Dermatology' as Department,
};

export const SYMPTOMS_BY_DEPARTMENT: Record<Department, { name: string; description: string; redFlagTrigger?: boolean }[]> = {
  'General Medicine': [
    { name: 'Fever', description: 'Elevated body temperature / chills', redFlagTrigger: true },
    { name: 'Flu', description: 'Systemic viral malaise and exhaustion' },
    { name: 'Headache', description: 'Cephalea or tension/pressure pain' },
    { name: 'Cough', description: 'Persistent dry or productive chest cough' },
    { name: 'Sore throat', description: 'Pharyngeal irritation or pain on swallowing' },
    { name: 'Body pain', description: 'Generalized myalgia and joint stiffness' },
  ],
  'Dermatology': [
    { name: 'Skin rash', description: 'Erythematous eruption or maculopapular lesions', redFlagTrigger: true },
    { name: 'Itching', description: 'Pruritus, localized or generalized' },
    { name: 'Redness', description: 'Cutaneous erythema or localized inflammation' },
    { name: 'Minor skin infection', description: 'Superficial pustule, folliculitis or mild cellulitis', redFlagTrigger: true },
  ],
};

export const DURATION_OPTIONS = [
  'Today (Sudden onset)',
  '1 - 2 days',
  '3 - 5 days',
  '1 - 2 weeks',
  'More than 2 weeks',
];

/**
 * Deterministic Mock AI Triage Engine
 * Calculates Risk Level, Red Flags, Suggested Department, Conditions, and Physician Handover Summary
 */
export function evaluateMedicalTriage(input: PatientRegistrationInput): AIAnalysisResult {
  const selectedSymptoms = input.symptoms;
  const age = Number(input.age) || 30;
  const duration = input.duration;

  // Department assignment based on symptom count in each department
  const genMedCount = selectedSymptoms.filter((s) =>
    SYMPTOMS_BY_DEPARTMENT['General Medicine'].some((item) => item.name === s)
  ).length;

  const dermCount = selectedSymptoms.filter((s) =>
    SYMPTOMS_BY_DEPARTMENT['Dermatology'].some((item) => item.name === s)
  ).length;

  const suggestedDepartment: Department =
    dermCount > genMedCount ? 'Dermatology' : 'General Medicine';

  // Risk & Red Flags Evaluation
  const redFlags: string[] = [];
  let riskLevel: RiskLevel = 'Low';

  const hasFever = selectedSymptoms.includes('Fever');
  const hasCough = selectedSymptoms.includes('Cough');
  const hasHeadache = selectedSymptoms.includes('Headache');
  const hasInfection = selectedSymptoms.includes('Minor skin infection');
  const hasRash = selectedSymptoms.includes('Skin rash');
  const isLongDuration = duration === 'More than 2 weeks' || duration === '1 - 2 weeks';

  if (suggestedDepartment === 'General Medicine') {
    if (hasFever && hasCough && isLongDuration) {
      riskLevel = 'High';
      redFlags.push('Prolonged febrile respiratory illness (>1 week) — Rule out Lower Respiratory Infection / Pneumonia');
    } else if (hasFever && hasHeadache && age > 50) {
      riskLevel = 'High';
      redFlags.push('High fever with severe cephalalgia in older adult — Rule out CNS infection or severe systemic infection');
    } else if (hasFever && selectedSymptoms.length >= 3) {
      riskLevel = 'Medium';
      redFlags.push('Multiple systemic symptoms with active pyrexia; monitor hydration & temperature trajectory');
    } else if (isLongDuration) {
      riskLevel = 'Medium';
      redFlags.push('Subacute duration (>1 week) without spontaneous resolution');
    } else {
      riskLevel = 'Low';
    }
  } else {
    // Dermatology
    if (hasInfection && (hasRash || isLongDuration)) {
      riskLevel = 'High';
      redFlags.push('Suspected spreading bacterial dermopathy / secondary cutaneous infection requiring prompt antimicrobial assessment');
    } else if (hasRash && selectedSymptoms.includes('Redness') && selectedSymptoms.includes('Itching')) {
      riskLevel = 'Medium';
      redFlags.push('Active widespread cutaneous inflammation; risk of secondary excoriation or contact sensitization');
    } else if (isLongDuration) {
      riskLevel = 'Medium';
      redFlags.push('Chronic dermatological manifestation (>2 weeks) — evaluate for chronic eczema or fungal dermatosis');
    } else {
      riskLevel = 'Low';
    }
  }

  // If no red flags were triggered
  if (redFlags.length === 0) {
    redFlags.push('No acute physiological red flags detected. Vital signs stable on initial digital triage.');
  }

  // Possible Conditions (preliminary differential for triage)
  let possibleConditions: string[] = [];
  if (suggestedDepartment === 'General Medicine') {
    if (hasFever && hasCough && selectedSymptoms.includes('Sore throat')) {
      possibleConditions = ['Acute Viral Upper Respiratory Infection (URI)', 'Pharyngotonsillitis', 'Seasonal Influenza'];
    } else if (hasFever && selectedSymptoms.includes('Body pain')) {
      possibleConditions = ['Viral Fever / Dengue-like Syndrome', 'Influenza-like Illness', 'Acute Myalgia'];
    } else if (hasHeadache) {
      possibleConditions = ['Tension-type Headache', 'Sinusitis / Rhinitis', 'Febrile Cephalea'];
    } else {
      possibleConditions = ['Acute Viral Syndrome', 'Non-specific Upper Airway Infection', 'General Physical Fatigue'];
    }
  } else {
    if (hasRash && selectedSymptoms.includes('Itching')) {
      possibleConditions = ['Allergic Contact Dermatitis', 'Acute Urticaria', 'Atopic Eczema Flare'];
    } else if (hasInfection) {
      possibleConditions = ['Bacterial Folliculitis / Impetigo', 'Superficial Pyoderma', 'Localized Cellulitis (Mild)'];
    } else {
      possibleConditions = ['Erythema / Irritant Dermatitis', 'Cutaneous Pruritus', 'Mild Xerosis Cutis'];
    }
  }

  // Recommended Action
  let recommendedAction = '';
  if (riskLevel === 'High') {
    recommendedAction = `Priority Physician Consultation at ${suggestedDepartment} OPD. Urgent clinical examination, vital signs check, and baseline laboratory workup advised. Avoid self-medication.`;
  } else if (riskLevel === 'Medium') {
    recommendedAction = `Same-day Consultation at ${suggestedDepartment} OPD. Comprehensive physical exam recommended. Maintain oral hydration and record temperature/skin lesion progression.`;
  } else {
    recommendedAction = `Standard OPD Consultation at ${suggestedDepartment} OPD. Routine physical assessment, symptomatic relief guidance, and preventive health counseling.`;
  }

  // Doctor Clinical Handover Summary (SBAR style)
  const patientDesc = `${input.name ? input.name : 'Unidentified Patient'}, ${input.age || 'N/A'}y ${input.gender || 'Patient'}`;
  const shortDoctorSummary = `Patient (${patientDesc}) presents with ${selectedSymptoms.join(', ')} of duration [${duration}]. Primary triage indicators align with ${suggestedDepartment}. Risk classified as ${riskLevel}. ${redFlags[0]}. Suggested initial focus: ${possibleConditions[0]}. Requires attending physician clinical validation.`;

  return {
    riskLevel,
    redFlags,
    suggestedDepartment,
    possibleConditions,
    recommendedAction,
    shortDoctorSummary,
    confidenceScore: 94,
  };
}

// Initial Mock Patients in Doctor Dashboard
export const INITIAL_PATIENTS: PatientRecord[] = [
  {
    id: 'SC-2026-0841',
    tokenNumber: 'GM-042',
    createdAt: '10 mins ago',
    name: 'Ramesh Verma',
    age: 54,
    gender: 'Male',
    symptoms: ['Fever', 'Cough', 'Body pain'],
    duration: '1 - 2 weeks',
    department: 'General Medicine',
    opdRoom: 'Room 104 — General Medicine OPD',
    status: 'Pending Review',
    analysis: {
      riskLevel: 'High',
      redFlags: [
        'Prolonged febrile respiratory illness (>1 week) in patient over 50. Rule out Lower Respiratory Infection / Pneumonia.',
      ],
      suggestedDepartment: 'General Medicine',
      possibleConditions: ['Acute Bronchitis', 'Bacterial Pneumonia', 'Seasonal Influenza'],
      recommendedAction: 'Priority OPD consult. Auscultate chest, check SpO2 vitals immediately, consider chest X-ray and CBC.',
      shortDoctorSummary: '54y Male presenting with persistent fever and cough for over 10 days accompanied by myalgia. Elevated risk profile due to duration and age. Auscultation and chest imaging recommended.',
      confidenceScore: 96,
    },
  },
  {
    id: 'SC-2026-0842',
    tokenNumber: 'DERM-018',
    createdAt: '22 mins ago',
    name: 'Priya Sharma',
    age: 27,
    gender: 'Female',
    symptoms: ['Skin rash', 'Itching', 'Redness'],
    duration: '3 - 5 days',
    department: 'Dermatology',
    opdRoom: 'Room 208 — Dermatology Clinic',
    status: 'Under Review',
    analysis: {
      riskLevel: 'Medium',
      redFlags: [
        'Active widespread cutaneous erythema and pruritus. Prevent excoriation to avoid secondary microbial invasion.',
      ],
      suggestedDepartment: 'Dermatology',
      possibleConditions: ['Allergic Contact Dermatitis', 'Acute Urticaria', 'Atopic Eczema Flare'],
      recommendedAction: 'Same-day Dermatology OPD review. Assess distribution of rash and allergen exposures. Provide topical emollients/antihistamines.',
      shortDoctorSummary: '27y Female with 4-day history of intensely pruritic maculopapular rash and erythema. No systemic fever. Consistent with allergic or contact dermatosis. Physical skin examination indicated.',
      confidenceScore: 92,
    },
  },
  {
    id: 'SC-2026-0843',
    tokenNumber: 'GM-043',
    createdAt: '35 mins ago',
    name: 'Amina Begum',
    age: 32,
    gender: 'Female',
    symptoms: ['Sore throat', 'Headache'],
    duration: '1 - 2 days',
    department: 'General Medicine',
    opdRoom: 'Room 104 — General Medicine OPD',
    status: 'Approved',
    doctorNotes: 'Examined pharynx: mild cobblestoning, no purulent exudates. Advised warm saline gargles, Paracetamol PRN, and oral hydration. Follow up if fever develops.',
    approvedAt: '5 mins ago',
    approvedBy: 'Dr. S. K. Gupta (MD, Internal Med)',
    analysis: {
      riskLevel: 'Low',
      redFlags: [
        'No acute physiological red flags detected. Vital signs stable on initial digital triage.',
      ],
      suggestedDepartment: 'General Medicine',
      possibleConditions: ['Acute Pharyngitis (Viral)', 'Tension Cephalea', 'Mild Rhinopharyngitis'],
      recommendedAction: 'Standard General Medicine OPD review. Symptomatic management and routine ENT evaluation.',
      shortDoctorSummary: '32y Female with 2-day sore throat and tension-like headache. Low risk triage profile. Advise physical pharynx inspection and supportive symptomatic therapy.',
      confidenceScore: 90,
    },
  },
  {
    id: 'SC-2026-0844',
    tokenNumber: 'DERM-019',
    createdAt: '48 mins ago',
    name: 'Karan Malhotra',
    age: 41,
    gender: 'Male',
    symptoms: ['Minor skin infection', 'Redness'],
    duration: '3 - 5 days',
    department: 'Dermatology',
    opdRoom: 'Room 208 — Dermatology Clinic',
    status: 'Pending Review',
    analysis: {
      riskLevel: 'High',
      redFlags: [
        'Suspected localized bacterial dermopathy (folliculitis/furunculosis) with surrounding erythema.',
      ],
      suggestedDepartment: 'Dermatology',
      possibleConditions: ['Bacterial Folliculitis', 'Localized Cellulitis', 'Furuncle / Carbuncle'],
      recommendedAction: 'Prompt Dermatology OPD examination. Palpate for fluctuance or local warmth. Consider topical mupirocin or systemic oral cephalosporin if spreading.',
      shortDoctorSummary: '41y Male presenting with progressive localized erythematous skin infection over 4 days. High priority triage for antibacterial evaluation.',
      confidenceScore: 95,
    },
  },
];
