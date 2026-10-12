import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { ah } from './asyncHandler';
import * as c from '../controllers/doctor.controller';
import { getConfig } from '../config/env';
import { aiRateLimiter } from '../middleware/rateLimit';

// Doctor-only endpoints. Role is checked against the database on every request.
const r = Router();
const cfg = getConfig();
const aiLimiter = aiRateLimiter(cfg.aiRateLimitMax, cfg.aiRateLimitWindowMs);
r.use(requireAuth, requireRole('DOCTOR'));
r.get('/patients', ah(c.queue));
r.put('/patients/:id/review', ah(c.review));
r.post('/patients/:id/approve', ah(c.approve));
r.post('/patients/:id/reopen', ah(c.reopen));
// AI draft summary (de-identified input, nothing stored). Rate-limited to protect the AI quota.
r.post('/patients/:id/ai-summary', aiLimiter, ah(c.aiSummary));
export default r;
