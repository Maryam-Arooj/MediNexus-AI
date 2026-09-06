import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { createError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'smartcare_jwt_secret_2026_secure_key';
const JWT_EXPIRES_IN = '7d';

function signToken(userId: string, cnic: string, role: string): string {
  return jwt.sign({ userId, cnic, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function safeUser(user: {
  id: string;
  fullName: string;
  cnic: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    cnic: user.cnic,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// ─── POST /api/auth/register ────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fullName, cnic, phone, email, password, confirmPassword, role } = req.body;

    if (!fullName || !cnic || !password) {
      next(createError('Full name, CNIC, and password are required.', 400));
      return;
    }
    if (password !== confirmPassword) {
      next(createError('Passwords do not match.', 400));
      return;
    }
    if (password.length < 6) {
      next(createError('Password must be at least 6 characters.', 400));
      return;
    }

    // Check uniqueness
    const existingByCnic = await prisma.user.findUnique({ where: { cnic } });
    if (existingByCnic) {
      next(createError('An account with this CNIC already exists.', 409));
      return;
    }
    if (email) {
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        next(createError('An account with this email already exists.', 409));
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        cnic,
        phone: phone || null,
        email: email || null,
        passwordHash,
        role: role === 'doctor' ? 'doctor' : 'patient',
      },
    });

    const token = signToken(user.id, user.cnic, user.role);

    res.status(201).json({
      success: true,
      data: { token, user: safeUser(user) },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/login ───────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { identifier, password } = req.body; // identifier = CNIC or email

    if (!identifier || !password) {
      next(createError('CNIC/Email and password are required.', 400));
      return;
    }

    // Try CNIC first, then email
    let user = await prisma.user.findUnique({ where: { cnic: identifier } });
    if (!user && identifier.includes('@')) {
      user = await prisma.user.findUnique({ where: { email: identifier } });
    }

    if (!user) {
      next(createError('Invalid credentials.', 401));
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      next(createError('Invalid credentials.', 401));
      return;
    }

    const token = signToken(user.id, user.cnic, user.role);

    res.json({
      success: true,
      data: { token, user: safeUser(user) },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/auth/me ───────────────────────────────────────────────────────

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(createError('Unauthorized.', 401));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      next(createError('User not found.', 404));
      return;
    }

    res.json({ success: true, data: safeUser(user) });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/logout ──────────────────────────────────────────────────
// JWT is stateless — logout is handled client-side (drop the token).
// This endpoint exists for convention and clean API design.

export async function logout(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: { message: 'Logged out successfully.' } });
}
