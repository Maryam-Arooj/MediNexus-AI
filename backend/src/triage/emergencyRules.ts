/**
 * Emergency red-flag detection — DETERMINISTIC RULES, not AI.
 *
 * Emergency safety must never depend on an external AI service, so this runs on the server for every
 * free-text analysis and every case submission, works offline, and is fully unit-tested.
 * Two inputs:
 *   1. A danger-sign checklist the patient ticks (most reliable).
 *   2. Phrase matching in free text (English, Urdu script and Roman Urdu).
 * It deliberately errs on the side of caution: a match only shows emergency guidance and raises the
 * priority — the patient can still continue, and a doctor always reviews the case.
 */

export interface DangerSign {
  id: string;
  label: string;
  labelUr: string;
  phrases: string[];
}

export const DANGER_SIGNS: DangerSign[] = [
  {
    id: 'chest_pain',
    label: 'Chest pain or chest pressure',
    labelUr: 'سینے میں درد یا دباؤ',
    phrases: [
      'chest pain', 'chest pressure', 'chest tightness', 'tight chest', 'pain in chest', 'pain in my chest', 'heart pain',
      'seene mein dard', 'seene mein dabao', 'chhati mein dard', 'dil mein dard', 'dil ka dard',
      'سینے میں درد', 'سینے میں دباؤ', 'چھاتی میں درد', 'دل میں درد',
    ],
  },
  {
    id: 'breathing',
    label: 'Severe difficulty breathing',
    labelUr: 'سانس لینے میں شدید دشواری',
    phrases: [
      "can't breathe", 'cannot breathe', 'cant breathe', 'difficulty breathing', 'trouble breathing', 'hard to breathe',
      'shortness of breath', 'short of breath', 'breathless', 'gasping', 'struggling to breathe',
      'saans nahi', 'saans lene mein', 'saans phool', 'saans ruk', 'saans band', 'dam ghut',
      'سانس نہیں', 'سانس لینے میں', 'سانس پھول', 'سانس رک', 'دم گھٹ',
    ],
  },
  {
    id: 'unconscious',
    label: 'Fainting or unresponsive',
    labelUr: 'بے ہوشی',
    phrases: [
      'unconscious', 'fainted', 'fainting', 'passed out', 'unresponsive', 'collapsed', 'not responding',
      'behosh', 'be hosh', 'behoshi', 'hosh nahi', 'gir gaya', 'gir gayi',
      'بے ہوش', 'بیہوش', 'بے ہوشی', 'ہوش نہیں',
    ],
  },
  {
    id: 'seizure',
    label: 'Seizure (fits)',
    labelUr: 'دورہ یا جھٹکے',
    phrases: [
      'seizure', 'seizures', 'convulsion', 'convulsions', 'fits', 'having a fit',
      'mirgi', 'jhatke', 'daura para', 'daura pada', 'dora para', 'daure',
      'مرگی', 'دورہ پڑا', 'دورے', 'جھٹکے',
    ],
  },
  {
    id: 'stroke_signs',
    label: 'Face drooping, one-sided weakness or slurred speech',
    labelUr: 'منہ ٹیڑھا، ایک طرف کمزوری یا زبان لڑکھڑانا',
    phrases: [
      'face drooping', 'drooping face', 'slurred speech', 'weakness on one side', 'one side weak', 'numbness on one side',
      'cannot move my arm', 'paralysis', 'paralysed', 'paralyzed', 'stroke', 'worst headache of my life', 'sudden severe headache',
      'falij', 'faalij', 'lakwa', 'laqwa', 'munh terha', 'mun terha', 'zuban larkhara', 'zaban larkhara',
      'فالج', 'لقوہ', 'منہ ٹیڑھا', 'زبان لڑکھڑا',
    ],
  },
  {
    id: 'severe_bleeding',
    label: 'Heavy bleeding, or coughing or vomiting blood',
    labelUr: 'زیادہ خون بہنا یا خون کی الٹی',
    phrases: [
      'heavy bleeding', 'severe bleeding', "bleeding won't stop", 'bleeding will not stop', 'bleeding not stopping',
      'vomiting blood', 'blood in vomit', 'coughing blood', 'coughing up blood', 'blood in cough',
      'khoon ki ulti', 'khoon ki ultee', 'khansi mein khoon', 'khoon nahi ruk', 'bohat khoon', 'bahut khoon',
      'خون کی الٹی', 'کھانسی میں خون', 'خون نہیں رک', 'بہت خون',
    ],
  },
  {
    id: 'confusion',
    label: 'New confusion or very hard to wake',
    labelUr: 'اچانک الجھن یا شدید غنودگی',
    phrases: [
      'confused', 'confusion', 'disoriented', 'very drowsy', 'hard to wake', 'not waking up', "can't wake",
      'hosh mein nahi', 'kuch samajh nahi aa raha', 'neend se nahi uth',
      'الجھن', 'غنودگی', 'ہوش میں نہیں',
    ],
  },
  {
    id: 'stiff_neck_fever',
    label: 'Fever with a stiff neck',
    labelUr: 'بخار کے ساتھ گردن اکڑنا',
    phrases: [
      'stiff neck', 'neck stiffness', 'neck is stiff',
      'gardan akar', 'gardan akri', 'gardan sakht', 'gardan mein akrao',
      'گردن اکڑ', 'گردن سخت',
    ],
  },
  {
    id: 'non_blanching_rash',
    label: 'Purple rash that does not fade when pressed',
    labelUr: 'جامنی دانے جو دبانے سے ختم نہ ہوں',
    phrases: [
      'purple rash', 'purple spots', 'rash does not fade', "rash doesn't fade", 'non blanching', 'non-blanching',
      'jamni daane', 'jamni dane', 'jamni nishan',
      'جامنی دانے', 'جامنی نشان',
    ],
  },
  {
    id: 'allergic_swelling',
    label: 'Swelling of the face, lips, tongue or throat',
    labelUr: 'چہرے، ہونٹوں، زبان یا گلے کی سوجن',
    phrases: [
      'swollen lips', 'swollen face', 'swollen tongue', 'lips swelling', 'face swelling', 'tongue swelling', 'throat swelling',
      'throat closing', 'throat is closing', 'anaphylaxis',
      'hont sooj', 'honth sooj', 'chehra sooj', 'zuban sooj', 'gala sooj', 'gala band ho',
      'ہونٹ سوج', 'چہرہ سوج', 'زبان سوج', 'گلا سوج', 'گلا بند',
    ],
  },
  {
    id: 'self_harm',
    label: 'Thoughts of self-harm or suicide',
    labelUr: 'خود کو نقصان پہنچانے یا خودکشی کے خیالات',
    phrases: [
      'suicide', 'suicidal', 'kill myself', 'end my life', 'self harm', 'self-harm', 'hurt myself', 'want to die',
      'khudkushi', 'khud kushi', 'marna chahta', 'marna chahti', 'jaan dena chahta', 'jaan dena chahti',
      'خودکشی', 'مرنا چاہتا', 'مرنا چاہتی',
    ],
  },
  {
    id: 'pregnancy_emergency',
    label: 'Pregnant with bleeding or severe abdominal pain',
    labelUr: 'حمل کے دوران خون آنا یا پیٹ میں شدید درد',
    phrases: [
      'pregnant and bleeding', 'bleeding in pregnancy', 'bleeding during pregnancy', 'pregnancy bleeding',
      'hamal mein khoon', 'hamal ke doran khoon', 'pregnancy mein khoon',
      'حمل میں خون', 'حمل کے دوران خون',
    ],
  },
  {
    id: 'severe_abdominal_pain',
    label: 'Severe abdominal pain',
    labelUr: 'پیٹ میں شدید درد',
    phrases: [
      'severe abdominal pain', 'severe stomach pain', 'unbearable stomach pain', 'unbearable abdominal pain',
      'pait mein shadeed dard', 'pet mein shadeed dard', 'pait mein bohat tez dard', 'pet mein bohat tez dard',
      'پیٹ میں شدید درد',
    ],
  },
];

