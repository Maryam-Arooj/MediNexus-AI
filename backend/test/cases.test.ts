import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, bearer, createCase, doctorToken, prisma, registerPatient, resetDb, validCase } from './helpers';

beforeEach(resetDb);

describe('creating a case', () => {
  it('saves patient, triage and review together and links the case to the account', async () => {
    const { token, user } = await registerPatient({ fullName: 'Hina Fatima' });
    const c = await createCase(token, { name: '' });
    expect(c.id).toMatch(/^SC-\d{4}-\d{4}$/);
    expect(c.tokenNumber).toBe('DERM-01');
    expect(c.name).toBe('Hina Fatima'); // defaults to the account name
    expect(c.status).toBe('Pending Review');
    expect(c.canEdit).toBe(true);
    expect(c.analysis.riskLevel).toBeDefined();
    expect(c.analysis.riskReason).toBeTruthy();
    expect(c.analysis).not.toHaveProperty('confidenceScore');
    const row = await prisma.patient.findUniqueOrThrow({ where: { patientId: c.id }, include: { triage: true, review: true } });
    expect(row.userId).toBe(user.id);
    expect(row.triage).not.toBeNull();
    expect(row.review).not.toBeNull();
    expect(row.triage!.confidenceScore).toBeNull();
    expect(row.triage!.engineVersion).toBe('rules-v2');
  });

  it.each([
    [{ age: 'abc' }, 'age'],
    [{ age: 25.5 }, 'age'],
    [{ age: 0 }, 'age'],
    [{ age: 121 }, 'age'],
    [{ gender: 'x' }, 'gender'],
    [{ symptoms: [] }, 'symptoms'],
    [{ symptoms: ['zzz'] }, 'symptoms.0'],
    [{ symptoms: ['Fever', 'Fever'] }, 'symptoms'],
    [{ duration: 'forever' }, 'duration'],
  ])('rejects invalid case input %j with a clean 400', async (bad, field) => {
    const { token } = await registerPatient();
    const res = await api().post('/api/patients').set(bearer(token)).send(validCase(bad));
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty(field);
    expect(JSON.stringify(res.body)).not.toMatch(/prisma|invocation/i);
    expect(await prisma.patient.count()).toBe(0);
  });

  it('accepts age sent as a numeric string', async () => {
    const { token } = await registerPatient();
    expect((await createCase(token, { age: '42' })).age).toBe(42);
  });

  it('is idempotent per clientRequestId (double click / retry gives ONE case)', async () => {
    const { token } = await registerPatient();
    const body = validCase({ clientRequestId: 'req-1234567890' });
    const results = await Promise.all([1, 2, 3, 4].map(() => api().post('/api/patients').set(bearer(token)).send(body)));
    expect(results.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
    expect(await prisma.patient.count()).toBe(1);
  });
});

describe('transactions: no partial records', () => {
  afterEach(async () => {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_review_insert ON "doctor_reviews"');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_review_insert_fn()');
  });

  it('a DB failure while saving the review rolls back patient, triage AND the token counter', async () => {
    const { token } = await registerPatient();
    await createCase(token); // DERM-01
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION fail_review_insert_fn() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'simulated failure'; END; $$ LANGUAGE plpgsql;`);
    await prisma.$executeRawUnsafe(
      'CREATE TRIGGER fail_review_insert BEFORE INSERT ON "doctor_reviews" FOR EACH ROW EXECUTE FUNCTION fail_review_insert_fn()'
    );
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await api().post('/api/patients').set(bearer(token)).send(validCase({ name: 'Secret Name' }));
    const logged = logSpy.mock.calls.flat().join(' ');
    logSpy.mockRestore();
    expect(logged).toMatch(/POST \/api\/patients -> 500/);
    expect(logged).not.toMatch(/Secret Name|simulated|Skin rash|invocation/);
    expect(res.status).toBe(500);
    expect(res.body.error).not.toMatch(/simulated|prisma|sql/i);
    expect(await prisma.patient.count()).toBe(1);
    expect(await prisma.triageResult.count()).toBe(1);
    expect(await prisma.doctorReview.count()).toBe(1);
    const counter = await prisma.tokenCounter.findUniqueOrThrow({ where: { key: 'DERM' } });
    expect(counter.value).toBe(1);

    await prisma.$executeRawUnsafe('DROP TRIGGER fail_review_insert ON "doctor_reviews"');
    expect((await createCase(token)).tokenNumber).toBe('DERM-02');
  });
});

describe('editing symptoms (PUT /api/patients/:id)', () => {
  it('updates the SAME case, keeps id, re-runs triage, creates no duplicate', async () => {
    const { token } = await registerPatient();
    const c = await createCase(token, { symptoms: ['Skin rash'], duration: '1 - 2 days' });
    expect(c.analysis.riskLevel).toBe('Low');
    const res = await api()
      .put(`/api/patients/${c.id}`)
      .set(bearer(token))
      .send(validCase({ symptoms: ['Skin rash', 'Minor skin infection'], duration: '1 - 2 days' }));
    expect(res.status).toBe(200);
    expect(res.body.meta.changed).toBe(true);
    expect(res.body.data.id).toBe(c.id);
    expect(res.body.data.tokenNumber).toBe(c.tokenNumber); // same department → same token
    expect(res.body.data.analysis.riskLevel).toBe('High');
    expect(await prisma.patient.count()).toBe(1);
    expect(await prisma.triageResult.count()).toBe(1);
  });

  it('makes no write when nothing changed', async () => {
    const { token } = await registerPatient();
    const c = await createCase(token);
    const before = await prisma.patient.findUniqueOrThrow({ where: { patientId: c.id } });
    const res = await api().put(`/api/patients/${c.id}`).set(bearer(token)).send(validCase({ name: c.name }));
    expect(res.body.meta.changed).toBe(false);
    const after = await prisma.patient.findUniqueOrThrow({ where: { patientId: c.id } });
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it('issues a new token in the new department when the department changes', async () => {
    const { token } = await registerPatient();
    const c = await createCase(token); // DERM
    const res = await api().put(`/api/patients/${c.id}`).set(bearer(token)).send(validCase({ symptoms: ['Fever', 'Cough'] }));
    expect(res.body.data.department).toBe('General Medicine');
    expect(res.body.data.tokenNumber).toBe('GM-01');
    expect(res.body.data.opdRoom).toMatch(/Room 104/);
  });

  it('is blocked (409) once a doctor has started reviewing', async () => {
    const { token } = await registerPatient();
    const c = await createCase(token);
    const doc = await doctorToken();
    await api().put(`/api/doctor/patients/${c.id}/review`).set(bearer(doc)).send({ clinicalNotes: 'Seen' });
    const res = await api().put(`/api/patients/${c.id}`).set(bearer(token)).send(validCase({ age: 31 }));
    expect(res.status).toBe(409);
    const mine = await api().get('/api/patients/mine').set(bearer(token));
    expect(mine.body.data[0].canEdit).toBe(false);
  });
});
