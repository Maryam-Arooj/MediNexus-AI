import { Prisma, Role } from '@prisma/client';

export const patientInclude = {
  triage: true,
  review: {
    include: {
      reviewedBy: { select: { fullName: true } },
      approver: { select: { fullName: true } },
    },
  },
} satisfies Prisma.PatientInclude;

export type PatientWithRelations = Prisma.PatientGetPayload<{ include: typeof patientInclude }>;

const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export type ReviewStatus = 'Pending Review' | 'Under Review' | 'Approved';

/**
 * Shapes a case for the API. Doctor-only fields (possible conditions, handover summary,
 * clinical notes, rule default action) are omitted for patients.
 */
export function toPatientRecord(p: PatientWithRelations, viewer: Role) {
  const isDoctor = viewer === 'DOCTOR';
  const t = p.triage;
  const r = p.review;
  const status = (r?.status as ReviewStatus) || 'Pending Review';
  const effectiveAction = r?.recommendedActionOverride || t?.recommendedAction || '';

  return {
    id: p.patientId,
    tokenNumber: p.tokenNumber,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    name: p.name,
    age: p.age,
    gender: p.gender,
    symptoms: asStringArray(p.symptoms),
    duration: p.duration,
    department: p.department,
    opdRoom: p.assignedRoom,
    analysis: t
      ? {
          engineVersion: t.engineVersion,
          riskLevel: t.riskLevel,
          riskReason: t.riskReason,
          redFlags: asStringArray(t.redFlags),
          suggestedDepartment: p.department,
          recommendedAction: effectiveAction,
          actionOverriddenByDoctor: Boolean(r?.recommendedActionOverride),
          ...(isDoctor
            ? {
                defaultRecommendedAction: t.recommendedAction,
                possibleConditions: asStringArray(t.possibleConditions),
                handoverSummary: t.doctorHandoverSummary,
              }
            : {}),
        }
      : null,
    status,
    review: {
      reviewedBy: r?.reviewedBy?.fullName ?? null,
      reviewedAt: r?.reviewedAt ? r.reviewedAt.toISOString() : null,
      approvedBy: r?.approvedBy ?? null,
      approvedAt: r?.approvedAt ? r.approvedAt.toISOString() : null,
      ...(isDoctor ? { clinicalNotes: r?.clinicalNotes ?? null } : {}),
    },
    canEdit: !isDoctor && status === 'Pending Review',
    isLegacyUnlinked: isDoctor ? p.userId === null : undefined,
  };
}

export type PatientRecordDTO = ReturnType<typeof toPatientRecord>;