export const DANGER_SIGN_IDS = DANGER_SIGNS.map((d) => d.id) as [string, ...string[]];

const BY_ID = new Map(DANGER_SIGNS.map((d) => [d.id, d]));
const BY_LABEL = new Map(DANGER_SIGNS.map((d) => [d.label, d]));

/** Common Roman-Urdu spelling variants mapped to one form before matching. */
const ROMAN_VARIANTS: [RegExp, string][] = [
  [/\b(mein|main|mai|me|men|mn)\b/g, 'mein'],
  [/\b(seene|seenay|sine|seeny|seenai|sene|seena|sina)\b/g, 'seene'],
  [/\b(chhati|chati|chhaati|chaati|chaatee)\b/g, 'chhati'],
  [/\b(saans|sans|saas|saans|sanss)\b/g, 'saans'],
  [/\b(khoon|khun|khoun|khon)\b/g, 'khoon'],
  [/\b(pait|pet|paet|payt)\b/g, 'pait'],
  [/\b(bohat|bahut|bohot|buhat|bhot|bht)\b/g, 'bohat'],
  [/\b(nahi|nahin|nai|nhi|nahee)\b/g, 'nahi'],
  [/\b(lene|lainay|lainey|lenay|leney|lainy)\b/g, 'lene'],
];

