import { beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { api, DOCTOR_ENV, prisma, registerPatient, resetDb } from './helpers';
import { provisionDoctor, ProvisionError } from '../src/services/doctorProvisioning';

beforeEach(resetDb);

describe('doctor provisioning', () => {
  it('creates a DOCTOR with a bcrypt hash and the doctor can log in', async () => {
    const r = await provisionDoctor(prisma, { env: DOCTOR_ENV });
    expect(r.status).toBe('created');
    const u = await prisma.user.findFirstOrThrow({ where: { email: DOCTOR_ENV.DEMO_DOCTOR_EMAIL } });
    expect(u.role).toBe('DOCTOR');
    expect(await bcrypt.compare(DOCTOR_ENV.DEMO_DOCTOR_PASSWORD, u.passwordHash)).toBe(true);
    expect(u.cnic).toMatch(/^00000-\d{7}-0$/);
    const login = await api().post('/api/auth/login').send({ identifier: DOCTOR_ENV.DEMO_DOCTOR_EMAIL, password: DOCTOR_ENV.DEMO_DOCTOR_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('DOCTOR');
  });

  it('is idempotent and never resets an existing doctor password', async () => {
    await provisionDoctor(prisma, { env: DOCTOR_ENV });
    const before = await prisma.user.findFirstOrThrow({ where: { role: 'DOCTOR' } });
    const again = await provisionDoctor(prisma, { env: { ...DOCTOR_ENV, DEMO_DOCTOR_PASSWORD: 'AnotherPass2027y' } });
    expect(again.status).toBe('already-doctor');
    const after = await prisma.user.findFirstOrThrow({ where: { role: 'DOCTOR' } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(await prisma.user.count()).toBe(1);
  });

  it('refuses to silently take over an existing patient account', async () => {
    await registerPatient({ email: DOCTOR_ENV.DEMO_DOCTOR_EMAIL, password: 'Patient123', confirmPassword: 'Patient123' });
    await expect(provisionDoctor(prisma, { env: DOCTOR_ENV })).rejects.toBeInstanceOf(ProvisionError);
    expect((await prisma.user.findFirstOrThrow()).role).toBe('PATIENT');
    // promote-existing requires the account's own password
    await expect(provisionDoctor(prisma, { env: DOCTOR_ENV, promoteExisting: true })).rejects.toThrow(/does not match/);
    expect((await prisma.user.findFirstOrThrow()).role).toBe('PATIENT');
  });

  it('promote-existing works only with the matching password and is audited', async () => {
    await registerPatient({ email: DOCTOR_ENV.DEMO_DOCTOR_EMAIL, password: DOCTOR_ENV.DEMO_DOCTOR_PASSWORD, confirmPassword: DOCTOR_ENV.DEMO_DOCTOR_PASSWORD });
    const r = await provisionDoctor(prisma, { env: DOCTOR_ENV, promoteExisting: true });
    expect(r.status).toBe('promoted');
    expect((await prisma.user.findFirstOrThrow()).role).toBe('DOCTOR');
    expect(await prisma.roleChangeAudit.count({ where: { newRole: 'DOCTOR' } })).toBe(1);
  });

  it('refuses in production unless explicitly allowed', async () => {
    await expect(provisionDoctor(prisma, { env: { ...DOCTOR_ENV, NODE_ENV: 'production' } })).rejects.toThrow(/production/);
    expect(await prisma.user.count()).toBe(0);
  });

  it.each([
    [{ DEMO_DOCTOR_EMAIL: '' }],
    [{ DEMO_DOCTOR_EMAIL: 'not-an-email' }],
    [{ DEMO_DOCTOR_PASSWORD: 'change-me' }],
    [{ DEMO_DOCTOR_PASSWORD: 'shortpw1' }],
    [{ DEMO_DOCTOR_CNIC: '123' }],
  ])('rejects bad/placeholder configuration %j', async (bad) => {
    await expect(provisionDoctor(prisma, { env: { ...DOCTOR_ENV, ...bad } })).rejects.toBeInstanceOf(ProvisionError);
    expect(await prisma.user.count()).toBe(0);
  });

  it('two doctors without CNIC get distinct placeholder CNICs', async () => {
    await provisionDoctor(prisma, { env: DOCTOR_ENV });
    const r = await provisionDoctor(prisma, { env: { ...DOCTOR_ENV, DEMO_DOCTOR_EMAIL: 'second.doctor@medinexus.test' } });
    expect(r.status).toBe('created');
    expect(await prisma.user.count({ where: { role: 'DOCTOR' } })).toBe(2);
  });
});
