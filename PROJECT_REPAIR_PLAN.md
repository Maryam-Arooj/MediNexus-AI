# MediNexus AI — Project Repair Plan

Status legend: ⬜ pending · 🔄 in progress · ✅ done & verified · ⚠️ needs action on your Windows PC

## 0. Audit method and environment notes

- Source of truth: `D:\MediNexus AI` (Windows). Every file was read; the frontend → API → Prisma → PostgreSQL path was traced end to end.
- **Where things were run:** Claude cannot type into a Windows terminal. Windows only grants click-only access to terminals. So everything was run in an isolated Linux sandbox containing a copy of the project, with PostgreSQL 16 and a throwaway database. **Your real database was never connected to or changed.**
- **Sandbox-only workaround:** Prisma's native engines are downloaded from `binaries.prisma.sh`, which the sandbox network blocks. The sandbox therefore ran Prisma's official WASM query engine (shipped inside `@prisma/client`) through `@prisma/adapter-pg`, and applied migrations with `psql`. Nothing about this workaround is in your repo; on Windows the normal native engine is used.
- **Bugs reproduced against the ORIGINAL code in the sandbox (2026-10-12):**
  - 3 Dermatology registrations produced DERM-01..03. After deleting DERM-01, **every** following Dermatology registration failed with `Unique constraint failed on the fields: (tokenNumber)`, a permanent lock-out for that department.
  - 6 simultaneous General Medicine registrations: **3 of 6 failed** with HTTP 500 (race condition).
  - `GET /api/patients` with **no login** returned every patient's medical data.
  - `POST /api/patients/:id/approve` with **no login** approved a case, with `approvedBy:"hacker"` accepted.
  - `POST /api/auth/register` with `"role":"doctor"` created a **doctor** account.
  - `age:"abc"`, `gender:"x"`, `symptoms:["zzz"]` passed validation, and the raw Prisma error (including the full insert payload) was sent to the browser.

## 1. Issues, root causes, fixes, verification

