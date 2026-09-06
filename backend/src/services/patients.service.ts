import prisma from '../lib/prisma';
import { evaluateMedicalTriage, TriageInput } from '../triage/evaluateMedicalTriage';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generate a unique SmartCare patient ID like SC-2026-XXXX
 */
function generatePatientId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SC-${year}-${num}`;
}

/**
 * Generate a department-prefixed token number.
 * Looks at existing tokens in DB to determine the next number.
 */
async function generateTokenNumber(department: string): Promise<string> {
  const prefix = department === 'Dermatology' ? 'DERM' : 'GM';

  // Count existing tokens for this department prefix
  const existingCount = await prisma.patient.count({
    where: { tokenNumber: { startsWith: prefix } },
  });

  const num = existingCount + 1;
  const padded = num < 10 ? `0${num}` : `${num}`;
  return `${prefix}-${padded}`;
}

// ─── Formatted Response Builder ─────────────────────────────────────────────

/**
 * Builds a PatientRecord-shaped object matching what the frontend expects.
 * The frontend PatientRecord type is:
 *   { id, tokenNumber, createdAt, name, age, gender, symptoms, duration,
 *     department, opdRoom, analysis: { riskLevel, redFlags, suggestedDepartment,
 *     possibleConditions, recommendedAction, shortDoctorSummary, confidenceScore },
 *     status, doctorNotes?, approvedAt?, approvedBy? }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPatientRecord(patient: any, triage: any, review: any): object {
  const effectiveAction =
    review?.recommendedActionOverride || triage?.recommendedAction || '';

  return {
    id: patient.patientId,
    tokenNumber: patient.tokenNumber,
    createdAt: patient.createdAt
      ? new Date(patient.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Unknown',
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    symptoms: Array.isArray(patient.symptoms) ? patient.symptoms : [],
    duration: patient.duration,
    department: patient.department,
    opdRoom: patient.assignedRoom,
    analysis: triage
      ? {
          riskLevel: triage.riskLevel,
          redFlags: Array.isArray(triage.redFlags) ? triage.redFlags : [],
          suggestedDepartment: triage.riskLevel ? patient.department : 'General Medicine',
          possibleConditions: Array.isArray(triage.possibleConditions)
            ? triage.possibleConditions
            : [],
          recommendedAction: effectiveAction,
          shortDoctorSummary: triage.doctorHandoverSummary,
          confidenceScore: triage.confidenceScore,
        }
      : null,
    status: review?.status || 'Pending Review',
    doctorNotes: review?.clinicalNotes || undefined,
    approvedAt: review?.approvedAt
      ? new Date(review.approvedAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : undefined,
    approvedBy: review?.approvedBy || undefined,
    // Internal DB id for API calls
    _dbId: patient.id,
  };
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * POST /api/patients
 * Registers a new patient, runs deterministic triage, saves to DB.
 */
export async function registerPatient(input: TriageInput) {
  // Run deterministic triage engine
  const triageResult = evaluateMedicalTriage(input);

  const isGenMed = triageResult.suggestedDepartment === 'General Medicine';
  const assignedRoom = isGenMed
    ? 'Room 104 — General Medicine OPD'
    : 'Room 208 — Dermatology Clinic';

  // Generate unique IDs
  let patientId = generatePatientId();
  // Ensure uniqueness (very unlikely collision but safe)
  let attempts = 0;
  while (await prisma.patient.findUnique({ where: { patientId } })) {
    patientId = generatePatientId();
    attempts++;
    if (attempts > 10) throw new Error('Failed to generate unique patient ID');
  }

  const tokenNumber = await generateTokenNumber(triageResult.suggestedDepartment);

  // Save Patient
  const patient = await prisma.patient.create({
    data: {
      patientId,
      name: input.name.trim() || 'Anonymous Patient',
      age: Number(input.age),
      gender: input.gender,
      symptoms: input.symptoms,
      duration: input.duration,
      tokenNumber,
      department: triageResult.suggestedDepartment,
      assignedRoom,
    },
  });

  // Save TriageResult
  const triage = await prisma.triageResult.create({
    data: {
      patientId: patient.id,
      riskLevel: triageResult.riskLevel,
      redFlags: triageResult.redFlags,
      possibleConditions: triageResult.possibleConditions,
      recommendedAction: triageResult.recommendedAction,
      doctorHandoverSummary: triageResult.doctorHandoverSummary,
      confidenceScore: triageResult.confidenceScore,
    },
  });

  // Save DoctorReview (initial Pending state)
  const review = await prisma.doctorReview.create({
    data: {
      patientId: patient.id,
      status: 'Pending Review',
    },
  });

  return buildPatientRecord(patient, triage, review);
}

/**
 * GET /api/patients
 * Returns all patients with triage and review data.
 */
export async function getAllPatients() {
  const patients = await prisma.patient.findMany({
    include: { triage: true, review: true },
    orderBy: { createdAt: 'desc' },
  });

  return patients.map((p) => buildPatientRecord(p, p.triage, p.review));
}

/**
 * GET /api/patients/:id
 * Returns a single patient by patientId (e.g. "SC-2026-1042").
 */
export async function getPatientById(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { patientId },
    include: { triage: true, review: true },
  });

  if (!patient) return null;
  return buildPatientRecord(patient, patient.triage, patient.review);
}

/**
 * PUT /api/patients/:id/review
 * Updates doctor clinical notes and optional action override.
 */
export async function updatePatientReview(
  patientId: string,
  data: { clinicalNotes?: string; recommendedActionOverride?: string; status?: string }
) {
  const patient = await prisma.patient.findUnique({ where: { patientId } });
  if (!patient) return null;

  const review = await prisma.doctorReview.upsert({
    where: { patientId: patient.id },
    update: {
      clinicalNotes: data.clinicalNotes,
      recommendedActionOverride: data.recommendedActionOverride,
      status: data.status || 'Under Review',
    },
    create: {
      patientId: patient.id,
      clinicalNotes: data.clinicalNotes,
      recommendedActionOverride: data.recommendedActionOverride,
      status: data.status || 'Under Review',
    },
  });

  const triage = await prisma.triageResult.findUnique({ where: { patientId: patient.id } });
  return buildPatientRecord(patient, triage, review);
}

/**
 * POST /api/patients/:id/approve
 * Marks the patient triage as approved.
 */
export async function approvePatient(
  patientId: string,
  data: { approvedBy?: string; clinicalNotes?: string }
) {
  const patient = await prisma.patient.findUnique({ where: { patientId } });
  if (!patient) return null;

  const review = await prisma.doctorReview.upsert({
    where: { patientId: patient.id },
    update: {
      status: 'Approved',
      approvedBy: data.approvedBy || 'Dr. Resident Medical Officer',
      approvedAt: new Date(),
      clinicalNotes: data.clinicalNotes,
    },
    create: {
      patientId: patient.id,
      status: 'Approved',
      approvedBy: data.approvedBy || 'Dr. Resident Medical Officer',
      approvedAt: new Date(),
      clinicalNotes: data.clinicalNotes,
    },
  });

  const triage = await prisma.triageResult.findUnique({ where: { patientId: patient.id } });
  return buildPatientRecord(patient, triage, review);
}
