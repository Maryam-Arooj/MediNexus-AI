/**
 * Doctor-account provisioning — the ONLY way a DOCTOR role is granted.
 *
 * Rules:
 *  - Reads DEMO_DOCTOR_EMAIL / DEMO_DOCTOR_PASSWORD / DEMO_DOCTOR_NAME / DEMO_DOCTOR_CNIC from the environment.
 *  - Idempotent: if the doctor already exists, nothing is changed (password is never reset).
 *  - Never silently overwrites an existing account: if the email/CNIC belongs to a PATIENT account the
 *    run stops, unless --promote-existing is given AND the configured password matches that account.
 *  - Refuses to run when NODE_ENV=production unless ALLOW_DOCTOR_PROVISIONING_IN_PRODUCTION=true.
 */
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { normalizeCnic } from '../validation/schemas';
import { BCRYPT_ROUNDS } from './auth.service';

export interface ProvisionOptions {
  env: NodeJS.ProcessEnv;
  promoteExisting?: boolean;
}

export type ProvisionResult =
  | { status: 'created'; email: string }
  | { status: 'already-doctor'; email: string }
  | { status: 'promoted'; email: string };

export class ProvisionError extends Error {}

const PLACEHOLDER = /change[_-]?me|example\.com$|^password|placeholder/i;

export function readDoctorConfig(env: NodeJS.ProcessEnv) {
  const email = (env.DEMO_DOCTOR_EMAIL || '').trim().toLowerCase();
  const password = env.DEMO_DOCTOR_PASSWORD || '';
  const fullName = (env.DEMO_DOCTOR_NAME || 'Demo Doctor').trim();
  const cnicRaw = (env.DEMO_DOCTOR_CNIC || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ProvisionError('DEMO_DOCTOR_EMAIL is missing or not a valid email address.');
  }
  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ProvisionError('DEMO_DOCTOR_PASSWORD must be at least 12 characters and contain letters and numbers.');
  }
  if (PLACEHOLDER.test(password)) {
    throw new ProvisionError('DEMO_DOCTOR_PASSWORD still looks like the placeholder from .env.example. Choose your own password.');
  }
  if (fullName.length < 2) throw new ProvisionError('DEMO_DOCTOR_NAME must be at least 2 characters.');

  let cnic: string;
  const cnicConfigured = Boolean(cnicRaw);
  if (cnicRaw) {
    const n = normalizeCnic(cnicRaw);
    if (!n) throw new ProvisionError('DEMO_DOCTOR_CNIC must be 13 digits (e.g. 35202-1234567-1).');
    cnic = n;
  } else {
    // The CNIC column is required and unique, but doctors log in by email. Without a real CNIC we store a
    // reserved placeholder derived from the email ("00000-…": 00000 is not a valid CNIC region code, so it
    // can never clash with a real patient's CNIC).
    const digits = BigInt('0x' + createHash('sha256').update(email).digest('hex').slice(0, 15)).toString().slice(-7).padStart(7, '0');
    cnic = `00000-${digits}-0`;
  }
  return { email, password, fullName, cnic, cnicConfigured };
}

export async function provisionDoctor(prisma: PrismaClient, opts: ProvisionOptions): Promise<ProvisionResult> {
  const nodeEnv = opts.env.NODE_ENV || 'development';
  if (nodeEnv === 'production' && opts.env.ALLOW_DOCTOR_PROVISIONING_IN_PRODUCTION !== 'true') {
    throw new ProvisionError(
      'Refusing to provision a doctor account with NODE_ENV=production. Set ALLOW_DOCTOR_PROVISIONING_IN_PRODUCTION=true only for a deliberate, verified real doctor.'
    );
  }
  const cfg = readDoctorConfig(opts.env);

  const byEmail = await prisma.user.findFirst({ where: { email: { equals: cfg.email, mode: 'insensitive' } } });
  const byCnic = cfg.cnicConfigured ? await prisma.user.findUnique({ where: { cnic: cfg.cnic } }) : null;

  if (byEmail && byCnic && byEmail.id !== byCnic.id) {
    throw new ProvisionError('The configured email and CNIC belong to two different existing accounts. Nothing was changed.');
  }
  const existing = byEmail ?? byCnic;

  if (existing) {
    if (existing.role === 'DOCTOR') {
      // Idempotent: never reset the password or other details of an existing doctor.
      return { status: 'already-doctor', email: existing.email ?? cfg.email };
    }
    if (!opts.promoteExisting) {
      throw new ProvisionError(
        `An existing PATIENT account already uses ${byEmail ? 'this email' : 'this CNIC'}. Nothing was changed. ` +
          'To make that account a doctor, re-run with --promote-existing (the configured password must match that account).'
      );
    }
    const ok = await bcrypt.compare(cfg.password, existing.passwordHash);
    if (!ok) {
      throw new ProvisionError('--promote-existing refused: DEMO_DOCTOR_PASSWORD does not match that account. Nothing was changed.');
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.id },
        // tokenVersion bump: sessions issued while it was a patient are ended.
        data: { role: 'DOCTOR', tokenVersion: { increment: 1 } },
      }),
      prisma.roleChangeAudit.create({
        data: {
          userId: existing.id,
          oldRole: existing.role,
          newRole: 'DOCTOR',
          reason: 'doctor:provision --promote-existing (password verified)',
        },
      }),
    ]);
    return { status: 'promoted', email: existing.email ?? cfg.email };
  }

  const user = await prisma.user.create({
    data: {
      fullName: cfg.fullName,
      email: cfg.email,
      cnic: cfg.cnic,
      passwordHash: await bcrypt.hash(cfg.password, BCRYPT_ROUNDS),
      role: 'DOCTOR',
    },
  });
  await prisma.roleChangeAudit.create({
    data: { userId: user.id, oldRole: 'NONE', newRole: 'DOCTOR', reason: 'doctor:provision (new account)' },
  });
  return { status: 'created', email: cfg.email };
}