| # | Pri | Issue | Root cause | Fix | Verification | Status |
|---|---|---|---|---|---|---|
| 1 | P0 | P2002 duplicate `tokenNumber`, permanent per-department lock-out | Token = `count(rows with prefix) + 1`. Deleting any row (the cleanup scripts did this) makes the count repeat an existing token, and a failed insert never changes the count, so it fails forever. | `token_counters` table; atomic `INSERT … ON CONFLICT DO UPDATE SET value = value + 1 RETURNING value` inside the creation transaction. The migration starts each counter at the **highest token already in your DB**, so no old token is ever reissued. Counters never go down. | Regression test: create, delete, create gives a new unique token | ✅ |
| 2 | P0 | Concurrent registrations collide | Read-then-write race on the count | The counter row is locked by the UPSERT until commit, so allocation is serialised | Test: 20 parallel creations, 20 unique tokens, 0 errors | ✅ |
| 3 | P0 | Patient-data endpoints have no authentication | Only `/auth/me` used `requireAuth` | All `/api/patients*` and `/api/doctor*` routes require a valid JWT; the role is read from the **database** on every request | Tests: no token gives 401 | ✅ |
| 4 | P0 | Anyone can become a doctor; role chosen in the browser | `register` trusted `role`; RoleSelect let any user open the doctor dashboard | Public signup always creates `PATIENT`. Doctors only via the provisioning script. Frontend routes by the server-reported role; RoleSelect removed. | Tests: register with `role:DOCTOR` gives PATIENT; patient on doctor API gives 403; e2e: patient at `/doctor` is redirected | ✅ |
| 5 | P0 | Patients can see other patients' records | No ownership model; `Patient.userId` never set | Cases are created with `userId = req.user.id`; patient reads are filtered by owner (other people's cases return 404 to avoid leaking that they exist) | Tests: patient B gets 404 on patient A's case; `/mine` only returns own cases | ✅ |
| 6 | P0 | Partial records (patient without triage/review) | 3 separate inserts with no transaction | One interactive `$transaction` (counter + patient + triage + review); the migration back-fills any missing review rows | Test: forced DB failure on the review insert leaves zero rows and no counter increment | ✅ |
| 7 | P0 | Hard-coded JWT fallback secret | `process.env.JWT_SECRET \|\| '…'` in 2 files | Startup fails if `JWT_SECRET` is missing or under 32 characters; HS256 pinned | Test plus manual startup check | ✅ |
| 8 | P0 | Logout doesn't end the session server-side | Stateless JWT, client-only logout | `users.tokenVersion`; logout increments it, so every older token is rejected | Test: token works, logout, the same token gets 401 | ✅ |
| 9 | P0 | Raw Prisma/DB errors shown to users | Error handler returned `err.message` for everything | Central handler: validation becomes 400 with field messages, P2002 409, P2025 404, other errors a generic 500; logs record the error code only (no bodies, tokens or DB URLs) | Test: bad input gives a clean 400 with no "prisma" text | ✅ |
| 10 | P1 | No doctor provisioning | Not implemented; docs pointed to an undocumented "demo doctor" | `npm run doctor:provision`: env-driven (`DEMO_DOCTOR_*`), idempotent, refuses in production unless explicitly allowed, never overwrites an existing account | Tests: create, re-run (no change), existing patient email (refused), production guard | ✅ |
| 11 | P1 | Existing self-registered "doctor" accounts | Old open signup | Migration demotes unverified `doctor` rows to `PATIENT` and writes each change to `role_change_audit` (reversible). Re-promote with `doctor:provision --promote-existing` (needs that account's current password). | Migration applied to the sandbox DB with sample legacy rows | ✅ |
| 12 | P1 | Edit Symptoms lost input and created a duplicate patient | Screen 1 remounted from `formInput` (only presets ever set it); resubmitting POSTed a new case | Edit mode loads the saved case and `PUT`s it; only allowed while "Pending Review"; re-triage happens in a transaction; patient ID kept; a new token only if the department changes | Test plus e2e | ✅ |
| 13 | P1 | Double submission makes duplicate cases | Buttons not locked; no idempotency | Buttons disabled while submitting; each form session sends a `clientRequestId` (unique per user), so a retry returns the same case | Test: same key twice gives one case | ✅ |
| 14 | P1 | Review/approval inconsistencies | Save always set "Under Review" (silently un-approving); override always stored; approver hard-coded; client could send `status` | Status is server-controlled. Approved cases are locked; an explicit "Reopen" clears approval. Only changed fields are written (no-op means no write). Reviewer and approver come from the logged-in doctor (`reviewedById`, `approvedById` plus name snapshot). | Tests | ✅ |
| 15 | P1 | Fake presets wrote "Ramesh Verma"/"Priya Sharma" into the real DB | Presets auto-submitted with names | Presets now only fill example symptoms/duration (no name, no submit); Navbar presets removed | e2e / review | ✅ |
| 16 | P1 | Weak validation | Manual checks; NaN/float ages, arbitrary symptoms | zod schemas: age integer 1–120; gender enum; symptoms from the configured list (1–10, no duplicates); duration from list; CNIC `#####-#######-#`; phone PK mobile (optional); email (optional, lower-cased); password 8–72 characters with a letter and a digit | Tests | ✅ |
| 17 | P1 | Duplicate triage engine (frontend dead copy) | Copied into `mockData.ts` | One engine in the backend; frontend loads symptom/duration options from `GET /api/triage/options` | Build plus test | ✅ |
| 18 | P1 | Fabricated or unsupported claims | Hard-coded 94% "AI confidence", "0.4s", "~70%", "bank-level encryption", "vital signs stable" (no vitals are measured), "AI" labels on a rule engine | All removed or reworded; "Rule-based triage (rules-v1)" label; each risk level shows the rule that produced it; possible conditions shown to the doctor only, as "for doctor consideration, not a diagnosis" | Review plus e2e text checks | ✅ |
| 19 | P1 | Fake QR code | Static icon labelled "scannable" | Removed; replaced by a plainly labelled Patient ID + token verification block | Review | ✅ |
| 20 | P1 | Parchi out of sync / always "Doctor Review Required" / "Date: Today" | Parchi rendered a stale client object with hard-coded badges | Parchi reloads the case from the API; shows the real status, reviewer, approval time and real date (formatted in the browser) | e2e: approve as doctor, patient parchi shows Approved | ✅ |
| 21 | P2 | No URL routing; refresh lost state | State-only screen switching | Small history-based router with role guards: `/login`, `/register`, `/patient`, `/patient/new`, `/patient/cases/:id`, `/patient/cases/:id/edit`, `/patient/cases/:id/parchi`, `/doctor` | e2e: deep links and refresh | ✅ |
| 22 | P2 | Brute-force login possible | No rate limit | `express-rate-limit` on `/api/auth/login` and `/register` | Test (429) | ✅ |
| 23 | P2 | `createdAt` formatted in the server's timezone | `toLocaleString` on the server | API returns ISO; browser formats it | Review | ✅ |
| 24 | P2 | Dashboard crash when `analysis` is null | No null handling | Typed as nullable; UI shows "Triage data missing" | Review | ✅ |
| 25 | P2 | Non-JSON error responses crash the client | `res.json()` unguarded | Safe parse; a 401 automatically logs out | Review/e2e | ✅ |
| 26 | P2 | One-off delete scripts with hard-coded IDs; dead code (RoleSelect, mock patients, unused props/APIs) | Leftovers | Removed | Build | ✅ |
| 27 | P2 | No tests | — | Backend integration (vitest + supertest on a separate `_test` DB, with a guard against using a non-test DB); frontend unit tests; Playwright e2e | Runs | ✅ |
| 28 | P2 | Docs out of date (Tailwind v3, PATCH routes, "transactions", demo doctor, QR) | Drift | README / SETUP / API / DATABASE / ARCHITECTURE / REQUIREMENTS / USER_GUIDE updated | Review | ✅ |
| 29 | P3 | `.env.example` missing `JWT_SECRET` | Drift | Complete example with placeholders only | Review | ✅ |
| 30 | P3 | Health endpoint leaks the DB error string | `String(err)` | Generic message | Test | ✅ |

## 2. Token and ID rules (decided)

- Token format is unchanged: `GM-01`, `DERM-07`, … (widening to `GM-100` as needed). Tokens are **globally unique and never reused**. They **do not reset daily**, because a daily reset would need a date-scoped unique key and a schema/UX change. This is listed as a future option.
- Patient ID: `SC-<year>-<NNNN>`, now sequential per year from a counter (it used to be random 4 digits with retry). The migration starts each year's counter above the highest existing ID.

## 3. Data-safety plan for your real database

1. The new migration only **adds** tables, columns and indexes, converts `users.role` text into an enum (values preserved; only unverified `doctor` rows are demoted, and they are audited), relaxes `confidenceScore` to nullable, and back-fills missing review rows. **No table is dropped. No patient row is deleted or changed.**
2. Before applying, take a backup (exact PowerShell commands are in SETUP.md):
   `pg_dump -U postgres -d smartcare -F c -f smartcare_backup_before_repair.dump`
3. Apply with `npx prisma migrate deploy`, not `migrate dev` (which can offer to reset the database).
4. Recovery: `pg_restore --clean -U postgres -d smartcare smartcare_backup_before_repair.dump`.

## 4. Additional issues found during the work (also fixed)

| # | Issue | Fix | Status |
|---|---|---|---|
| 31 | **Your `backend\.env` JWT_SECRET is the same string that was hard-coded in the source** (and is in git history), so anyone could forge sessions | Server now refuses that value. Your `.env` got a new random secret (the value was not printed). Everyone must log in again once. | ✅ |
| 32 | Rule engine ignored General Medicine rules when a patient was routed to Dermatology (and vice-versa), e.g. Fever + Cough for 2 weeks + 3 skin symptoms gave "Low" | `rules-v2` evaluates all rules; the highest priority wins | ✅ (unit test) |
| 33 | Rule texts invented findings ("vital signs stable", "severe cephalalgia") that were never measured | Rewritten to restate only what the patient selected | ✅ (unit test) |
| 34 | Dermatology long-duration text said ">2 weeks" although the rule fires at 1–2 weeks | Text corrected ("1 week or more") | ✅ |
| 35 | Prisma's own error logging printed full query data (patient details) to the console | Prisma logs warnings only; errors are logged by the safe handler | ✅ (test checks the log contains no patient data) |
| 36 | `npm run preview` had no API proxy, so the production preview could not reach the backend | Proxy added for preview | ✅ (curl through :4173) |
| 37 | `db:reset` npm script (`prisma migrate reset --force`) could wipe the database with one command | Removed; `db:migrate` now uses `migrate deploy` | ✅ |
| 38 | Doctor dashboard "Approve" while editing silently discarded the typed plan | Edits are saved first, then approved | ✅ |
| 39 | Splash timer restarted on re-render; logout from RoleSelect left stale state | Stable timer; RoleSelect removed (role-based routing) | ✅ |
| 40 | Database backups (`*.dump`) and test output could be committed | Added to `.gitignore` | ✅ |

## 5. Verification results (sandbox run, 2026-10-12)

| Check | Result |
|---|---|
| Backend integration + unit tests (`backend/test/*.test.ts`, real PostgreSQL 16) | **81 / 81 passed** |
| Backend type check (`npm run typecheck`) and build (`npm run build`) | **passed** |
| Frontend unit tests (`src/lib/*.test.ts`) | **8 / 8 passed** |
| Frontend type check + production build (`npm run build`) | **passed** |
| Playwright end-to-end (`e2e/app.spec.ts`, Chromium, real backend + DB) | **5 / 5 passed** |
| Migration applied to a copy of the old schema with legacy data (deleted tokens, `GM-042` seed token, a patient without review, two self-registered "doctors") | **applied cleanly.** Counters started at GM=42 / DERM=3; new cases got GM-43 / DERM-04 (no collision). Both "doctors" demoted and audited. Missing review back-filled. All 6 legacy cases visible to the doctor. |
| Original bugs re-tested after the fix | delete-then-register: unique tokens ✅ · 20 concurrent: 20 × 201 ✅ · unauthenticated list/approve: 401 ✅ · self-registered doctor: PATIENT ✅ · bad input: clean 400 ✅ |

Coverage of the required checks:

- Patient registration and login: `auth.test.ts`, e2e 1–2
- Demo doctor provisioning and login: `provisioning.test.ts`, e2e 5
- Patient dashboard access: `authorization.test.ts`, e2e 2
- Doctor dashboard access: `authorization.test.ts`, e2e 5
- Patient denied doctor APIs (403) and the doctor URL: `authorization.test.ts`, e2e 3
- Patient denied other patients' records (404): `authorization.test.ts`
- Unauthenticated requests denied (401): `authorization.test.ts`, e2e 3–4
- Ordinary users can't become doctors: `auth.test.ts`, e2e 1
- Invalid input rejected: `auth.test.ts`, `cases.test.ts`, frontend `validation.test.ts`
- Tokens unique after deletion and under concurrency: `tokens.test.ts`
- No partial records: `cases.test.ts` (DB trigger forces a failure; everything rolls back, including the counter)
- Edit symptoms / no duplicates / idempotency: `cases.test.ts`, e2e 2
- Review and approval persistence, reviewer, timestamps, lock/reopen, no-op saves: `doctor.test.ts`, e2e 5
- Parchi generation and print: e2e 2 and 5 (`window.print()` invoked; print media hides navigation; status syncs after approval)

## 6. Not verified here — please run on your Windows PC ⚠️

| Item | Why | Command |
|---|---|---|
| Back up and migrate **your real `smartcare` database** | Never touched by Claude | SETUP.md §4 |
| Run the test suites on Windows | The sandbox is Linux and ran Prisma's WASM engine because the native-engine download is blocked there; the native Windows engine wasn't exercised | SETUP.md §9 |
| `prisma migrate status` reports no drift | Prisma's schema engine couldn't run in the sandbox; the migration SQL was hand-written to match `schema.prisma` and verified by applying it and exercising every column through the client | `npm run db:status` |
| Create your demo doctor | Needs your own email and password | SETUP.md §6 |
| Restore an old demo doctor (e.g. `doctor.test@smartcare.com`) | Demoted by the migration | `npm run doctor:provision -- --promote-existing` |
