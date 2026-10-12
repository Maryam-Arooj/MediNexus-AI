-- MediNexus AI repair migration (non-destructive).
-- * No table is dropped and no patient row is deleted or modified.
-- * Unverified self-registered "doctor" accounts are demoted to PATIENT and every change is
--   recorded in "role_change_audit" so it can be reviewed/reverted.
-- Take a backup first (see SETUP.md) and apply with: npx prisma migrate deploy

-- ── Audit table ───────────────────────────────────────────────────────────────
CREATE TABLE "role_change_audit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldRole" TEXT NOT NULL,
    "newRole" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_change_audit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "role_change_audit_userId_idx" ON "role_change_audit"("userId");

-- ── Role enum ─────────────────────────────────────────────────────────────────
CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR');

INSERT INTO "role_change_audit" ("id", "userId", "oldRole", "newRole", "reason")
SELECT gen_random_uuid()::text, "id", "role", 'PATIENT',
       'Migration 20261012090000: doctor role was self-selected at public sign-up and is not verified. Re-grant with: npm run doctor:provision -- --promote-existing'
FROM "users"
WHERE lower("role") <> 'patient';

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING ('PATIENT'::"Role");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PATIENT';

-- ── Session revocation ────────────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- ── Patients: idempotency key, updatedAt, indexes ─────────────────────────────
ALTER TABLE "patients" ADD COLUMN "clientRequestId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "patients_userId_clientRequestId_key" ON "patients"("userId", "clientRequestId");
CREATE INDEX "patients_userId_idx" ON "patients"("userId");
CREATE INDEX "patients_createdAt_idx" ON "patients"("createdAt");

-- ── Triage: stop storing a fabricated confidence, add transparency fields ─────
ALTER TABLE "triage_results" ALTER COLUMN "confidenceScore" DROP NOT NULL;
ALTER TABLE "triage_results" ADD COLUMN "engineVersion" TEXT NOT NULL DEFAULT 'rules-v1',
ADD COLUMN "riskReason" TEXT;

-- ── Doctor reviews: who reviewed / approved ───────────────────────────────────
ALTER TABLE "doctor_reviews" ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT;
CREATE INDEX "doctor_reviews_status_idx" ON "doctor_reviews"("status");
ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Back-fill a review row for any patient left without one by the old non-transactional code.
INSERT INTO "doctor_reviews" ("id", "patientId", "status", "updatedAt")
SELECT gen_random_uuid()::text, p."id", 'Pending Review', CURRENT_TIMESTAMP
FROM "patients" p
LEFT JOIN "doctor_reviews" r ON r."patientId" = p."id"
WHERE r."id" IS NULL;

-- ── Monotonic counters for tokens and public patient ids ──────────────────────
CREATE TABLE "token_counters" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "token_counters_pkey" PRIMARY KEY ("key")
);

-- Start every counter at the highest number already used, so no existing token/id is ever reissued.
INSERT INTO "token_counters" ("key", "value")
SELECT m[1], MAX(m[2]::int)
FROM (SELECT regexp_match("tokenNumber", '^([A-Z]+)-([0-9]+)$') AS m FROM "patients") t
WHERE m IS NOT NULL
GROUP BY m[1];

INSERT INTO "token_counters" ("key", "value")
SELECT 'PID-' || m[1], MAX(m[2]::int)
FROM (SELECT regexp_match("patientId", '^SC-([0-9]{4})-([0-9]+)$') AS m FROM "patients") t
WHERE m IS NOT NULL
GROUP BY m[1];
