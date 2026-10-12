import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createCase, doctorToken, prisma, registerPatient, resetDb } from './helpers';

beforeEach(resetDb);

async function setup() {
  const p = await registerPatient();
  const c = await createCase(p.token);
  const doc = await doctorToken();
  return { p, c, doc };
}

describe('doctor review & approval', () => {
  it('saves notes + override, records reviewer and timestamp, status Under Review', async () => {
    const { c, doc } = await setup();
    const res = await api()
      .put(`/api/doctor/patients/${c.id}/review`)
      .set(bearer(doc))
      .send({ clinicalNotes: '  Chest clear.  ', recommendedAction: 'Paracetamol, review in 3 days' });
    expect(res.status).toBe(200);
    expect(res.body.meta.changed).toBe(true);
    const r = await prisma.doctorReview.findFirstOrThrow({ include: { reviewedBy: true } });
    expect(r.status).toBe('Under Review');
    expect(r.clinicalNotes).toBe('Chest clear.');
    expect(r.recommendedActionOverride).toBe('Paracetamol, review in 3 days');
    expect(r.reviewedBy?.fullName).toBe('Dr. Test Physician');
    expect(r.reviewedAt).toBeInstanceOf(Date);
    expect(res.body.data.analysis.recommendedAction).toBe('Paracetamol, review in 3 days');
    expect(res.body.data.analysis.actionOverriddenByDoctor).toBe(true);
  });

  it('does not write anything when nothing changed (and does not store the default action as an override)', async () => {
    const { c, doc } = await setup();
    const before = await prisma.doctorReview.findFirstOrThrow();
    const res = await api()
      .put(`/api/doctor/patients/${c.id}/review`)
      .set(bearer(doc))
      .send({ clinicalNotes: '', recommendedAction: c.analysis.recommendedAction });
    expect(res.body.meta.changed).toBe(false);
    const after = await prisma.doctorReview.findFirstOrThrow();
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    expect(after.status).toBe('Pending Review');
    expect(after.recommendedActionOverride).toBeNull();
  });

  it('ignores client-supplied status/approvedBy; approver comes from the logged-in doctor', async () => {
    const { c, doc } = await setup();
    await api().put(`/api/doctor/patients/${c.id}/review`).set(bearer(doc)).send({ status: 'Approved', clinicalNotes: 'x' });
    expect((await prisma.doctorReview.findFirstOrThrow()).status).toBe('Under Review');
    const res = await api().post(`/api/doctor/patients/${c.id}/approve`).set(bearer(doc)).send({ approvedBy: 'hacker' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Approved');
    expect(res.body.data.review.approvedBy).toBe('Dr. Test Physician');
    const r = await prisma.doctorReview.findFirstOrThrow({ include: { approver: true } });
    expect(r.approver?.role).toBe('DOCTOR');
    expect(r.approvedAt).toBeInstanceOf(Date);
    expect(r.clinicalNotes).toBe('x');
  });

  it('approved cases are locked; second approval and edits return 409; reopen clears approval', async () => {
    const { c, doc } = await setup();
    await api().post(`/api/doctor/patients/${c.id}/approve`).set(bearer(doc)).send({ clinicalNotes: 'ok' });
    expect((await api().post(`/api/doctor/patients/${c.id}/approve`).set(bearer(doc)).send({})).status).toBe(409);
    expect((await api().put(`/api/doctor/patients/${c.id}/review`).set(bearer(doc)).send({ clinicalNotes: 'change' })).status).toBe(409);
    const re = await api().post(`/api/doctor/patients/${c.id}/reopen`).set(bearer(doc)).send({});
    expect(re.status).toBe(200);
    expect(re.body.data.status).toBe('Under Review');
    expect(re.body.data.review.approvedBy).toBeNull();
    expect(re.body.data.review.approvedAt).toBeNull();
    expect(re.body.data.review.clinicalNotes).toBe('ok');
    expect((await api().post(`/api/doctor/patients/${c.id}/reopen`).set(bearer(doc)).send({})).status).toBe(409);
  });

  it('patient sees approval status and doctor action on their case (parchi data stays in sync)', async () => {
    const { p, c, doc } = await setup();
    await api().put(`/api/doctor/patients/${c.id}/review`).set(bearer(doc)).send({ recommendedAction: 'Come back Monday' });
    await api().post(`/api/doctor/patients/${c.id}/approve`).set(bearer(doc)).send({});
    const mine = await api().get(`/api/patients/${c.id}`).set(bearer(p.token));
    expect(mine.body.data.status).toBe('Approved');
    expect(mine.body.data.review.approvedBy).toBe('Dr. Test Physician');
    expect(mine.body.data.analysis.recommendedAction).toBe('Come back Monday');
    expect(mine.body.data.review.clinicalNotes).toBeUndefined();
  });

  it('returns 404 for unknown cases and 400 for malformed ids', async () => {
    const doc = await doctorToken();
    expect((await api().post('/api/doctor/patients/SC-2026-9999/approve').set(bearer(doc)).send({})).status).toBe(404);
    expect((await api().post('/api/doctor/patients/DROP-TABLE/approve').set(bearer(doc)).send({})).status).toBe(400);
  });
});
