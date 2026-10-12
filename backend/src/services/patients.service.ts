import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { conflict, notFound } from '../lib/httpError';
import { AuthUser } from '../middleware/auth';
import { CaseInput } from '../validation/schemas';
import { evaluateMedicalTriage } from '../triage/evaluateMedicalTriage';
import { DEPARTMENTS, Department } from '../triage/triageConfig';
import { allocatePatientId, allocateToken } from './counters';
import { patientInclude, toPatientRecord } from './patientRecord';
import { dangerSignsFromFlags } from '../triage/emergencyRules';

const asFlags = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === 'P2002';
}

function triageFor(input: CaseInput, displayName: string) {
  return evaluateMedicalTriage({
    name: displayName,
    age: input.age,
    gender: input.gender,
    symptoms: input.symptoms,
    duration: input.duration,
    dangerSigns: input.dangerSigns,
  });
}

/**
 * Creates a case for the logged-in patient. Counter allocation, patient, triage and review rows
 * are written in ONE transaction: either everything is saved or nothing is.
 * A repeated clientRequestId (double click / retry) returns the existing case instead of a duplicate.
 */
export async function createCase(user: AuthUser, input: CaseInput) {
  if (input.clientRequestId) {
    const existing = await prisma.patient.findFirst({
      where: { userId: user.id, clientRequestId: input.clientRequestId },
      include: patientInclude,
    });
    if (existing) return { record: toPatientRecord(existing, user.role), created: false };
  }

  const name = input.name || user.fullName;
  const triage = triageFor(input, name);
  const dept = triage.suggestedDepartment;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const tokenNumber = await allocateToken(tx, DEPARTMENTS[dept].tokenPrefix);
      const patientId = await allocatePatientId(tx);
      return tx.patient.create({
        data: {
          patientId,
          tokenNumber,
          name,
          age: input.age,
          gender: input.gender,
          symptoms: input.symptoms,
          duration: input.duration,
          department: dept,
          assignedRoom: DEPARTMENTS[dept].room,
          userId: user.id,
          clientRequestId: input.clientRequestId ?? null,
          triage: {
            create: {
              riskLevel: triage.riskLevel,
              riskReason: triage.riskReason,
              redFlags: triage.redFlags,
              possibleConditions: triage.possibleConditions,
              recommendedAction: triage.recommendedAction,
              doctorHandoverSummary: triage.doctorHandoverSummary,
              engineVersion: triage.engineVersion,
            },
          },
          review: { create: { status: 'Pending Review' } },
        },
        include: patientInclude,
      });
    }, TX_OPTIONS);
    return { record: toPatientRecord(created, user.role), created: true };
  } catch (err) {
    // Two identical submissions raced each other: return the one that won.
    if (input.clientRequestId && isUniqueViolation(err)) {
      const existing = await prisma.patient.findFirst({
        where: { userId: user.id, clientRequestId: input.clientRequestId },
        include: patientInclude,
      });
      if (existing) return { record: toPatientRecord(existing, user.role), created: false };
    }
    throw err;
  }
}

/** Patient: own cases only, newest first. */
export async function listMyCases(user: AuthUser) {
  const rows = await prisma.patient.findMany({
    where: { userId: user.id },
    include: patientInclude,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((p) => toPatientRecord(p, user.role));
}

/**
 * Doctors may open any case. Patients may open only their own; someone else's case returns
 * 404 (not 403) so patients cannot discover which ids exist.
 */
export async function getCaseForUser(user: AuthUser, publicId: string) {
  const p = await prisma.patient.findUnique({ where: { patientId: publicId }, include: patientInclude });
  if (!p || (user.role !== 'DOCTOR' && p.userId !== user.id)) throw notFound('Case not found.');
  return toPatientRecord(p, user.role);
}

/**
 * Patient edits their own case (Edit Symptoms). Allowed only while still "Pending Review".
 * Keeps the same patient id; issues a new token only if the department changes.
 * No write at all when nothing changed.
 */
export async function updateMyCase(user: AuthUser, publicId: string, input: CaseInput) {
  const p = await prisma.patient.findUnique({ where: { patientId: publicId }, include: patientInclude });
  if (!p || p.userId !== user.id) throw notFound('Case not found.');
  if ((p.review?.status ?? 'Pending Review') !== 'Pending Review') {
    throw conflict('A doctor has already started reviewing this case, so it can no longer be edited.');
  }

  const name = input.name || p.name;
  const sameSymptoms =
    JSON.stringify([...(p.symptoms as string[])].sort()) === JSON.stringify([...input.symptoms].sort());
  if (
    name === p.name &&
    input.age === p.age &&
    input.gender === p.gender &&
    input.duration === p.duration &&
    sameSymptoms &&
    JSON.stringify([...dangerSignsFromFlags(asFlags(p.triage?.redFlags))].sort()) ===
      JSON.stringify([...input.dangerSigns].sort())
  ) {
    return { record: toPatientRecord(p, user.role), changed: false };
  }

  const triage = triageFor(input, name);
  const dept: Department = triage.suggestedDepartment;

  const updated = await prisma.$transaction(async (tx) => {
    // Re-check the status inside the transaction so a doctor review that started meanwhile wins.
    const locked = await tx.doctorReview.updateMany({
      where: { patientId: p.id, status: 'Pending Review' },
      data: { status: 'Pending Review' },
    });
    if (locked.count === 0) {
      throw conflict('A doctor has already started reviewing this case, so it can no longer be edited.');
    }
    const tokenNumber =
      dept === p.department ? p.tokenNumber : await allocateToken(tx, DEPARTMENTS[dept].tokenPrefix);
    const triageData = {
      riskLevel: triage.riskLevel,
      riskReason: triage.riskReason,
      redFlags: triage.redFlags,
      possibleConditions: triage.possibleConditions,
      recommendedAction: triage.recommendedAction,
      doctorHandoverSummary: triage.doctorHandoverSummary,
      engineVersion: triage.engineVersion,
      confidenceScore: null,
    };
    return tx.patient.update({
      where: { id: p.id },
      data: {
        name,
        age: input.age,
        gender: input.gender,
        symptoms: input.symptoms,
        duration: input.duration,
        department: dept,
        assignedRoom: DEPARTMENTS[dept].room,
        tokenNumber,
        triage: { upsert: { create: triageData, update: triageData } },
      },
      include: patientInclude,
    });
  }, TX_OPTIONS);

  return { record: toPatientRecord(updated, user.role), changed: true };
}

export type { Prisma };
