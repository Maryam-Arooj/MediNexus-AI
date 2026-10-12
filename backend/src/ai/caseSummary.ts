/**
 * AI doctor case summary (LLM: Google Gemini) — a draft to help clinical review, never stored.
 * Only de-identified clinical fields are sent: no name, CNIC, phone, email, patient id or token.
 */
import { generateJson } from '../services/llm';
import { AI_DISCLAIMER, cleanList, clip, isMedicationAdvice } from './safety';

export interface CaseSummaryInput {
  age: number;
  gender: string;
  symptoms: string[];
  duration: string;
  department: string;
  riskLevel: string | null;
  riskReason: string | null;
  ruleFlags: string[];
  ruleConditionsToConsider: string[];
}

export interface CaseSummary {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  questionsToAsk: string[];
  disclaimer: string;
}

const SYSTEM = `You write a short SBAR handover draft for an outpatient doctor in a government hospital in Pakistan.
Use ONLY the structured case data given. Do not invent findings, vital signs, examination results or history.
No examination or vital signs have been recorded. Do not diagnose and do not prescribe or name medicine doses.
- "situation": one sentence (age, gender, main complaints, duration).
- "background": what is known and what is NOT yet known.
- "assessment": the rule-based triage result and flags, and which conditions are worth considering (as possibilities).
- "recommendation": what the doctor may want to verify first (examination, vitals, red flags to exclude).
- "questionsToAsk": 3-5 focused history questions.
Each field under 60 words. Plain clinical English.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    situation: { type: 'STRING' },
    background: { type: 'STRING' },
    assessment: { type: 'STRING' },
    recommendation: { type: 'STRING' },
    questionsToAsk: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['situation', 'background', 'assessment', 'recommendation', 'questionsToAsk'],
};

export function buildCaseSummaryPrompt(c: CaseSummaryInput): string {
  return `CASE DATA (JSON):\n${JSON.stringify(c, null, 2)}`;
}

export function sanitizeCaseSummary(raw: unknown): CaseSummary {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    situation: clip(r.situation, 500),
    background: clip(r.background, 500),
    assessment: clip(r.assessment, 600),
    recommendation: clip(r.recommendation, 600),
    questionsToAsk: cleanList(r.questionsToAsk, 5, 200, isMedicationAdvice),
    disclaimer: AI_DISCLAIMER,
  };
}

export async function summarizeCase(c: CaseSummaryInput): Promise<CaseSummary> {
  const raw = await generateJson({
    task: 'case-summary',
    system: SYSTEM,
    parts: [{ text: buildCaseSummaryPrompt(c) }],
    responseSchema: RESPONSE_SCHEMA,
  });
  return sanitizeCaseSummary(raw);
}
