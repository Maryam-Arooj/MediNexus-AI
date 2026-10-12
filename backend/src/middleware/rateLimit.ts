import rateLimit from 'express-rate-limit';

export function authRateLimiter(max: number, windowMs: number) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many attempts. Please wait a few minutes and try again.' },
  });
}
