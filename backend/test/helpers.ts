import request from 'supertest';
import prisma from '../src/lib/prisma';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config/env';
import { provisionDoctor } from '../src/services/doctorProvisioning';

export const app = createApp({ ...loadConfig(), authRateLimitMax: 10_000 });
export const api = () => request(app);

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "doctor_reviews", "triage_results", "patients", "users", "token_counters", "role_change_audit" CASCADE'
  );
}

let cnicSeq = 1000000;
export function nextCnic() {
  cnicSeq += 1;
  return `35202-${String(cnicSeq).padStart(7, '0')}-1`;
}

export async function registerPatient(overrides: Record<string, unknown> = {}) {
  const password = 'Patient123';
  const body = {
    fullName: 'Test Patient',
    cnic: nextCnic(),
    password,
    confirmPassword: password,
    ...overrides,
  };
  const res = await api().post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token as string, user: res.body.data.user, password, cnic: body.cnic as string };
}

export const DOCTOR_ENV = {
  NODE_ENV: 'test',
  DEMO_DOCTOR_EMAIL: 'demo.doctor@medinexus.test',
  DEMO_DOCTOR_PASSWORD: 'DoctorPass2026x',
  DEMO_DOCTOR_NAME: 'Dr. Test Physician',
};

export async function doctorToken() {
  await provisionDoctor(prisma, { env: DOCTOR_ENV });
  const res = await api()
    .post('/api/auth/login')
    .send({ identifier: DOCTOR_ENV.DEMO_DOCTOR_EMAIL, password: DOCTOR_ENV.DEMO_DOCTOR_PASSWORD });
  if (res.status !== 200) throw new Error(`doctor login failed ${res.status}`);
  return res.body.data.token as string;
}

export const validCase = (o: Record<string, unknown> = {}) => ({
  age: 30,
  gender: 'Female',
  symptoms: ['Skin rash', 'Itching'],
  duration: '3 - 5 days',
  ...o,
});

export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

export async function createCase(token: string, o: Record<string, unknown> = {}) {
  const res = await api().post('/api/patients').set(bearer(token)).send(validCase(o));
  if (res.status !== 201) throw new Error(`create failed ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

export { prisma };
