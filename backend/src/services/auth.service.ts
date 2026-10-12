import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import prisma from '../lib/prisma';
import { conflict, unauthorized } from '../lib/httpError';
import { signAccessToken } from '../lib/jwt';
import { normalizeCnic } from '../validation/schemas';

export const BCRYPT_ROUNDS = 12;
// Used to keep login timing similar whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

export function publicUser(u: Pick<User, 'id' | 'fullName' | 'cnic' | 'email' | 'phone' | 'role' | 'createdAt'>) {
  return {
    id: u.id,
    fullName: u.fullName,
    cnic: u.cnic,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: 'insensitive' } } });
}

/** Public sign-up. ALWAYS creates a PATIENT — there is no way to choose a role here. */
export async function registerPatient(input: {
  fullName: string;
  cnic: string;
  phone?: string;
  email?: string;
  password: string;
}) {
  if (await prisma.user.findUnique({ where: { cnic: input.cnic } })) {
    throw conflict('An account with this CNIC already exists. Please log in instead.');
  }
  if (input.email && (await findUserByEmail(input.email))) {
    throw conflict('An account with this email already exists. Please log in instead.');
  }
  try {
    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        cnic: input.cnic,
        phone: input.phone ?? null,
        email: input.email ?? null,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
        role: 'PATIENT',
      },
    });
    return { token: signAccessToken(user.id, user.tokenVersion), user: publicUser(user) };
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') throw conflict('An account with these details already exists.');
    throw err;
  }
}

export async function login(identifier: string, password: string) {
  const id = identifier.trim();
  let user: User | null = null;
  if (id.includes('@')) {
    user = await findUserByEmail(id);
  } else {
    const cnic = normalizeCnic(id);
    user = (cnic && (await prisma.user.findUnique({ where: { cnic } }))) || (await prisma.user.findUnique({ where: { cnic: id } }));
  }
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Invalid CNIC/email or password.');
  return { token: signAccessToken(user.id, user.tokenVersion), user: publicUser(user) };
}

/** Invalidates every token issued to this user so far (server-side logout). */
export async function logout(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}
