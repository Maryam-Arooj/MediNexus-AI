import { RequestHandler, Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { ah } from './asyncHandler';
import * as c from '../controllers/auth.controller';

export function authRouter(limiter: RequestHandler) {
  const r = Router();
  r.post('/register', limiter, ah(c.register)); // always creates a PATIENT
  r.post('/login', limiter, ah(c.login));
  r.get('/me', requireAuth, ah(c.me));
  r.post('/logout', requireAuth, ah(c.logout)); // revokes all existing tokens of this user
  return r;
}
