# MediNexus AI — Database

Local **PostgreSQL** via **Prisma 5**. The schema is in `backend/prisma/schema.prisma` and the migrations are in `backend/prisma/migrations/`.

## Tables

### users

| Column | Notes |
|---|---|
| id | cuid PK |
| fullName | |
| cnic | unique, `#####-#######-#` (doctors without a CNIC get a reserved `00000-…-0` placeholder) |
| email | unique, optional; login lookup ignores upper/lower case |
| phone | optional, `03XXXXXXXXX` |
| passwordHash | bcrypt, cost 12 |
| role | enum `Role` = `PATIENT` \| `DOCTOR` (default `PATIENT`). `DOCTOR` is only set by `npm run doctor:provision`. |
| tokenVersion | increased on logout; older tokens are rejected |
| createdAt, updatedAt | |

### patients (one row per OPD case)

| Column | Notes |
|---|---|
| id | cuid PK |
| patientId | unique public id `SC-<year>-<NNNN>` (sequential per year) |
| tokenNumber | unique `GM-01`, `DERM-07`… from `token_counters`, never reused |
| name, age, gender, symptoms (JSON string[]), duration | patient input |
| department, assignedRoom | from the triage rules |
| userId | FK → users (owner). `NULL` only for legacy rows created before accounts were linked. |
| clientRequestId | idempotency key; unique together with userId |
| createdAt, updatedAt | |

Indexes: `userId`, `createdAt`, unique `(userId, clientRequestId)`.

### triage_results (1-to-1 with patients, cascade delete)

`riskLevel`, `riskReason`, `redFlags` (JSON), `possibleConditions` (JSON, shown to doctors only), `recommendedAction`, `doctorHandoverSummary`, `engineVersion` (`rules-v1` for old rows, `rules-v2` now), and `confidenceScore`. That last one is a legacy nullable column: old rows hold a hard-coded 94, and it is no longer written or shown.

### doctor_reviews (1-to-1 with patients, cascade delete)

| Column | Notes |
|---|---|
| status | `Pending Review` → `Under Review` → `Approved` (reopen goes back to `Under Review`) |
| clinicalNotes | doctor-only |
| recommendedActionOverride | `NULL` = use the rule engine's action |
| reviewedById, reviewedAt | last doctor who changed the review |
| approvedById, approvedBy, approvedAt | approving doctor (FK + name snapshot) |

Index: `status`.

### token_counters

`key` PK (`GM`, `DERM`, `PID-2026`, …) and `value`. Allocation runs inside the case transaction:

```sql
INSERT INTO token_counters (key, value) VALUES ($1, 1)
ON CONFLICT (key) DO UPDATE SET value = token_counters.value + 1 RETURNING value;
```

The row lock serialises concurrent registrations. Values only ever increase, so deleting a case can never cause its number to be issued again. **Tokens do not reset daily.** A daily reset would need a date-scoped unique key; that's a possible future change.

### role_change_audit

A record of every role change made by the migration or the provisioning script (`userId`, `oldRole`, `newRole`, `reason`, `changedAt`).

## Relations

```
User 1──* Patient            (owner, optional for legacy rows)
User 1──* DoctorReview        (reviewedBy, approver; ON DELETE SET NULL)
Patient 1──1 TriageResult     (ON DELETE CASCADE)
Patient 1──1 DoctorReview     (ON DELETE CASCADE)
```

## Migrations

1. `20260905101641_init`: patients, triage_results, doctor_reviews.
2. `20260906041835_add_auth`: users plus `patients.userId`.
3. `20261012090000_security_and_integrity`: non-destructive repair.
   - Adds the role enum and demotes unverified self-registered "doctor" accounts, with each change audited.
   - Adds `tokenVersion`, the idempotency key and indexes.
   - Adds the reviewer/approver columns.
   - Makes `confidenceScore` nullable and adds `engineVersion` and `riskReason`.
   - Back-fills missing review rows.
   - Creates `token_counters`, starting at the highest existing token and patient id.

Apply with `npm run db:migrate` (= `prisma migrate deploy`). **Back up first.** See SETUP.md for the `pg_dump` and `pg_restore` commands.

## Useful commands (from `backend/`)

```powershell
npm run db:inspect      # read-only counts & integrity checks (no personal data)
npm run db:status       # migration status
npx prisma studio       # GUI on http://localhost:5555
```
