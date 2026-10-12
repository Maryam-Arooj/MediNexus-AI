import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createCase, prisma, registerPatient, resetDb, validCase } from './helpers';

beforeEach(resetDb);

describe('token numbers (regression for P2002 duplicate tokenNumber)', () => {
  it('stays unique after a patient is deleted (old code re-issued DERM-03 forever)', async () => {
    const { token } = await registerPatient();
    const a = await createCase(token);
    await createCase(token);
    await createCase(token);
    await prisma.patient.delete({ where: { patientId: a.id } }); // what the old cleanup scripts did
    const d = await createCase(token);
    const e = await createCase(token);
    expect([d.tokenNumber, e.tokenNumber]).toEqual(['DERM-04', 'DERM-05']);
  });

  it('20 concurrent registrations all succeed with unique tokens and ids', async () => {
    const patients = await Promise.all(Array.from({ length: 5 }, () => registerPatient()));
    const reqs = Array.from({ length: 20 }, (_, i) =>
      api()
        .post('/api/patients')
        .set(bearer(patients[i % 5].token))
        .send(validCase({ symptoms: ['Fever'] }))
    );
    const res = await Promise.all(reqs);
    expect(res.map((r) => r.status)).toEqual(Array(20).fill(201));
    const tokens = res.map((r) => r.body.data.tokenNumber);
    const ids = res.map((r) => r.body.data.id);
    expect(new Set(tokens).size).toBe(20);
    expect(new Set(ids).size).toBe(20);
    expect([...tokens].sort()).toEqual(Array.from({ length: 20 }, (_, i) => `GM-${String(i + 1).padStart(2, '0')}`).sort());
  });

  it('continues above existing legacy tokens/ids instead of colliding with them', async () => {
    const { token, user } = await registerPatient();
    await prisma.patient.create({
      data: {
        patientId: `SC-${new Date().getFullYear()}-9000`,
        tokenNumber: 'GM-01',
        age: 50,
        gender: 'Male',
        symptoms: ['Fever'],
        duration: '1 - 2 days',
        department: 'General Medicine',
        assignedRoom: 'Room 104',
        userId: user.id,
      },
    });
    // Counter is empty (as if the legacy row predates the counter) — allocation must skip GM-01.
    const c = await createCase(token, { symptoms: ['Fever'] });
    expect(c.tokenNumber).toBe('GM-02');
  });

  it('department prefixes are independent', async () => {
    const { token } = await registerPatient();
    expect((await createCase(token, { symptoms: ['Fever'] })).tokenNumber).toBe('GM-01');
    expect((await createCase(token)).tokenNumber).toBe('DERM-01');
    expect((await createCase(token, { symptoms: ['Cough'] })).tokenNumber).toBe('GM-02');
  });
});
