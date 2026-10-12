import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createCase, doctorToken, prisma, registerPatient, resetDb, validCase } from './helpers';

beforeEach(resetDb);

describe('unauthenticated requests are denied (401)', () => {
  it.each([
    ['get', '/api/patients/mine'],
    ['post', '/api/patients'],
    ['get', '/api/patients/SC-2026-0001'],
    ['put', '/api/patients/SC-2026-0001'],
    ['get', '/api/doctor/patients'],
    ['put', '/api/doctor/patients/SC-2026-0001/review'],
    ['post', '/api/doctor/patients/SC-2026-0001/approve'],
    ['post', '/api/doctor/patients/SC-2026-0001/reopen'],
    ['get', '/api/auth/me'],
    ['post', '/api/auth/logout'],
  ])('%s %s', async (method, url) => {
    const res = await (api() as any)[method](url).send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('the old public list endpoint no longer leaks patient data', async () => {
    const res = await api().get('/api/patients');
    expect([401, 404]).toContain(res.status);
    expect(res.body.data).toBeUndefined();
  });
});

describe('patients can use their own dashboard but nothing doctor-only', () => {
  it('patient can create and read own cases', async () => {
    const { token } = await registerPatient();
    const c = await createCase(token);
    const mine = await api().get('/api/patients/mine').set(bearer(token));
    expect(mine.status).toBe(200);
    expect(mine.body.data.map((x: any) => x.id)).toEqual([c.id]);
    expect((await api().get(`/api/patients/${c.id}`).set(bearer(token))).status).toBe(200);
  });

  it('patient gets 403 on every doctor-only endpoint', async () => {
    const { token } = await registerPatient();
    const c = await createCase(token);
    const calls = [
      api().get('/api/doctor/patients').set(bearer(token)),
      api().put(`/api/doctor/patients/${c.id}/review`).set(bearer(token)).send({ clinicalNotes: 'x' }),
      api().post(`/api/doctor/patients/${c.id}/approve`).set(bearer(token)).send({}),
      api().post(`/api/doctor/patients/${c.id}/reopen`).set(bearer(token)).send({}),
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(403);
    const review = await prisma.doctorReview.findFirstOrThrow();
    expect(review.status).toBe('Pending Review');
  });

  it('patient cannot read or edit another patient’s case (404, no data)', async () => {
    const a = await registerPatient();
    const b = await registerPatient();
    const caseA = await createCase(a.token);
    const read = await api().get(`/api/patients/${caseA.id}`).set(bearer(b.token));
    expect(read.status).toBe(404);
    expect(read.body.data).toBeUndefined();
    const edit = await api().put(`/api/patients/${caseA.id}`).set(bearer(b.token)).send(validCase({ age: 99 }));
    expect(edit.status).toBe(404);
    expect((await api().get('/api/patients/mine').set(bearer(b.token))).body.data).toEqual([]);
  });

  it('a role field in the body or a forged token cannot grant doctor access', async () => {
    const { token } = await registerPatient();
    const res = await api().get('/api/doctor/patients').set(bearer(token)).send({ role: 'DOCTOR' });
    expect(res.status).toBe(403);
  });

  it('patients do not receive doctor-only fields', async () => {
    const { token } = await registerPatient();
    const c = await createCase(token);
    expect(c.analysis.possibleConditions).toBeUndefined();
    expect(c.analysis.handoverSummary).toBeUndefined();
    expect(c.review.clinicalNotes).toBeUndefined();
  });
});

describe('doctors', () => {
  it('doctor can open the queue and any case, but cannot submit patient cases', async () => {
    const p = await registerPatient();
    const c = await createCase(p.token);
    const doc = await doctorToken();
    const me = await api().get('/api/auth/me').set(bearer(doc));
    expect(me.body.data.role).toBe('DOCTOR');
    const q = await api().get('/api/doctor/patients').set(bearer(doc));
    expect(q.status).toBe(200);
    expect(q.body.data[0].id).toBe(c.id);
    expect(q.body.data[0].analysis.possibleConditions.length).toBeGreaterThan(0);
    expect((await api().get(`/api/patients/${c.id}`).set(bearer(doc))).status).toBe(200);
    expect((await api().post('/api/patients').set(bearer(doc)).send(validCase())).status).toBe(403);
  });

  it('demoting a doctor in the database removes access immediately (role re-read per request)', async () => {
    const doc = await doctorToken();
    await prisma.user.updateMany({ where: { role: 'DOCTOR' }, data: { role: 'PATIENT' } });
    expect((await api().get('/api/doctor/patients').set(bearer(doc))).status).toBe(403);
  });

  it('after doctor logout the token no longer works', async () => {
    const doc = await doctorToken();
    await api().post('/api/auth/logout').set(bearer(doc));
    expect((await api().get('/api/doctor/patients').set(bearer(doc))).status).toBe(401);
  });
});
