import { RequestHandler, Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { ah } from './asyncHandler';
import * as c from '../controllers/ai.controller';

// AI endpoints. Login required; per-user rate limit protects the AI quota. Nothing here is stored.
export function aiRouter(limiter: RequestHandler) {
  const r = Router();
  r.use(requireAuth);
  r.post('/symptoms', requireRole('PATIENT'), limiter, ah(c.symptoms));
  r.post('/document', requireRole('PATIENT', 'DOCTOR'), limiter, ah(c.document));
  return r;
}
