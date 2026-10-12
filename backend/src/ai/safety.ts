/**
 * Shared server-side safety filters for AI output. The model is instructed not to give medication
 * advice, but instructions alone are not enough — these checks run on everything it returns.
 */

// A number followed by a dose unit, e.g. "500 mg", "2 tablets", "5ml".
const DOSE_PATTERN = /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|ml|iu|units?|tablets?|tabs?|capsules?|caps?|drops?|puffs?|sachets?|teaspoons?|tsp)\b/i;

// Common medicine names seen in Pakistan. Guidance lines that name a medicine are dropped.
const MEDICINE_NAMES =
  /\b(paracetamol|panadol|calpol|acetaminophen|ibuprofen|brufen|aspirin|disprin|diclofenac|naproxen|mefenamic|ponstan|amoxicillin|augmentin|amoxil|azithromycin|zithromax|ciprofloxacin|levofloxacin|metronidazole|flagyl|doxycycline|cefixime|ceftriaxone|clarithromycin|cetirizine|loratadine|fexofenadine|chlorpheniramine|prednisolone|dexamethasone|hydrocortisone|betamethasone|omeprazole|esomeprazole|loperamide|antibiotic course|cough syrup)\b/i;

export function hasDose(text: string): boolean {
  return DOSE_PATTERN.test(text);
}

/** True when a guidance line recommends a specific medicine or dose. */
export function isMedicationAdvice(text: string): boolean {
  return hasDose(text) || MEDICINE_NAMES.test(text);
}

export const clip = (s: unknown, max: number): string =>
  typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function cleanList(v: unknown, maxItems: number, maxLen: number, drop?: (s: string) => boolean): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const s = clip(item, maxLen);
    if (!s || (drop && drop(s)) || out.includes(s)) continue;
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

export const AI_DISCLAIMER =
  'AI-generated suggestion. Not a medical diagnosis. It can be wrong. A qualified doctor makes all medical decisions.';
