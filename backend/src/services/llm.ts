/**
 * Minimal Google Gemini client (REST, built-in fetch — no extra npm packages).
 *
 * Safety/privacy rules enforced here:
 *  - The API key is sent in the `x-goog-api-key` header, never in the URL, and is never logged.
 *  - Prompts, responses and uploaded files are never logged. Only the model name and an HTTP status are.
 *  - Every failure becomes a safe 503 for the client. Callers must validate the returned JSON themselves.
 */
import { getAiConfig } from '../config/env';
import { HttpError } from '../lib/httpError';

export const AI_UNAVAILABLE_MESSAGE = 'The AI assistant is unavailable right now. You can continue without it.';
export const AI_DISABLED_MESSAGE = 'The AI assistant is not configured on this server (GEMINI_API_KEY is missing).';

export class AiError extends HttpError {
  constructor(message = AI_UNAVAILABLE_MESSAGE, public readonly reason: 'disabled' | 'unavailable' = 'unavailable') {
    super(503, message);
    this.name = 'AiError';
  }
}

export function isAiEnabled(): boolean {
  return getAiConfig().apiKey !== null;
}

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export interface GenerateJsonOptions {
  /** System instruction (rules for the model). */
  system: string;
  /** User content parts (text and/or inline files). */
  parts: GeminiPart[];
  /** Gemini response schema (OpenAPI subset) — forces structured JSON output. */
  responseSchema: Record<string, unknown>;
  /** Max output tokens (default 8192; Gemini 2.5 "thinking" also uses this budget). */
  maxOutputTokens?: number;
  /** Short label used in logs, e.g. "symptoms". */
  task: string;
}

class RetryableError extends Error {}

async function callModel(model: string, apiKey: string, timeoutMs: number, apiBase: string, opts: GenerateJsonOptions): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${apiBase}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: 'user', parts: opts.parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: opts.maxOutputTokens ?? 8192,
          responseMimeType: 'application/json',
          responseSchema: opts.responseSchema,
        },
      }),
    });
  } catch {
    // Network error or timeout (abort).
    console.warn(`[ai] ${opts.task}: ${model} network error or timeout`);
    throw new RetryableError();
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    console.warn(`[ai] ${opts.task}: ${model} returned HTTP ${res.status}`);
    if (res.status === 429 || res.status >= 500 || res.status === 404) throw new RetryableError();
    // 400/401/403: bad key, bad request or blocked — retrying will not help.
    throw new AiError(
      res.status === 400 || res.status === 401 || res.status === 403
        ? 'The AI service rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL in backend/.env.'
        : AI_UNAVAILABLE_MESSAGE
    );
  }

  let body: { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new RetryableError();
  }
  const candidate = body.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) {
    console.warn(`[ai] ${opts.task}: ${model} returned no content (finishReason=${candidate?.finishReason ?? 'none'})`);
    throw new AiError('The AI could not produce an answer for this input. Please rephrase or continue without it.');
  }
  try {
    return JSON.parse(text);
  } catch {
    console.warn(`[ai] ${opts.task}: ${model} returned invalid JSON`);
    throw new RetryableError();
  }
}

/**
 * Calls Gemini and returns the parsed JSON (unvalidated — always validate with zod).
 * On rate limits, server errors or timeouts it tries main → fallback → main (no fallback: main → main),
 * all within one total time budget (GEMINI_TOTAL_BUDGET_MS, default 45 s).
 */
export async function generateJson(opts: GenerateJsonOptions): Promise<unknown> {
  const cfg = getAiConfig();
  if (!cfg.apiKey) throw new AiError(AI_DISABLED_MESSAGE, 'disabled');
  const budgetMs = parseInt(process.env.GEMINI_TOTAL_BUDGET_MS || '45000', 10) || 45000;
  const deadline = Date.now() + budgetMs;
  const attempts = cfg.fallbackModel ? [cfg.model, cfg.fallbackModel, cfg.model] : [cfg.model, cfg.model];
  for (const model of attempts) {
    const timeLeft = deadline - Date.now();
    if (timeLeft <= 0) break;
    try {
      return await callModel(model, cfg.apiKey, Math.min(cfg.timeoutMs, timeLeft), cfg.apiBase, opts);
    } catch (err) {
      if (err instanceof RetryableError) continue;
      throw err;
    }
  }
  throw new AiError();
}
