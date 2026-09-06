# MediNexus AI — Database

## Overview

MediNexus AI uses **local PostgreSQL** with **Prisma ORM**. Schema is defined in `backend/prisma/schema.prisma`. Migrations live in `backend/prisma/migrations/`.

**Connection:** Set `DATABASE_URL` in `backend/.env`:
```
postgresql://USER:PASSWORD@localhost:5432/smartcare
```

---

## Models

### users

Stores registered user accounts (Patients and Doctors) with salted bcrypt password hashes.

| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | CUID internal identifier |
| fullName | TEXT | User's full display name |
| cnic | TEXT (unique) | National ID / CNIC (used for login) |
| email | TEXT (unique, nullable) | Email address (used for login) |
| phone | TEXT (nullable) | Contact phone number |
| passwordHash | TEXT | Salted bcrypt hash (work factor 12) |
| role | TEXT | Role: `patient` or `doctor` (default: `patient`) |
| createdAt | TIMESTAMP | Timestamp of account registration |
| updatedAt | TIMESTAMP | Timestamp of last account modification |

### patients

Stores digitally registered outpatient OPD records.

| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | CUID internal ID |
| patientId | TEXT (unique) | Public ID, e.g. `SC-2026-1715` |
| name | TEXT | Default: "Anonymous Patient" |
| age | INTEGER | Patient age (1–120) |
| gender | TEXT | Male / Female / Other |
| symptoms | JSONB | String array of selected symptoms |
| duration | TEXT | Reported duration (e.g. "3 - 5 days") |
| tokenNumber | TEXT (unique) | OPD Serial Token, e.g. `GM-01`, `DERM-03` |
| department | TEXT | General Medicine / Dermatology |
| assignedRoom | TEXT | Assigned OPD consultation room string |
| userId | TEXT (FK → users.id, nullable) | Optional reference to the registering User account |
| createdAt | TIMESTAMP | Timestamp of OPD pre-check registration |

### triage_results

Stores the deterministic AI triage assessment for each patient.

| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | CUID internal identifier |
| patientId | TEXT (FK → patients.id, unique) | One-to-one with Patient |
| riskLevel | TEXT | Low / Medium / High |
| redFlags | JSONB | String array of clinical warning flags |
| possibleConditions | JSONB | String array of differential diagnosis considerations |
| recommendedAction | TEXT | Actionable clinical recommendation |
| doctorHandoverSummary | TEXT | SBAR-style clinical handover summary |
| confidenceScore | INTEGER | Confidence rating percentage (e.g. 94) |
| createdAt | TIMESTAMP | Timestamp of triage generation |

### doctor_reviews

Stores attending physician clinical notes, prescription overrides, and triage approvals.

| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | CUID internal identifier |
| patientId | TEXT (FK → patients.id, unique) | One-to-one with Patient |
| status | TEXT | Pending Review / Under Review / Approved |
| clinicalNotes | TEXT (nullable) | Attending doctor physical exam notes & prescription overrides |
| recommendedActionOverride | TEXT (nullable) | Physician-adjusted clinical management plan |
| approvedBy | TEXT (nullable) | Name/title of approving medical officer |
| approvedAt | TIMESTAMP (nullable) | Timestamp of clinical sign-off |
| updatedAt | TIMESTAMP | Auto-updated on modification |

---

## Relations

```
User    1──* Patient       (optional link via userId)
Patient 1──1 TriageResult  (onDelete: Cascade)
Patient 1──1 DoctorReview  (onDelete: Cascade)
```

---

## Migrations

The database schema is tracked and version-controlled using Prisma Migrate:

1. `20260905101641_init`: Initial schema containing `patients`, `triage_results`, and `doctor_reviews` tables.
2. `20260906041835_add_auth`: Added `users` table for authentication and nullable `userId` foreign key on `patients`.

```bash
cd backend
npx prisma migrate status  # Verify all migrations are applied
npx prisma migrate dev     # Apply migrations in development
npx prisma migrate deploy  # Apply migrations in production
```

---

## Database Management & Seed

The database strictly preserves real patient records created through the application registration flow.

```bash
cd backend
npm run db:migrate         # Apply pending migrations
npm run db:seed            # Run Prisma seed check
```

---

## Useful Prisma Commands

```bash
cd backend
npx prisma studio          # Visual database browser GUI (port 5555)
npx prisma generate        # Regenerate Prisma Client types
npx prisma migrate status  # Check migration state
```
