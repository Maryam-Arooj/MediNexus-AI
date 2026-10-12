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

/** Per-user limit for AI endpoints (use AFTER requireAuth). Protects the free AI quota. */
export function aiRateLimiter(max: number, windowMs: number) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `ai:${req.user?.id ?? req.ip}`,
    message: { success: false, error: 'Too many AI requests. Please wait a few minutes and try again.' },
  });
}
