import { beforeEach, describe, expect, it } from 'vitest';
import { DANGER_SIGNS, dangerSignsFromFlags, detectEmergency, emergencyFlag } from '../src/triage/emergencyRules';
import { evaluateMedicalTriage } from '../src/triage/evaluateMedicalTriage';
import { api, bearer, createCase, doctorToken, prisma, registerPatient, resetDb } from './helpers';

describe('emergency red-flag rules (deterministic, no AI)', () => {
  it.each([
    ['I have chest pain since morning', 'chest_pain'],
    ['kal se seene mein dard hai', 'chest_pain'],
    ['seenay me dard ho raha hai', 'chest_pain'],
    ['سینے میں درد ہے', 'chest_pain'],
    ['I cannot breathe properly', 'breathing'],
    ['saans lene mein takleef hai', 'breathing'],
    ['sans nahi aa rahi', 'breathing'],
    ['سانس لینے میں مشکل', 'breathing'],
    ['my father fainted today', 'unconscious'],
    ['wo behosh ho gaya', 'unconscious'],
    ['بے ہوش ہو گیا', 'unconscious'],
    ['he had a seizure', 'seizure'],
    ['bachay ko jhatke lag rahe hain', 'seizure'],
    ['her face drooping and slurred speech', 'stroke_signs'],
    ['munh terha ho gaya', 'stroke_signs'],
    ['vomiting blood', 'severe_bleeding'],
    ['khoon ki ulti hui', 'severe_bleeding'],
    ['he seems confused', 'confusion'],
    ['fever and stiff neck', 'stiff_neck_fever'],
    ['bukhar aur gardan akar gayi', 'stiff_neck_fever'],
    ['purple rash on legs', 'non_blanching_rash'],
    ['lips swelling after eating', 'allergic_swelling'],
    ['hont sooj gaye', 'allergic_swelling'],
    ['I want to end my life', 'self_harm'],
    ['khudkushi ke khayal', 'self_harm'],
    ['pregnant and bleeding', 'pregnancy_emergency'],
    ['severe stomach pain', 'severe_abdominal_pain'],
    ['pet mein shadeed dard', 'severe_abdominal_pain'],
  ])('detects "%s" as %s', (text, id) => {
    const r = detectEmergency(text);
    expect(r.isEmergency).toBe(true);
    expect(r.matched.map((m) => m.id)).toContain(id);
    expect(r.guidance.join(' ')).toMatch(/1122/);
  });

  it.each(['mujhe 3 din se bukhar aur khansi hai', 'itchy skin rash on my arm', 'sore throat and headache', ''])(
    'does not flag ordinary OPD complaints: "%s"',
    (text) => {
      expect(detectEmergency(text).isEmergency).toBe(false);
    }
  );

  it('every danger sign can be ticked from the checklist', () => {
    for (const d of DANGER_SIGNS) {
      const r = detectEmergency('', [d.id]);
      expect(r.matched).toEqual([{ id: d.id, label: d.label, labelUr: d.labelUr, source: 'checklist' }]);
    }
    expect(detectEmergency('', ['not_a_sign']).isEmergency).toBe(false);
  });

  it('self-harm adds supportive guidance first', () => {
    expect(detectEmergency('I want to kill myself').guidance[0]).toMatch(/not alone/);
  });

  it('a ticked danger sign forces High priority with an emergency flag and action', () => {
    const t = evaluateMedicalTriage({ name: 'X', age: 30, gender: 'Male', symptoms: ['Itching'], duration: '1 - 2 days', dangerSigns: ['chest_pain'] });
    expect(t.riskLevel).toBe('High');
    expect(t.redFlags[0]).toBe(emergencyFlag('chest_pain'));
    expect(t.recommendedAction).toMatch(/^EMERGENCY/);
    expect(dangerSignsFromFlags(t.redFlags)).toEqual(['chest_pain']);
    const normal = evaluateMedicalTriage({ name: 'X', age: 30, gender: 'Male', symptoms: ['Itching'], duration: '1 - 2 days' });
    expect(normal.riskLevel).toBe('Low');
    expect(normal.recommendedAction).not.toMatch(/^EMERGENCY/);
  });
});

describe('emergency danger signs in the case workflow (API + database)', () => {
  beforeEach(resetDb);

  it('stores the flag, returns emergency=true to patient and doctor, survives edit', async () => {
    const p = await registerPatient();
    const c = await createCase(p.token, { dangerSigns: ['breathing', 'breathing'] });
    expect(c.analysis.riskLevel).toBe('High');
    expect(c.emergency).toBe(true);
    expect(c.dangerSigns).toEqual(['breathing']);

    const doc = await doctorToken();
    const q = await api().get('/api/doctor/patients').set(bearer(doc));
    expect(q.body.data[0].emergency).toBe(true);

    // Edit without changes keeps the sign and writes nothing.
    const same = await api().put(`/api/patients/${c.id}`).set(bearer(p.token)).send({
      age: 30, gender: 'Female', symptoms: ['Skin rash', 'Itching'], duration: '3 - 5 days', dangerSigns: ['breathing'],
    });
    expect(same.body.meta.changed).toBe(false);
    // Removing the sign re-runs triage.
    const removed = await api().put(`/api/patients/${c.id}`).set(bearer(p.token)).send({
      age: 30, gender: 'Female', symptoms: ['Skin rash', 'Itching'], duration: '3 - 5 days', dangerSigns: [],
    });
    expect(removed.body.meta.changed).toBe(true);
    expect(removed.body.data.emergency).toBe(false);
    expect(await prisma.patient.count()).toBe(1);
  });

  it('rejects unknown danger signs', async () => {
    const p = await registerPatient();
    const res = await api().post('/api/patients').set(bearer(p.token)).send({
      age: 30, gender: 'Male', symptoms: ['Fever'], duration: '1 - 2 days', dangerSigns: ['zzz'],
    });
    expect(res.status).toBe(400);
  });

  it('options endpoint lists danger signs and the AI on/off flag', async () => {
    const res = await api().get('/api/triage/options');
    expect(res.body.data.dangerSigns).toHaveLength(DANGER_SIGNS.length);
    expect(typeof res.body.data.aiEnabled).toBe('boolean');
  });
});
