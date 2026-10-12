import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env';

/**
 * JWT payload. Deliberately contains NO role: the role is always re-read from the database,
 * so editing a token or local storage can never grant extra permissions.
 */
export interface TokenPayload {
  sub: string; // user id
  ver: number; // users.tokenVersion at issue time
}

export function signAccessToken(userId: string, tokenVersion: number): string {
  const { jwtSecret, jwtExpiresIn } = getConfig();
  return jwt.sign({ ver: tokenVersion }, jwtSecret, {
    subject: userId,
    algorithm: 'HS256',
    expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getConfig().jwtSecret, { algorithms: ['HS256'] });
    if (typeof decoded !== 'object' || !decoded.sub || typeof decoded.ver !== 'number') return null;
    return { sub: decoded.sub, ver: decoded.ver };
  } catch {
    return null;
  }
}
