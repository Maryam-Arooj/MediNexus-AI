# MediNexus AI — Architecture

```
React (Vite, :5173) ──/api proxy──► Express (:3001) ──Prisma──► PostgreSQL (:5432)
   router + route guard (UX)          requireAuth → requireRole → ownership check → service → transaction
                                          │
                                          └──HTTPS (x-goog-api-key header)──► Google Gemini API (AI features only)
```

### AI data flow
```
Patient text ─► POST /api/ai/symptoms ─► emergencyRules.detectEmergency (RULES, always) ─► EmergencyAlert
                                     └─► Gemini (text only) ─► zod/safety filters ─► form pre-fill + possible conditions + guidance
Patient confirms form ─► POST /api/patients ─► rules-v3 (+ danger signs) ─► PostgreSQL ─► result + parchi
Doctor ─► review modal ─► POST /api/doctor/patients/:id/ai-summary ─► Gemini (de-identified) ─► AI draft box
Patient file ─► POST /api/ai/document ─► Gemini (vision) ─► validated explanation (nothing stored)
```

## Frontend (`src/`)

| Path | Role |
|---|---|
| `App.tsx` | URL routing; renders screens for the **server-verified** role |
| `lib/router.ts` | Tiny history-API router (`navigate`, `usePath`, `matchPath`) |
| `lib/routeAccess.ts` | `resolveAccess(path, role)`: redirects logged-out users to `/login`, patients away from `/doctor`, doctors away from `/patient` |
| `lib/validation.ts` | Client-side checks that match the server's (CNIC, phone, email, password, case form) |
| `context/AuthContext.tsx` | Loads the user from `GET /auth/me` on start; logout calls the server; any `401` logs out locally |
| `api/client.ts` | Fetch wrapper (Bearer token, safe JSON parsing, typed errors) |
| `hooks/useTriageOptions.ts` | Symptom/duration lists from `GET /api/triage/options`, the same source the rule engine uses |
| `hooks/useCase.ts` | Loads a case fresh from the server (the parchi is always current) |
| `components/auth/*` | Splash, Login, Register (patient-only) |
| `components/patient/PatientHome.tsx` | My Visits |
| `components/Screen1Registration.tsx` | New assessment / edit symptoms (one request id per form, disabled while saving) |
| `components/Screen2AIAnalysis.tsx` | Triage result with reason, warnings, department, next steps, review status |
| `components/Screen3DigitalParchi.tsx` | Printable slip (`window.print()`, print CSS hides navigation) |
| `components/Screen4DoctorDashboard.tsx` | Doctor queue, filters, search, review / approve / reopen |

Routes: `/login`, `/register`, `/patient`, `/patient/new`, `/patient/cases/:id`, `/patient/cases/:id/edit`, `/patient/cases/:id/parchi`, `/doctor`.

## Backend (`backend/src/`)

| Path | Role |
|---|---|
| `config/env.ts` | Validates the environment. No JWT fallback; refuses short or leaked secrets. |
| `app.ts` / `server.ts` | `createApp(config)` (used by the tests too) and the process entry point |
| `middleware/auth.ts` | `requireAuth` verifies the JWT (HS256), **reloads the user from the DB** and checks `tokenVersion`. `requireRole(...)` returns 403. |
| `middleware/errorHandler.ts` | Maps zod / HTTP / Prisma errors to safe messages. Logs only method, path, status and error code. |
| `middleware/rateLimit.ts` | Login/register rate limit |
| `validation/schemas.ts` | zod schemas (register, login, case, review) |
| `services/auth.service.ts` | Register (always PATIENT), login, logout (revocation) |
| `services/patients.service.ts` | Create case (single transaction + idempotency), list own, get with ownership, edit own pending case |
| `services/doctor.service.ts` | Queue, review (changed fields only), approve (conditional update), reopen |
| `services/counters.ts` | Atomic token / patient-id allocation |
| `services/patientRecord.ts` | API shape; strips doctor-only fields for patients |
| `services/doctorProvisioning.ts` + `scripts/provisionDoctor.ts` | The only way to create a DOCTOR |
| `scripts/inspectDatabase.ts` | Read-only DB integrity report |
| `triage/triageConfig.ts`, `triage/evaluateMedicalTriage.ts` | The single rule engine and its option lists |
| `triage/emergencyRules.ts` | Deterministic emergency danger signs (checklist ids + English/Urdu/Roman Urdu phrases) |
| `services/llm.ts` | Gemini REST client: header key, timeout, retry, fallback model, safe 503, no content logging |
| `ai/symptomAssistant.ts`, `ai/documentExplainer.ts`, `ai/caseSummary.ts` | Prompts, JSON response schemas and server-side validation for each AI feature |
| `ai/safety.ts` | Shared filters (medicine names / doses removed from guidance), AI disclaimer |
| `routes/ai.ts`, `controllers/ai.controller.ts` | `/api/ai/*` (login + role + per-user AI rate limit) |

## Authorization model

1. **Authentication:** a signed JWT (`sub`, `ver`) with **no role inside it**.
2. **Per request:** the user is loaded from PostgreSQL, so the role always comes from the database. A demoted doctor loses access immediately, and logout (`tokenVersion` increase) invalidates every earlier token.
3. **Role:** `/api/doctor/*` requires DOCTOR. Patient case routes require PATIENT, except `GET /patients/:id`, which doctors may also use.
4. **Ownership:** patients only query rows with `userId = me`. Another patient's case returns 404, so case ids can't be probed.
5. **Field-level:** clinical notes, possible conditions, the handover summary and the rule default action are removed from patient responses.

## Data integrity

- Counter allocation, patient, triage and review are written in **one interactive transaction**, so a failure leaves nothing behind (covered by a test that forces a DB error).
- Tokens come from monotonic counters (row-locked), so they're unique under concurrency and after deletions.
- `clientRequestId` makes double clicks and retries return the same case.
- Approve uses a conditional `updateMany(status != Approved)`, so a case can't be approved twice. Edits by the patient re-check "Pending Review" inside the transaction.