export function normalizeForMatching(text: string): string {
  let t = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    // keep letters (incl. Urdu), digits, apostrophes and hyphens; everything else becomes a space
    .replace(/[^\p{L}\p{N}'\-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, to] of ROMAN_VARIANTS) t = t.replace(re, to);
  return ` ${t} `;
}

const NORMALIZED_PHRASES = DANGER_SIGNS.map((d) => ({
  sign: d,
  phrases: d.phrases.map((p) => normalizeForMatching(p)),
}));

export interface EmergencyMatch {
  id: string;
  label: string;
  labelUr: string;
  source: 'checklist' | 'text';
}

export interface EmergencyResult {
  isEmergency: boolean;
  matched: EmergencyMatch[];
  guidance: string[];
}

export const EMERGENCY_GUIDANCE = [
  'Go to the nearest hospital Emergency department now, or call Rescue 1122.',
  'Do not wait in the OPD queue and do not drive yourself if you feel faint or unwell.',
  'Show this screen or your parchi to the hospital staff.',
];
const SELF_HARM_GUIDANCE =
  'You are not alone. Please stay with someone you trust right now and get help at the nearest Emergency department.';

/** Detects danger signs from a ticked checklist and/or free text. Never throws. */
export function detectEmergency(text?: string | null, ticked: string[] = []): EmergencyResult {
  const found = new Map<string, EmergencyMatch>();
  for (const id of ticked) {
    const d = BY_ID.get(id);
    if (d) found.set(d.id, { id: d.id, label: d.label, labelUr: d.labelUr, source: 'checklist' });
  }
  if (text && text.trim()) {
    const norm = normalizeForMatching(text);
    for (const { sign, phrases } of NORMALIZED_PHRASES) {
      if (found.has(sign.id)) continue;
      if (phrases.some((p) => norm.includes(p))) {
        found.set(sign.id, { id: sign.id, label: sign.label, labelUr: sign.labelUr, source: 'text' });
      }
    }
  }
  const matched = [...found.values()];
  const guidance = matched.length ? [...EMERGENCY_GUIDANCE] : [];
  if (found.has('self_harm')) guidance.unshift(SELF_HARM_GUIDANCE);
  return { isEmergency: matched.length > 0, matched, guidance };
}

/** Prefix used in stored rule flags, so ticked danger signs survive in the existing redFlags column. */
export const EMERGENCY_FLAG_PREFIX = 'EMERGENCY SIGN: ';

export function emergencyFlag(id: string): string | null {
  const d = BY_ID.get(id);
  return d ? `${EMERGENCY_FLAG_PREFIX}${d.label} — go to the Emergency department now or call Rescue 1122.` : null;
}

/** Recovers the danger-sign ids from stored red flags (used for edit mode and the API). */
export function dangerSignsFromFlags(flags: string[]): string[] {
  const ids: string[] = [];
  for (const f of flags) {
    if (!f.startsWith(EMERGENCY_FLAG_PREFIX)) continue;
    const label = f.slice(EMERGENCY_FLAG_PREFIX.length).split(' — ')[0];
    const d = BY_LABEL.get(label);
    if (d && !ids.includes(d.id)) ids.push(d.id);
  }
  return ids;
}

export function dangerSignOptions() {
  return DANGER_SIGNS.map(({ id, label, labelUr }) => ({ id, label, labelUr }));
}
