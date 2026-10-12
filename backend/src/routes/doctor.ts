import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { ah } from './asyncHandler';
import * as c from '../controllers/doctor.controller';

// Doctor-only endpoints. Role is checked against the database on every request.
const r = Router();
r.use(requireAuth, requireRole('DOCTOR'));
r.get('/patients', ah(c.queue));
r.put('/patients/:id/review', ah(c.review));
r.post('/patients/:id/approve', ah(c.approve));
r.post('/patients/:id/reopen', ah(c.reopen));
export default r;
