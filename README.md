# MediNexus AI — OPD Digital Registration & Rule-Based Triage

> *"From Digital Registration to Smarter Medical Care."*

MediNexus AI digitises outpatient (OPD) registration for government hospitals:

1. Patients create an account, enter their symptoms before arriving, and get a **rule-based triage priority**.
2. They receive a **digital parchi** (token + OPD room).
3. **Doctors** review each case on a protected dashboard, add notes, and approve it.

> **Not a medical device and not a diagnosis.** Triage uses fixed, transparent rules (no machine learning, no external AI). Every case is for a licensed doctor to assess.

## Problem

- Patients queue at paper registration counters before seeing anyone, often at the wrong department.
- Doctors receive patients with no structured context.

## What the app does

| Area | Features |
|---|---|
| **Accounts** | Patient self-registration (CNIC, name, optional phone/email, strong password). Login by CNIC or email. Doctor accounts are created **only** by an administrator script. |
| **Patient portal** (`/patient`) | My Visits (own cases only), New Assessment, Edit Symptoms (while still awaiting review), triage result, printable parchi showing the live review status |
| **Triage** | Deterministic rules (`rules-v2`): department by symptom group, priority Low / Medium / High with a plain-language reason. Doctors also see a fixed list of conditions to consider and a handover summary. |
| **Doctor dashboard** (`/doctor`) | Queue of real database records, department/status filters, search, review modal (notes + plan edit), approve, reopen; reviewer, approver and timestamps recorded |
| **Security** | Server-side role checks on every request (role re-read from the DB), ownership checks, token revocation on logout, rate-limited login, validated input, no raw DB errors returned |
| **Data integrity** | One transaction per case (patient + triage + review). Concurrency-safe token counters that never reuse a number. Idempotent submissions. |

## Triage rules (rules-v2)

All rules are always checked, and the highest matching priority wins.

| Priority | Rule |
|---|---|
| High | Fever + Cough for 1 week or more |
| High | Fever + Headache, age over 50 |
| High | Minor skin infection + (Skin rash **or** 1 week or more) |
| Medium | Fever + 2 or more other symptoms |
| Medium | Skin rash + Redness + Itching |
| Medium | Any symptoms for 1 week or more |
| Low | None of the above |

Department = the group (General Medicine / Dermatology) with more selected symptoms; a tie goes to General Medicine. Source: `backend/src/triage/evaluateMedicalTriage.ts`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, **Tailwind CSS v4**, lucide-react, small built-in router |
| Backend | Node.js, Express 4, TypeScript, zod validation, express-rate-limit |
| Auth | bcryptjs (cost 12), JWT HS256 (role re-checked in the DB on each request) |
| Database | PostgreSQL + Prisma 5 (migrations in `backend/prisma/migrations`) |
| Tests | Vitest + Supertest (backend API), Vitest (frontend logic), Playwright (end-to-end) |

## Quick start (Windows PowerShell)

```powershell
cd "D:\MediNexus AI"; npm install
cd backend; npm install; npx prisma generate
# edit backend\.env (see SETUP.md), back up the DB, then:
npm run db:migrate
npm run doctor:provision          # creates the demo doctor from DEMO_DOCTOR_* in .env
npm run dev                       # backend on :3001
# new terminal:
cd "D:\MediNexus AI"; npm run dev  # frontend on :5173
```

Full instructions (backup, migrations, doctor provisioning, tests): **[SETUP.md](./SETUP.md)**.

## Documentation

| Document | Contents |
|---|---|
| [SETUP.md](./SETUP.md) | Install, environment, migrations, doctor provisioning, running, testing |
| [USER_GUIDE.md](./USER_GUIDE.md) | Step-by-step patient and doctor walkthrough |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Components, data flow, authorization model |
| [API.md](./API.md) | REST endpoints and who may call them |
| [DATABASE.md](./DATABASE.md) | Tables, relations, migrations, counters |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Functional and non-functional requirements |
| [PROJECT_REPAIR_PLAN.md](./PROJECT_REPAIR_PLAN.md) | Audit findings, fixes and verification results |

## Out of scope (MVP)

- Machine-learning or LLM diagnosis (the triage is rule-based by design)
- Vital signs, examination findings, prescriptions, billing
- Departments other than General Medicine and Dermatology
- QR scanning hardware (the parchi uses Patient ID + token for verification)
- Daily token reset (tokens are unique and increase forever; see DATABASE.md)
