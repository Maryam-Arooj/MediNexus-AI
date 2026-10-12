/**
 * Deterministic, rule-based triage (NOT machine learning, NOT a diagnosis).
 *
 * rules-v2 changes vs. the original rules:
 *  - Rules for BOTH departments are always evaluated and the highest risk wins
 *    (rules-v1 ignored e.g. Fever when a patient also picked two skin symptoms).
 *  - No fabricated findings: the old texts claimed "vital signs stable" and "severe cephalalgia",
 *    but no vital signs or severity are collected. Flags now only restate what the patient selected.
 *  - No fake confidence score.
 */
import {
  Department,
  DEPARTMENTS,
  ENGINE_VERSION,
  LONG_DURATIONS,
  RiskLevel,
  SYMPTOMS_BY_DEPARTMENT,
} from './triageConfig';

export interface TriageInput {
  name: string;
  age: number;
  gender: string;
  symptoms: string[];
  duration: string;
}

export interface TriageOutput {
  engineVersion: string;
  riskLevel: RiskLevel;
  riskReason: string;
  redFlags: string[];
  suggestedDepartment: Department;
  possibleConditions: string[];
  recommendedAction: string;
  doctorHandoverSummary: string;
}

interface RuleHit {
  level: RiskLevel;
  reason: string;
  flag: string;
}

const RANK: Record<RiskLevel, number> = { Low: 0, Medium: 1, High: 2 };

function inDept(dept: Department, symptoms: string[]): number {
  return symptoms.filter((s) => SYMPTOMS_BY_DEPARTMENT[dept].some((d) => d.name === s)).length;
}

export function evaluateMedicalTriage(input: TriageInput): TriageOutput {
  const s = input.symptoms;
  const has = (x: string) => s.includes(x);
  const age = Number(input.age);
  const longDuration = LONG_DURATIONS.includes(input.duration);

  // Department: the group with more selected symptoms (tie → General Medicine).
  const suggestedDepartment: Department =
    inDept('Dermatology', s) > inDept('General Medicine', s) ? 'Dermatology' : 'General Medicine';

  const hits: RuleHit[] = [];

  // ── General Medicine rules ──
  if (has('Fever') && has('Cough') && longDuration) {
    hits.push({
      level: 'High',
      reason: 'Fever and cough for 1 week or more',
      flag: 'Fever with cough lasting 1 week or more — flagged for priority doctor review (for example, to check for a chest infection).',
    });
  }
  if (has('Fever') && has('Headache') && age > 50) {
    hits.push({
      level: 'High',
      reason: 'Fever and headache in a patient over 50',
      flag: 'Fever with headache in a patient over 50 — flagged for priority doctor review.',
    });
  }
  if (has('Fever') && s.length >= 3) {
    hits.push({
      level: 'Medium',
      reason: 'Fever together with 2 or more other symptoms',
      flag: 'Fever together with several other symptoms — same-day doctor review advised.',
    });
  }

  // ── Dermatology rules ──
  if (has('Minor skin infection') && (has('Skin rash') || longDuration)) {
    hits.push({
      level: 'High',
      reason: has('Skin rash') ? 'Skin infection together with a rash' : 'Skin infection for 1 week or more',
      flag: 'Possible spreading skin infection — flagged for priority doctor review.',
    });
  }
  if (has('Skin rash') && has('Redness') && has('Itching')) {
    hits.push({
      level: 'Medium',
      reason: 'Rash with redness and itching',
      flag: 'Rash with redness and itching — same-day doctor review advised.',
    });
  }

  // ── Duration rule (any department) ──
  if (longDuration) {
    hits.push({
      level: 'Medium',
      reason: 'Symptoms for 1 week or more',
      flag: 'Symptoms reported for 1 week or more without getting better.',
    });
  }

  let riskLevel: RiskLevel = 'Low';
  for (const h of hits) if (RANK[h.level] > RANK[riskLevel]) riskLevel = h.level;
  const top = hits.filter((h) => h.level === riskLevel);
  const riskReason =
    top.length > 0
      ? top.map((h) => h.reason).join('; ')
      : 'No priority rule matched the selected symptoms and duration';
  const redFlags = [...new Set(hits.map((h) => h.flag))];

  // Conditions for the doctor to consider (shown to doctors only, never as a diagnosis).
  let possibleConditions: string[];
  if (suggestedDepartment === 'General Medicine') {
    if (has('Fever') && has('Cough') && has('Sore throat')) {
      possibleConditions = ['Viral upper respiratory infection', 'Pharyngitis / tonsillitis', 'Seasonal influenza'];
    } else if (has('Fever') && has('Body pain')) {
      possibleConditions = ['Viral fever (consider dengue in season)', 'Influenza-like illness', 'Myalgia'];
    } else if (has('Headache')) {
      possibleConditions = ['Tension-type headache', 'Sinusitis', 'Headache associated with fever'];
    } else {
      possibleConditions = ['Viral illness', 'Upper airway infection', 'General fatigue'];
    }
  } else if (has('Skin rash') && has('Itching')) {
    possibleConditions = ['Contact dermatitis', 'Urticaria', 'Eczema flare'];
  } else if (has('Minor skin infection')) {
    possibleConditions = ['Folliculitis / impetigo', 'Superficial skin infection', 'Mild cellulitis'];
  } else {
    possibleConditions = ['Irritant dermatitis', 'Pruritus', 'Dry skin (xerosis)'];
  }

  const opd = `${suggestedDepartment} OPD (${DEPARTMENTS[suggestedDepartment].room.split('—')[0].trim()})`;
  const emergencyNote =
    'If you develop severe breathing difficulty, chest pain, confusion, fainting or a rapidly spreading rash, go to the Emergency department immediately.';
  let recommendedAction: string;
  if (riskLevel === 'High') {
    recommendedAction = `Priority consultation: go to ${opd} now and show this slip — your case is flagged for priority review. Avoid self-medication. ${emergencyNote}`;
  } else if (riskLevel === 'Medium') {
    recommendedAction = `Same-day consultation at ${opd}. Drink enough fluids and note any change in your symptoms. ${emergencyNote}`;
  } else {
    recommendedAction = `Routine consultation at ${opd}. ${emergencyNote}`;
  }

  const who = `${input.name || 'Patient'}, ${age}y ${input.gender}`;
  const doctorHandoverSummary =
    `Patient-reported (${who}): ${s.join(', ')} for ${input.duration}. ` +
    `Rule-based triage (${ENGINE_VERSION}) → ${suggestedDepartment}, risk ${riskLevel} (${riskReason}). ` +
    `${redFlags.length ? `Rule flags: ${redFlags.join(' ')} ` : ''}` +
    'No examination or vital signs recorded. Not a diagnosis — requires clinical assessment.';

  return {
    engineVersion: ENGINE_VERSION,
    riskLevel,
    riskReason,
    redFlags,
    suggestedDepartment,
    possibleConditions,
    recommendedAction,
    doctorHandoverSummary,
  };
}
