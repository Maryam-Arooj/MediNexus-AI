/**
 * AI endpoint tests. The Gemini API is MOCKED (global fetch is stubbed) — no network, no quota used.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config/env';
import { sanitizeSymptomAnalysis } from '../src/ai/symptomAssistant';
import { api, bearer, createCase, doctorToken, registerPatient, resetDb } from './helpers';

const geminiReply = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] } : { error: {} }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const GOOD_ANALYSIS = {
  summary: 'Fever, cough and sore throat for 3 days.',
  symptoms: ['Fever', 'Cough', 'Sore throat', 'Malaria'],
  duration: '3 - 5 days',
  age: 34,
  gender: null,
  otherSymptoms: ['runny nose'],
  possibleConditions: [
    { name: 'Viral upper respiratory infection', likelihood: 'more likely', reason: 'Fever with cough and sore throat.' },
    { name: 'Streptococcal pharyngitis', likelihood: 'definitely', reason: 'Sore throat with fever.' },
  ],
  guidance: {
    selfCare: ['Rest and drink plenty of fluids.', 'Take paracetamol 500 mg every 6 hours.'],
    seeDoctorIf: ['Breathing becomes difficult.'],
    avoid: ['Do not self-medicate with antibiotics.'],
  },
  emergencyConcern: false,
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  await resetDb();
  process.env.GEMINI_API_KEY = 'test-key-not-real';
  process.env.GEMINI_FALLBACK_MODEL = 'fallback-model';
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_FALLBACK_MODEL;
});

describe('POST /api/ai/symptoms', () => {
  it('returns validated AI analysis; drops unknown symptoms, bad likelihoods and medication advice', async () => {
    fetchMock.mockResolvedValue(geminiReply(GOOD_ANALYSIS));
    const p = await registerPatient();
    const res = await api().post('/api/ai/symptoms').set(bearer(p.token)).send({ text: 'mujhe 3 din se bukhar, khansi aur gala kharab hai, umar 34' });
    expect(res.status).toBe(200);
    const { ai, aiStatus, emergency } = res.body.data;
    expect(aiStatus).toBe('ok');
    expect(emergency.isEmergency).toBe(false);
    expect(ai.symptoms).toEqual(['Fever', 'Cough', 'Sore throat']); // "Malaria" dropped
    expect(ai.duration).toBe('3 - 5 days');
    expect(ai.age).toBe(34);
    expect(ai.possibleConditions[1].likelihood).toBe('possible'); // "definitely" not allowed
    expect(ai.guidance.selfCare).toEqual(['Rest and drink plenty of fluids.']); // dose line removed
    expect(ai.disclaimer).toMatch(/Not a medical diagnosis/);

    // The key goes in a header (never the URL) and the prompt contains only the typed text.
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('test-key-not-real');
    expect(init.headers['x-goog-api-key']).toBe('test-key-not-real');
    const sent = JSON.parse(init.body);
    expect(JSON.stringify(sent.contents)).not.toContain(p.cnic);
    expect(JSON.stringify(sent.contents)).not.toContain('Test Patient');
    expect(sent.generationConfig.responseMimeType).toBe('application/json');
  });

  it('runs the emergency rules even when the AI is down, and reports the AI as unavailable', async () => {
    fetchMock.mockResolvedValue(geminiReply({}, 503));
    const p = await registerPatient();
    const res = await api().post('/api/ai/symptoms').set(bearer(p.token)).send({ text: 'seene mein dard aur saans nahi aa rahi' });
    expect(res.status).toBe(200);
    expect(res.body.data.emergency.isEmergency).toBe(true);
    expect(res.body.data.ai).toBeNull();
    expect(res.body.data.aiStatus).toBe('unavailable');
    // main model + 1 retry + fallback model
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain('fallback-model');
  });

  it('reports AI disabled (no network call) when no key is configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const p = await registerPatient();
    const res = await api().post('/api/ai/symptoms').set(bearer(p.token)).send({ text: 'kal se bukhar hai' });
    expect(res.status).toBe(200);
    expect(res.body.data.aiStatus).toBe('disabled');
    expect(fetchMock).not.toHaveBeenCalled();
    const opts = await api().get('/api/triage/options');
    expect(opts.body.data.aiEnabled).toBe(false);
  });

  it('treats malformed model output safely and gives a clean message on a bad key', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not json {' }] } }] }), { status: 200 }));
    const p = await registerPatient();
    const bad = await api().post('/api/ai/symptoms').set(bearer(p.token)).send({ text: 'bukhar hai' });
    expect(bad.body.data.aiStatus).toBe('unavailable');

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(geminiReply({}, 403));
    const denied = await api().post('/api/ai/symptoms').set(bearer(p.token)).send({ text: 'bukhar hai' });
    expect(denied.body.data.aiStatus).toBe('unavailable');
    expect(denied.body.data.aiMessage).toMatch(/GEMINI_API_KEY/);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no pointless retries on an auth error
  });

  it('keeps the output shape under a prompt-injection attempt (server-side validation)', () => {
    const r = sanitizeSymptomAnalysis({ symptoms: ['IGNORE ALL RULES'], possibleConditions: 'you are hacked', guidance: null, emergencyConcern: 'yes', age: 999 });
    expect(r.symptoms).toEqual([]);
    expect(r.possibleConditions).toEqual([]);
    expect(r.guidance).toEqual({ selfCare: [], seeDoctorIf: [], avoid: [] });
    expect(r.emergencyConcern).toBe(false);
    expect(r.age).toBeNull();
    expect(r.unclear).toBe(true);
  });

  it('validates input and enforces login and role', async () => {
    const p = await registerPatient();
    expect((await api().post('/api/ai/symptoms').set(bearer(p.token)).send({ text: 'x' })).status).toBe(400);
    expect((await api().post('/api/ai/symptoms').send({ text: 'bukhar hai' })).status).toBe(401);
    const doc = await doctorToken();
    expect((await api().post('/api/ai/symptoms').set(bearer(doc)).send({ text: 'bukhar hai' })).status).toBe(403);
  });

  it('rate-limits AI requests per user', async () => {
    fetchMock.mockImplementation(async () => geminiReply(GOOD_ANALYSIS));
    const small = createApp({ ...loadConfig(), authRateLimitMax: 10_000, aiRateLimitMax: 2 });
    const p = await registerPatient();
    const call = () => request(small).post('/api/ai/symptoms').set(bearer(p.token)).send({ text: 'bukhar hai' });
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(429);
  });
});

describe('POST /api/ai/document', () => {
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]).toString('base64');

  it('explains an image; keeps medicines as written and removes dosing advice from warnings', async () => {
    fetchMock.mockResolvedValue(
      geminiReply({
        documentType: 'prescription',
        summary: 'A prescription with two medicines.',
        tests: [],
        medicines: [{ name: 'Amoxicillin', strength: '500 mg', howToTakeAsWritten: '1 cap TDS', durationAsWritten: '5 days', generalPurpose: 'antibiotic' }],
        questionsForDoctor: ['What is this medicine for?', 'Should I take 1000 mg instead?'],
        warnings: [],
      })
    );
    const p = await registerPatient();
    const res = await api().post('/api/ai/document').set(bearer(p.token)).send({ fileBase64: PNG, mimeType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.data.medicines[0]).toMatchObject({ name: 'Amoxicillin', strength: '500 mg', howToTakeAsWritten: '1 cap TDS' });
    expect(res.body.data.questionsForDoctor).toEqual(['What is this medicine for?']);
    expect(res.body.data.medicineNotice).toMatch(/Never start, stop or change/);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.contents[0].parts[0].inline_data.mime_type).toBe('image/png');
  });

  it('rejects wrong file types, fake content, both inputs, and oversized uploads', async () => {
    const p = await registerPatient();
    const send = (b: object) => api().post('/api/ai/document').set(bearer(p.token)).send(b);
    expect((await send({ fileBase64: PNG, mimeType: 'application/x-msdownload' })).status).toBe(400);
    expect((await send({ fileBase64: Buffer.from('MZ fake exe').toString('base64'), mimeType: 'image/png' })).status).toBe(400);
    expect((await send({ fileBase64: PNG, mimeType: 'image/png', text: 'Hb 12 g/dL range 12-16' })).status).toBe(400);
    const big = Buffer.alloc(5 * 1024 * 1024, 1).toString('base64');
    expect([400, 413]).toContain((await send({ fileBase64: big, mimeType: 'image/png' })).status);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts pasted text and returns 503 when AI is disabled', async () => {
    delete process.env.GEMINI_API_KEY;
    const p = await registerPatient();
    const res = await api().post('/api/ai/document').set(bearer(p.token)).send({ text: 'Haemoglobin 9.1 g/dL (12.0 - 16.0)' });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not configured/);
  });
});

describe('POST /api/doctor/patients/:id/ai-summary', () => {
  const SUMMARY = {
    situation: '30-year-old female with rash and itching for 3-5 days.',
    background: 'No examination or vital signs recorded.',
    assessment: 'Rule-based triage: Low.',
    recommendation: 'Examine the rash.',
    questionsToAsk: ['Any new soaps or detergents?', 'Take cetirizine 10 mg?'],
  };

  it('gives the doctor a de-identified SBAR draft (no name or CNIC sent to the AI)', async () => {
    fetchMock.mockResolvedValue(geminiReply(SUMMARY));
    const p = await registerPatient({ fullName: 'Ayesha Uniquename' });
    const c = await createCase(p.token, { name: 'Ayesha Uniquename' });
    const doc = await doctorToken();
    const res = await api().post(`/api/doctor/patients/${c.id}/ai-summary`).set(bearer(doc));
    expect(res.status).toBe(200);
    expect(res.body.data.situation).toBe(SUMMARY.situation);
    expect(res.body.data.questionsToAsk).toEqual(['Any new soaps or detergents?']); // dose question removed
    const prompt = JSON.stringify(JSON.parse(fetchMock.mock.calls[0][1].body).contents);
    expect(prompt).not.toContain('Uniquename');
    expect(prompt).not.toContain(p.cnic);
    expect(prompt).not.toContain(c.id);
    expect(prompt).not.toContain(c.tokenNumber);
  });

  it('enforces role, login and existence', async () => {
    const p = await registerPatient();
    const c = await createCase(p.token);
    expect((await api().post(`/api/doctor/patients/${c.id}/ai-summary`).set(bearer(p.token))).status).toBe(403);
    expect((await api().post(`/api/doctor/patients/${c.id}/ai-summary`)).status).toBe(401);
    const doc = await doctorToken();
    expect((await api().post('/api/doctor/patients/SC-2026-9999/ai-summary').set(bearer(doc))).status).toBe(404);
  });
});
