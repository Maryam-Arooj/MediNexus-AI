import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { verifyAccessToken } from '../lib/jwt';
import { forbidden, unauthorized } from '../lib/httpError';

export interface AuthUser {
  id: string;
  fullName: string;
  role: Role;
  tokenVersion: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verifies the Bearer token AND re-loads the user from PostgreSQL on every request.
 * Rejects tokens issued before the last logout (tokenVersion mismatch) or for deleted users.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      next(unauthorized());
      return;
    }
    const payload = verifyAccessToken(header.slice(7).trim());
    if (!payload) {
      next(unauthorized('Your session has expired. Please log in again.'));
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, fullName: true, role: true, tokenVersion: true },
    });
    if (!user || user.tokenVersion !== payload.ver) {
      next(unauthorized('Your session has expired. Please log in again.'));
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Allows the request only if the (database-verified) role is one of `roles`. Use after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(forbidden());
      return;
    }
    next();
  };
}
