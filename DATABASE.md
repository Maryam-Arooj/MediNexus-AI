# SmartCare — Database

## Overview

SmartCare uses **local PostgreSQL** with **Prisma ORM**. Schema is defined in `backend/prisma/schema.prisma`. Migrations live in `backend/prisma/migrations/`.

**Connection:** Set `DATABASE_URL` in `backend/.env`:
```
postgresql://USER:PASSWORD@localhost:5432/smartcare
```

---

## Models

### patients

| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | CUID internal ID |
| patientId | TEXT (unique) | Public ID, e.g. `SC-2026-0841` |
| name | TEXT | Default: "Anonymous Patient" |
| age | INTEGER | |
| gender | TEXT | Male / Female / Other |
| symptoms | JSONB | String array |
| duration | TEXT | |
| tokenNumber | TEXT (unique) | e.g. `GM-042`, `DERM-018` |
| department | TEXT | General Medicine / Dermatology |
| assignedRoom | TEXT | OPD room string |
| createdAt | TIMESTAMP | Auto-set |

### triage_results

| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | CUID |
| patientId | TEXT (FK → patients.id, unique) | One-to-one |
| riskLevel | TEXT | Low / Medium / High |
| redFlags | JSONB | String array |
| possibleConditions | JSONB | String array |
| recommendedAction | TEXT | |
| doctorHandoverSummary | TEXT | SBAR-style summary |
| confidenceScore | INTEGER | e.g. 94 |
| createdAt | TIMESTAMP | Auto-set |

### doctor_reviews

| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | CUID |
| patientId | TEXT (FK → patients.id, unique) | One-to-one |
| status | TEXT | Pending Review / Under Review / Approved |
| clinicalNotes | TEXT | Nullable |
| recommendedActionOverride | TEXT | Nullable |
| approvedBy | TEXT | Nullable |
| approvedAt | TIMESTAMP | Nullable |
| updatedAt | TIMESTAMP | Auto-updated |

---

## Relations

```
Patient 1──1 TriageResult  (onDelete: Cascade)
Patient 1──1 DoctorReview  (onDelete: Cascade)
```

---

## Migrations

Initial migration: `20260905101641_init`

```bash
cd backend
npx prisma migrate dev    # Apply migrations (dev)
npx prisma migrate deploy # Apply migrations (production)
```

---

## Seed Data

`backend/prisma/seed.ts` seeds 4 demo patients idempotently (upsert on `patientId`):

| patientId | Name | Department | Status |
|---|---|---|---|
| SC-2026-0841 | Ramesh Verma | General Medicine | Pending Review |
| SC-2026-0842 | Priya Sharma | Dermatology | Under Review |
| SC-2026-0843 | Amina Begum | General Medicine | Approved |
| SC-2026-0844 | Karan Malhotra | Dermatology | Pending Review |

```bash
cd backend
npm run db:seed
```

Re-running seed does not create duplicates.

---

## Useful Prisma Commands

```bash
cd backend
npx prisma studio          # Visual DB browser
npx prisma generate        # Regenerate client
npm run db:reset           # Reset DB + re-seed (destructive)
```
