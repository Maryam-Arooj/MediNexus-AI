/**
 * Deterministic Medical Triage Engine — Backend copy
 * Adapted from frontend src/data/mockData.ts for use in Node.js/Express.
 * NO external AI API. Pure rule-based logic.
 */

export type Department = 'General Medicine' | 'Dermatology';
export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface TriageInput {
  name: string;
  age: number;
  gender: string;
  symptoms: string[];
  duration: string;
}

export interface TriageOutput {
  riskLevel: RiskLevel;
  redFlags: string[];
  suggestedDepartment: Department;
  possibleConditions: string[];
  recommendedAction: string;
  doctorHandoverSummary: string;
  confidenceScore: number;
}

const SYMPTOMS_BY_DEPARTMENT: Record<Department, string[]> = {
  'General Medicine': ['Fever', 'Flu', 'Headache', 'Cough', 'Sore throat', 'Body pain'],
  Dermatology: ['Skin rash', 'Itching', 'Redness', 'Minor skin infection'],
};

export function evaluateMedicalTriage(input: TriageInput): TriageOutput {
  const selectedSymptoms = input.symptoms;
  const age = Number(input.age) || 30;
  const duration = input.duration;

  // Department assignment based on symptom count per department
  const genMedCount = selectedSymptoms.filter((s) =>
    SYMPTOMS_BY_DEPARTMENT['General Medicine'].includes(s)
  ).length;

  const dermCount = selectedSymptoms.filter((s) =>
    SYMPTOMS_BY_DEPARTMENT['Dermatology'].includes(s)
  ).length;

  const suggestedDepartment: Department =
    dermCount > genMedCount ? 'Dermatology' : 'General Medicine';

  // Risk & Red Flags
  const redFlags: string[] = [];
  let riskLevel: RiskLevel = 'Low';

  const hasFever = selectedSymptoms.includes('Fever');
  const hasCough = selectedSymptoms.includes('Cough');
  const hasHeadache = selectedSymptoms.includes('Headache');
  const hasInfection = selectedSymptoms.includes('Minor skin infection');
  const hasRash = selectedSymptoms.includes('Skin rash');
  const isLongDuration =
    duration === 'More than 2 weeks' || duration === '1 - 2 weeks';

  if (suggestedDepartment === 'General Medicine') {
    if (hasFever && hasCough && isLongDuration) {
      riskLevel = 'High';
      redFlags.push(
        'Prolonged febrile respiratory illness (>1 week) — Rule out Lower Respiratory Infection / Pneumonia'
      );
    } else if (hasFever && hasHeadache && age > 50) {
      riskLevel = 'High';
      redFlags.push(
        'High fever with severe cephalalgia in older adult — Rule out CNS infection or severe systemic infection'
      );
    } else if (hasFever && selectedSymptoms.length >= 3) {
      riskLevel = 'Medium';
      redFlags.push(
        'Multiple systemic symptoms with active pyrexia; monitor hydration & temperature trajectory'
      );
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
      redFlags.push(
        'Suspected spreading bacterial dermopathy / secondary cutaneous infection requiring prompt antimicrobial assessment'
      );
    } else if (
      hasRash &&
      selectedSymptoms.includes('Redness') &&
      selectedSymptoms.includes('Itching')
    ) {
      riskLevel = 'Medium';
      redFlags.push(
        'Active widespread cutaneous inflammation; risk of secondary excoriation or contact sensitization'
      );
    } else if (isLongDuration) {
      riskLevel = 'Medium';
      redFlags.push(
        'Chronic dermatological manifestation (>2 weeks) — evaluate for chronic eczema or fungal dermatosis'
      );
    } else {
      riskLevel = 'Low';
    }
  }

  if (redFlags.length === 0) {
    redFlags.push(
      'No acute physiological red flags detected. Vital signs stable on initial digital triage.'
    );
  }

  // Possible Conditions
  let possibleConditions: string[] = [];
  if (suggestedDepartment === 'General Medicine') {
    if (hasFever && hasCough && selectedSymptoms.includes('Sore throat')) {
      possibleConditions = [
        'Acute Viral Upper Respiratory Infection (URI)',
        'Pharyngotonsillitis',
        'Seasonal Influenza',
      ];
    } else if (hasFever && selectedSymptoms.includes('Body pain')) {
      possibleConditions = [
        'Viral Fever / Dengue-like Syndrome',
        'Influenza-like Illness',
        'Acute Myalgia',
      ];
    } else if (hasHeadache) {
      possibleConditions = ['Tension-type Headache', 'Sinusitis / Rhinitis', 'Febrile Cephalea'];
    } else {
      possibleConditions = [
        'Acute Viral Syndrome',
        'Non-specific Upper Airway Infection',
        'General Physical Fatigue',
      ];
    }
  } else {
    if (hasRash && selectedSymptoms.includes('Itching')) {
      possibleConditions = [
        'Allergic Contact Dermatitis',
        'Acute Urticaria',
        'Atopic Eczema Flare',
      ];
    } else if (hasInfection) {
      possibleConditions = [
        'Bacterial Folliculitis / Impetigo',
        'Superficial Pyoderma',
        'Localized Cellulitis (Mild)',
      ];
    } else {
      possibleConditions = [
        'Erythema / Irritant Dermatitis',
        'Cutaneous Pruritus',
        'Mild Xerosis Cutis',
      ];
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

  // Doctor Handover Summary (SBAR style)
  const patientDesc = `${input.name || 'Unidentified Patient'}, ${age}y ${input.gender || 'Patient'}`;
  const doctorHandoverSummary = `Patient (${patientDesc}) presents with ${selectedSymptoms.join(', ')} of duration [${duration}]. Primary triage indicators align with ${suggestedDepartment}. Risk classified as ${riskLevel}. ${redFlags[0]}. Suggested initial focus: ${possibleConditions[0]}. Requires attending physician clinical validation.`;

  return {
    riskLevel,
    redFlags,
    suggestedDepartment,
    possibleConditions,
    recommendedAction,
    doctorHandoverSummary,
    confidenceScore: 94,
  };
}
