import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthPayload {
  userId: string;
  cnic: string;
  role: string;
}

// Extend Express Request to carry the verified user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(createError('Unauthorized — no token provided.', 401));
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || 'smartcare_jwt_secret_2026_secure_key';

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(createError('Unauthorized — invalid or expired token.', 401));
  }
}
