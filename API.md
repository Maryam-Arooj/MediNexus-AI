# MediNexus AI — API Reference

Base URL: `http://localhost:3001/api` (the frontend calls `/api/...` through the Vite proxy).

- Responses: `{ "success": true, "data": … , "meta"?: … }` or `{ "success": false, "error": "message", "details"?: { field: message } }`.
- Protected routes need `Authorization: Bearer <token>`.
- Status codes: `400` invalid input · `401` not logged in / session expired or revoked · `403` wrong role · `404` not found (also returned for another patient's case) · `409` conflict (e.g. case already under review / approved) · `429` too many login attempts · `500` generic server error (no internal details).

## Who can call what

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | Backend + DB status (no internals) |
| GET | `/triage/options` | public | Symptom groups, durations, genders accepted by the rule engine |
| POST | `/auth/register` | public, rate-limited | Create a **PATIENT** account (any `role` field is ignored) |
| POST | `/auth/login` | public, rate-limited | Log in with CNIC or email |
| GET | `/auth/me` | logged in | Current user (role from the DB) |
| POST | `/auth/logout` | logged in | Revoke all of this user's tokens |
| POST | `/patients` | **PATIENT** | Submit a new case (linked to the caller) |
| GET | `/patients/mine` | **PATIENT** | Caller's own cases |
| GET | `/patients/:id` | PATIENT (own only) / DOCTOR | One case |
| PUT | `/patients/:id` | **PATIENT** (own, while *Pending Review*) | Edit symptoms; re-runs triage on the same case |
| GET | `/doctor/patients` | **DOCTOR** | Full queue |
| PUT | `/doctor/patients/:id/review` | **DOCTOR** | Save notes / changed plan (only changed fields are written) |
| POST | `/doctor/patients/:id/approve` | **DOCTOR** | Approve (approver = logged-in doctor) |
| POST | `/doctor/patients/:id/reopen` | **DOCTOR** | Undo an approval (back to *Under Review*) |

`:id` is the public patient id, e.g. `SC-2026-0007`.

## Auth

### POST /auth/register

```json
{ "fullName": "Hina Fatima", "cnic": "35202-1234567-1", "phone": "03001234567",
  "email": "hina@example.org", "password": "Secret2026", "confirmPassword": "Secret2026" }
```

Rules:

- CNIC: 13 digits, with or without dashes (stored as `#####-#######-#`), unique.
- Phone: optional; a Pakistani mobile such as `03001234567` or `+923001234567`.
- Email: optional, unique regardless of upper/lower case.
- Password: 8–72 characters with at least one letter and one number.

Returns **201** with `{ token, user }`, where `user.role` is always `"PATIENT"`.

### POST /auth/login

`{ "identifier": "35202-1234567-1" | "you@mail.com", "password": "…" }` returns `{ token, user }`. A wrong password and an unknown account return the same `401`.

## Cases

### POST /patients

```json
{ "name": "optional, defaults to account name", "age": 34, "gender": "Female",
  "symptoms": ["Skin rash", "Itching"], "duration": "3 - 5 days",
  "clientRequestId": "uuid-per-form-session" }
```

- `age`: whole number from 1 to 120.
- `gender`: `Male` | `Female` | `Other`.
- `symptoms`: 1–10 entries, each from `/triage/options`, no duplicates.
- `duration`: one of the listed options.

Returns **201** (new case) or **200** with `meta.created=false` when the same `clientRequestId` was already used (a double click or retry).

### PUT /patients/:id

Same body. Returns `meta.changed=false` with no write when nothing changed. Returns **409** once a doctor has started the review. The token changes only if the department changes.

### PatientRecord

```json
{
  "id": "SC-2026-0007", "tokenNumber": "DERM-03",
  "createdAt": "2026-10-12T08:59:00.000Z", "updatedAt": "…",
  "name": "Hina Fatima", "age": 21, "gender": "Female",
  "symptoms": ["Skin rash", "Itching"], "duration": "3 - 5 days",
  "department": "Dermatology", "opdRoom": "Room 208 — Dermatology Clinic",
  "analysis": {
    "engineVersion": "rules-v2", "riskLevel": "Low",
    "riskReason": "No priority rule matched the selected symptoms and duration",
    "redFlags": [], "suggestedDepartment": "Dermatology",
    "recommendedAction": "Routine consultation at …", "actionOverriddenByDoctor": false,
    "defaultRecommendedAction": "(doctor only)", "possibleConditions": ["(doctor only)"], "handoverSummary": "(doctor only)"
  },
  "status": "Pending Review",
  "review": { "reviewedBy": null, "reviewedAt": null, "approvedBy": null, "approvedAt": null, "clinicalNotes": "(doctor only)" },
  "canEdit": true
}
```

`analysis` is `null` only for damaged legacy records.

## Doctor

- `PUT /doctor/patients/:id/review` takes `{ "clinicalNotes"?: string, "recommendedAction"?: string }`.
  - An action equal to the rule default is stored as "no override".
  - If something changed, the status becomes *Under Review* and `reviewedBy` / `reviewedAt` are recorded.
  - Approved cases return **409**.
- `POST /doctor/patients/:id/approve` takes `{ "clinicalNotes"?: string }`. Any client-sent `approvedBy` or `status` is ignored. Approving twice returns **409**.
- `POST /doctor/patients/:id/reopen` clears the approval (who and when) and sets *Under Review*.
