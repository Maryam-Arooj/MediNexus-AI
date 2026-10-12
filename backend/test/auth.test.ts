import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, prisma, registerPatient, resetDb, nextCnic } from './helpers';
import { createApp } from '../src/app';
import { loadConfig, ConfigError } from '../src/config/env';
import request from 'supertest';

beforeEach(resetDb);

describe('registration', () => {
  it('creates a PATIENT account with a hashed password', async () => {
    const { user, cnic } = await registerPatient({ email: 'Ayesha@Example.org', phone: '+92 300 1234567' });
    expect(user.role).toBe('PATIENT');
    const row = await prisma.user.findUniqueOrThrow({ where: { cnic } });
    expect(row.passwordHash).not.toContain('Patient123');
    expect(row.passwordHash.startsWith('$2')).toBe(true);
    expect(row.email).toBe('ayesha@example.org');
    expect(row.phone).toBe('03001234567');
  });

  it('ignores a submitted doctor role — public sign-up can never create a doctor', async () => {
    for (const role of ['DOCTOR', 'doctor', 'Doctor']) {
      const { user, cnic } = await registerPatient({ role });
      expect(user.role).toBe('PATIENT');
      expect((await prisma.user.findUniqueOrThrow({ where: { cnic } })).role).toBe('PATIENT');
    }
  });

  it('normalises CNIC with or without dashes and rejects duplicates', async () => {
    const { cnic } = await registerPatient({ cnic: '3520299887761' });
    expect(cnic).toBe('3520299887761');
    expect(await prisma.user.findUnique({ where: { cnic: '35202-9988776-1' } })).not.toBeNull();
    const dup = await api()
      .post('/api/auth/register')
      .send({ fullName: 'Dup', cnic: '35202-9988776-1', password: 'Abcdef12', confirmPassword: 'Abcdef12' });
    expect(dup.status).toBe(409);
  });

  it.each([
    [{ cnic: '123' }, 'cnic'],
    [{ email: 'not-an-email' }, 'email'],
    [{ phone: '12345' }, 'phone'],
    [{ password: 'short1', confirmPassword: 'short1' }, 'password'],
    [{ password: 'lettersonly', confirmPassword: 'lettersonly' }, 'password'],
    [{ password: '12345678', confirmPassword: '12345678' }, 'password'],
    [{ confirmPassword: 'Different1' }, 'confirmPassword'],
    [{ fullName: 'A' }, 'fullName'],
  ])('rejects invalid input %j', async (bad, field) => {
    const body = { fullName: 'Valid Name', cnic: nextCnic(), password: 'Abcdef12', confirmPassword: 'Abcdef12', ...bad };
    const res = await api().post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty(field);
    expect(JSON.stringify(res.body)).not.toMatch(/prisma/i);
  });

  it('rejects a duplicate email case-insensitively', async () => {
    await registerPatient({ email: 'same@mail.pk' });
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'Other', cnic: nextCnic(), email: 'SAME@mail.pk', password: 'Abcdef12', confirmPassword: 'Abcdef12' });
    expect(res.status).toBe(409);
  });
});

describe('login / me / logout', () => {
  it('logs in by CNIC (with or without dashes) and by email', async () => {
    const { cnic, password } = await registerPatient({ email: 'login@mail.pk' });
    for (const identifier of [cnic, cnic.replace(/-/g, ''), 'LOGIN@mail.pk']) {
      const res = await api().post('/api/auth/login').send({ identifier, password });
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('PATIENT');
    }
  });

  it('returns the same generic 401 for wrong password and unknown user', async () => {
    const { cnic } = await registerPatient();
    const a = await api().post('/api/auth/login').send({ identifier: cnic, password: 'Wrong1234' });
    const b = await api().post('/api/auth/login').send({ identifier: '99999-9999999-9', password: 'Wrong1234' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });

  it('logout revokes the token on the server', async () => {
    const { token } = await registerPatient();
    expect((await api().get('/api/auth/me').set(bearer(token))).status).toBe(200);
    expect((await api().post('/api/auth/logout').set(bearer(token))).status).toBe(200);
    expect((await api().get('/api/auth/me').set(bearer(token))).status).toBe(401);
    expect((await api().get('/api/patients/mine').set(bearer(token))).status).toBe(401);
  });

  it('rejects tampered, unsigned and garbage tokens', async () => {
    const { token } = await registerPatient();
    const [h, p] = token.split('.');
    const forged = `${h}.${Buffer.from(JSON.stringify({ sub: 'x', ver: 0, role: 'DOCTOR' })).toString('base64url')}.sig`;
    const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${p}.`;
    for (const t of [forged, unsigned, 'garbage']) {
      expect((await api().get('/api/auth/me').set(bearer(t))).status).toBe(401);
    }
  });

  it('rate-limits repeated login attempts', async () => {
    const limited = createApp({ ...loadConfig(), authRateLimitMax: 3, authRateLimitWindowMs: 60_000 });
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await request(limited).post('/api/auth/login').send({ identifier: 'x@y.pk', password: 'nope' })).status);
    }
    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses[3]).toBe(429);
  });
});

describe('configuration', () => {
  it('refuses to start without a strong JWT secret (no fallback)', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgresql://x/y' } as NodeJS.ProcessEnv)).toThrow(ConfigError);
    expect(() => loadConfig({ DATABASE_URL: 'postgresql://x/y', JWT_SECRET: 'short' } as NodeJS.ProcessEnv)).toThrow(ConfigError);
    expect(() =>
      loadConfig({ DATABASE_URL: 'postgresql://x/y', JWT_SECRET: 'smartcare_jwt_secret_2026_secure_key' } as NodeJS.ProcessEnv)
    ).toThrow(/published/);
    expect(loadConfig({ DATABASE_URL: 'postgresql://x/y', JWT_SECRET: 'a'.repeat(40) } as NodeJS.ProcessEnv).jwtSecret).toHaveLength(40);
  });
});
