import prisma from '../lib/prisma';
import { conflict, notFound } from '../lib/httpError';
import { AuthUser } from '../middleware/auth';
import { patientInclude, toPatientRecord } from './patientRecord';
import { CaseSummaryInput, summarizeCase } from '../ai/caseSummary';

const clean = (v: string | undefined | null): string | null => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

async function loadCase(publicId: string) {
  const p = await prisma.patient.findUnique({ where: { patientId: publicId }, include: patientInclude });
  if (!p) throw notFound('Case not found.');
  return p;
}

/** Doctor queue — every case, newest first. */
export async function listQueue(doctor: AuthUser) {
  const rows = await prisma.patient.findMany({ include: patientInclude, orderBy: { createdAt: 'desc' } });
  return rows.map((p) => toPatientRecord(p, doctor.role));
}

/**
 * Save clinical notes and/or a changed recommended action.
 * - Only fields that actually changed are written; if nothing changed, nothing is written.
 * - An action equal to the rule engine's default is stored as "no override".
 * - Approved cases are locked (reopen first).
 */
export async function saveReview(
  doctor: AuthUser,
  publicId: string,
  input: { clinicalNotes?: string; recommendedAction?: string }
) {
  const p = await loadCase(publicId);
  const review = p.review;
  if (review?.status === 'Approved') {
    throw conflict('This case is approved. Reopen it before making changes.');
  }

  const data: { clinicalNotes?: string | null; recommendedActionOverride?: string | null } = {};
  if (input.clinicalNotes !== undefined) {
    const notes = clean(input.clinicalNotes);
    if (notes !== (review?.clinicalNotes ?? null)) data.clinicalNotes = notes;
  }
  if (input.recommendedAction !== undefined) {
    const action = clean(input.recommendedAction);
    const override = action && action !== p.triage?.recommendedAction ? action : null;
    if (override !== (review?.recommendedActionOverride ?? null)) data.recommendedActionOverride = override;
  }

  if (Object.keys(data).length === 0) {
    return { record: toPatientRecord(p, doctor.role), changed: false };
  }

  const now = new Date();
  await prisma.doctorReview.upsert({
    where: { patientId: p.id },
    update: { ...data, status: 'Under Review', reviewedById: doctor.id, reviewedAt: now },
    create: { patientId: p.id, ...data, status: 'Under Review', reviewedById: doctor.id, reviewedAt: now },
  });
  return { record: toPatientRecord(await loadCase(publicId), doctor.role), changed: true };
}

/** Approve a case. The approver is always the logged-in doctor (never a client-supplied name). */
export async function approveCase(doctor: AuthUser, publicId: string, input: { clinicalNotes?: string }) {
  const p = await loadCase(publicId);
  const now = new Date();
  const notes = input.clinicalNotes !== undefined ? clean(input.clinicalNotes) : undefined;

  await prisma.$transaction(async (tx) => {
    // Make sure a review row exists (legacy data), then approve only if not already approved.
    await tx.doctorReview.upsert({
      where: { patientId: p.id },
      update: {},
      create: { patientId: p.id, status: 'Pending Review' },
    });
    const res = await tx.doctorReview.updateMany({
      where: { patientId: p.id, status: { not: 'Approved' } },
      data: {
        status: 'Approved',
        approvedBy: doctor.fullName,
        approvedById: doctor.id,
        approvedAt: now,
        reviewedById: doctor.id,
        reviewedAt: now,
        ...(notes !== undefined ? { clinicalNotes: notes } : {}),
      },
    });
    if (res.count === 0) throw conflict('This case is already approved.');
  });

  return toPatientRecord(await loadCase(publicId), doctor.role);
}

/** Reopen an approved case: clears the approval (who/when) and returns it to "Under Review". */
export async function reopenCase(doctor: AuthUser, publicId: string) {
  const p = await loadCase(publicId);
  const res = await prisma.doctorReview.updateMany({
    where: { patientId: p.id, status: 'Approved' },
    data: {
      status: 'Under Review',
      approvedBy: null,
      approvedById: null,
      approvedAt: null,
      reviewedById: doctor.id,
      reviewedAt: new Date(),
    },
  });
  if (res.count === 0) throw conflict('Only approved cases can be reopened.');
  return toPatientRecord(await loadCase(publicId), doctor.role);
}

/**
 * AI draft summary for the review modal. Builds a DE-IDENTIFIED input (no name, CNIC, phone,
 * email, patient id or token) and asks the LLM for an SBAR draft. Nothing is stored.
 */
export function caseSummaryInput(p: Awaited<ReturnType<typeof loadCase>>): CaseSummaryInput {
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return {
    age: p.age,
    gender: p.gender,
    symptoms: strings(p.symptoms),
    duration: p.duration,
    department: p.department,
    riskLevel: p.triage?.riskLevel ?? null,
    riskReason: p.triage?.riskReason ?? null,
    ruleFlags: strings(p.triage?.redFlags),
    ruleConditionsToConsider: strings(p.triage?.possibleConditions),
  };
}

export async function aiCaseSummary(publicId: string) {
  const p = await loadCase(publicId);
  return summarizeCase(caseSummaryInput(p));
}
