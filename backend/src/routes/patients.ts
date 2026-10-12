import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { ah } from './asyncHandler';
import * as c from '../controllers/patients.controller';

// Patient-facing case endpoints. Every route requires login; ownership is enforced in the service.
const r = Router();
r.use(requireAuth);
r.post('/', requireRole('PATIENT'), ah(c.create));
r.get('/mine', requireRole('PATIENT'), ah(c.listMine));
r.get('/:id', requireRole('PATIENT', 'DOCTOR'), ah(c.getOne)); // patient: own only (404 otherwise)
r.put('/:id', requireRole('PATIENT'), ah(c.update)); // edit own case while still pending
export default r;
