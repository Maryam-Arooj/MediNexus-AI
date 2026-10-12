# MediNexus AI — Requirements

## Problem

OPD registration counters create long queues, patients reach the wrong department, and doctors get no structured context.

## Goals

1. Secure accounts with separate **patient** and **doctor** access.
2. Digital pre-registration with symptom capture.
3. Transparent, rule-based triage and **rule-based emergency detection** (deterministic, not a diagnosis).
7. AI assistance (Google Gemini LLM), always labelled as a suggestion: symptom understanding in English/Urdu/Roman Urdu, possible conditions, preliminary guidance, lab report / prescription explanation, and a doctor case summary.
4. A digital parchi with token, room and live review status.
5. A doctor dashboard to review, annotate and approve cases.
6. Reliable persistence in PostgreSQL.

## Functional requirements

### Accounts and access

- Public registration creates **PATIENT** accounts only. Required fields: name, CNIC (13 digits) and password (8+ characters, letters and numbers). Phone (PK mobile) and email are optional.
- Login with CNIC or email. A failed login gives the same message whether the account exists or not.
- Doctor accounts are created only by `npm run doctor:provision`, which is env-configured, idempotent, never overwrites an account and is blocked in production by default.
- After login, users go to the dashboard for their role (`/patient` or `/doctor`). The role comes from the server.
- Patients can't open doctor pages or call doctor APIs (403) and can't see other patients' cases (404). Unauthenticated calls get 401.
- Logout revokes the session on the server.

### Patient

- Create an assessment: name (defaults to the account name), age 1–120 (whole number), gender, 1+ symptoms from the configured list, and duration.
- Double submission never creates duplicates.
- View the result: priority, reason, rule warnings, department/room, next steps and doctor-review status.
- Edit symptoms on the **same** case while it's still *Pending Review*.
- View and print the parchi (Patient ID, token, room, priority, instructions, current review status, date).
- My Visits lists only the patient's own cases.

### Doctor

- A queue built from real database records, with metrics, department/status filters and search (name, ID, token, symptom).
- A review modal showing the rule result, reason, warnings, conditions to consider and handover summary.
- Edit the patient-facing plan and private clinical notes. Only changed fields are saved.
- Approve, with the approver and time recorded from the logged-in doctor. Approved cases are locked until reopened.

### AI and emergency safety

- Emergency danger signs (checklist + phrase detection) never depend on the AI and always force High priority with "go to Emergency / call 1122" guidance.
- The AI never sets priority, department or token, never diagnoses, and never recommends a medicine or dose (server-side filter).
- Only de-identified data is sent to the AI; uploads and AI output are not stored; the key never reaches the browser or logs.
- Without a key, or if the AI fails, the app keeps working and says the AI is unavailable (never fake AI output).

## Non-functional requirements

| Area | Requirement |
|---|---|
| Security | bcrypt (12), JWT HS256 with a mandatory secret, DB-checked roles, ownership checks, rate-limited auth, input validation (zod), no raw DB errors in responses, no personal data in logs |
| Integrity | Transactions per case, monotonic token counters, idempotency key, non-destructive migrations |
| Honesty | No fabricated confidence, timing or efficiency claims; rule-based triage clearly labelled; no fake QR code |
| Testing | Backend API integration tests, frontend logic tests, Playwright end-to-end tests |
| Platform | Windows (PowerShell) development; local PostgreSQL |

## Out of scope

Trained/validated ML diagnosis, AI-decided priority, storing AI output, vital signs, prescriptions or pharmacy, billing, other departments, QR hardware, daily token reset.
