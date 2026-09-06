import { Request, Response, NextFunction } from 'express';
import * as patientsService from '../services/patients.service';
import { createError } from '../middleware/errorHandler';

// ─── POST /api/patients ────────────────────────────────────────────────────

export async function createPatient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, age, gender, symptoms, duration } = req.body;

    // Basic validation
    if (!age || Number(age) <= 0 || Number(age) > 120) {
      next(createError('Valid age between 1 and 120 is required.', 400));
      return;
    }
    if (!gender) {
      next(createError('Gender is required.', 400));
      return;
    }
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      next(createError('At least one symptom is required.', 400));
      return;
    }
    if (!duration) {
      next(createError('Symptom duration is required.', 400));
      return;
    }

    const patient = await patientsService.registerPatient({
      name: name || '',
      age: Number(age),
      gender,
      symptoms,
      duration,
    });

    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/patients ─────────────────────────────────────────────────────

export async function listPatients(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const patients = await patientsService.getAllPatients();
    res.json({ success: true, data: patients });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/patients/:id ─────────────────────────────────────────────────

export async function getPatient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const patient = await patientsService.getPatientById(req.params.id);
    if (!patient) {
      next(createError(`Patient ${req.params.id} not found.`, 404));
      return;
    }
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/patients/:id/review ─────────────────────────────────────────

export async function reviewPatient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { clinicalNotes, recommendedActionOverride, status } = req.body;

    const patient = await patientsService.updatePatientReview(req.params.id, {
      clinicalNotes,
      recommendedActionOverride,
      status,
    });

    if (!patient) {
      next(createError(`Patient ${req.params.id} not found.`, 404));
      return;
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/patients/:id/approve ───────────────────────────────────────

export async function approvePatient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { approvedBy, clinicalNotes } = req.body;

    const patient = await patientsService.approvePatient(req.params.id, {
      approvedBy,
      clinicalNotes,
    });

    if (!patient) {
      next(createError(`Patient ${req.params.id} not found.`, 404));
      return;
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}
