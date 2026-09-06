import { Router } from 'express';
import {
  createPatient,
  listPatients,
  getPatient,
  reviewPatient,
  approvePatient,
} from '../controllers/patients.controller';

const router = Router();

// POST   /api/patients          — register patient + triage
// GET    /api/patients          — list all patients
// GET    /api/patients/:id      — get single patient by patientId
// PUT    /api/patients/:id/review   — doctor saves edits
// POST   /api/patients/:id/approve — doctor approves

router.post('/', createPatient);
router.get('/', listPatients);
router.get('/:id', getPatient);
router.put('/:id/review', reviewPatient);
router.post('/:id/approve', approvePatient);

export default router;
