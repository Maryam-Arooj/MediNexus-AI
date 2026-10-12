/**
 * Fake Gemini server for OFFLINE end-to-end tests only (no API key, no internet, no quota).
 * Start:  node e2e/fake-gemini.mjs        (listens on http://localhost:8787)
 * Then run the backend with  GEMINI_API_KEY=fake  GEMINI_API_BASE=http://localhost:8787/v1beta/models
 * Text containing FORCE_AI_DOWN makes it answer 503, to test the "AI unavailable" fallback.
 * Never used in real operation.
 */
import http from 'node:http';

const reply = (res, obj, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] } : { error: { code: status } }));
};

const SYMPTOMS = {
  summary: 'Fever, cough and sore throat for about 3 days, age 34.',
  symptoms: ['Fever', 'Cough', 'Sore throat'],
  duration: '3 - 5 days',
  age: 34,
  gender: null,
  otherSymptoms: [],
  possibleConditions: [
    { name: 'Viral upper respiratory infection', likelihood: 'more likely', reason: 'Fever with cough and sore throat for a few days.' },
    { name: 'Streptococcal pharyngitis', likelihood: 'possible', reason: 'Sore throat with fever.' },
    { name: 'Influenza', likelihood: 'less likely', reason: 'Fever and cough; body aches not mentioned.' },
  ],
  guidance: {
    selfCare: ['Rest and drink plenty of fluids.', 'Take paracetamol 500 mg twice daily.'],
    seeDoctorIf: ['Breathing becomes difficult.', 'Fever lasts more than 3 more days.'],
    avoid: ['Do not start antibiotics without a doctor.'],
  },
  emergencyConcern: false,
};
const DOCUMENT = {
  documentType: 'lab_report',
  summary: 'A complete blood count. Haemoglobin is below the printed normal range.',
  tests: [{ name: 'Haemoglobin', value: '9.8', unit: 'g/dL', referenceRange: '12.0 - 16.0', flag: 'low', meaning: 'Low haemoglobin can mean anaemia.' }],
  medicines: [],
  questionsForDoctor: ['What could be causing my low haemoglobin?'],
  warnings: ['Haemoglobin is below the normal range — discuss with your doctor soon.'],
};
const SUMMARY = {
  situation: 'Adult patient reporting chest pain.',
  background: 'Patient-reported data only; no examination or vital signs recorded.',
  assessment: 'Rule-based triage High with an emergency danger sign.',
  recommendation: 'Assess immediately: vitals, ECG as clinically indicated.',
  questionsToAsk: ['When did the pain start?', 'Does it spread to the arm or jaw?', 'Any breathlessness or sweating?'],
};

http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (!req.url.includes(':generateContent') || !req.headers['x-goog-api-key']) return reply(res, {}, 403);
      const sys = body.includes('intake assistant') ? 'symptoms' : body.includes('explain medical documents') ? 'document' : 'summary';
      if (body.includes('FORCE_AI_DOWN')) return reply(res, {}, 503);
      if (sys === 'symptoms') return reply(res, SYMPTOMS);
      if (sys === 'document') return reply(res, DOCUMENT);
      return reply(res, SUMMARY);
    });
  })
  .listen(Number(process.env.FAKE_GEMINI_PORT || 8787), () => console.log('fake Gemini listening'));
