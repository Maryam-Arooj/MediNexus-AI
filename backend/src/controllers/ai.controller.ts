import { Request, Response } from 'express';
import { z } from 'zod';
import { detectEmergency } from '../triage/emergencyRules';
import { analyzeSymptomText, SymptomAnalysis } from '../ai/symptomAssistant';
import { explainDocument } from '../ai/documentExplainer';
import { AiError, isAiEnabled } from '../services/llm';

const symptomTextSchema = z
  .object({
    text: z
      .string({ required_error: 'Please describe your symptoms.' })
      .trim()
      .min(3, 'Please describe your symptoms in a few words.')
      .max(800, 'Please keep the description under 800 characters.'),
  })
  .strip();

const documentSchema = z
  .object({
    fileBase64: z.string().max(6_000_000, 'The file is too large. The maximum size is 4 MB.').optional(),
    mimeType: z.string().max(60).optional(),
    text: z.string().trim().min(10, 'Please paste a little more of the document text.').max(8000, 'Please paste at most 8000 characters.').optional(),
  })
  .strip()
  .refine((d) => Boolean(d.fileBase64) !== Boolean(d.text), {
    message: 'Please upload one file OR paste the text (not both).',
    path: ['body'],
  });

/**
 * POST /api/ai/symptoms — free text → emergency check (RULES, always) + AI understanding (LLM, if available).
 * Returns 200 even when the AI is unavailable, so the emergency check never depends on the AI.
 * Nothing is stored.
 */
export async function symptoms(req: Request, res: Response) {
  const { text } = symptomTextSchema.parse(req.body ?? {});
  const emergency = detectEmergency(text);

  let ai: SymptomAnalysis | null = null;
  let aiStatus: 'ok' | 'disabled' | 'unavailable' = 'ok';
  let aiMessage: string | null = null;
  if (!isAiEnabled()) {
    aiStatus = 'disabled';
    aiMessage = 'The AI assistant is not configured. Please choose your symptoms below.';
  } else {
    try {
      ai = await analyzeSymptomText(text);
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      aiStatus = 'unavailable';
      aiMessage = err.message;
    }
  }
  res.json({ success: true, data: { emergency, ai, aiStatus, aiMessage } });
}

/** POST /api/ai/document — explain a lab report or prescription (image/PDF or pasted text). Nothing is stored. */
export async function document(req: Request, res: Response) {
  const input = documentSchema.parse(req.body ?? {});
  res.json({ success: true, data: await explainDocument(input) });
}
