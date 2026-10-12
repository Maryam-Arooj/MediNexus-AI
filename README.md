# MediNexus AI — AI-Powered Medical Decision Support & Health Assistant

> *"From Digital Registration to Smarter Medical Care."*

MediNexus AI digitises outpatient (OPD) registration for government hospitals and adds an AI health assistant:

1. Patients describe their symptoms **in their own words (English, Urdu or Roman Urdu)**. AI (Google Gemini) fills the form and suggests **possible conditions** and **preliminary guidance**.
2. **Emergency detection** (fixed safety rules) checks for danger signs and shows immediate guidance (Rescue 1122).
3. The **rule engine** sets priority and department, and the patient gets a **digital parchi** (token + OPD room).
4. Patients can upload a **lab report or prescription** and get a plain-language AI explanation.
5. **Doctors** review each case, can generate an **AI case summary (SBAR draft)**, add notes and approve it.

> **Not a medical device and not a diagnosis.** AI output is always labelled as an AI suggestion. Emergency detection and priority use fixed, transparent rules. Every case is for a licensed doctor to assess.

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

## AI features — what is AI and what is not

| Feature | Technology | Where |
|---|---|---|
| Symptom understanding (free text → symptom list, duration, age, gender) | **AI: LLM** (Google Gemini) | `POST /api/ai/symptoms`, "Describe how you feel" card |
| Possible conditions with likelihood (*more likely / possible / less likely*) + reasons | **AI: LLM** suggestion, **not** a trained or validated ML model, **not** a diagnosis | same |
| Preliminary guidance (self-care basics, when to get urgent care, what to avoid) | **AI: LLM**, filtered on the server to remove any medicine name or dose | same |
| Lab report / prescription explainer (photo, PDF or pasted text) | **AI: LLM with vision** (Gemini); medicines copied *as written*, never changed | `POST /api/ai/document`, `/patient/documents` |
| Doctor case summary (SBAR draft + questions to ask) | **AI: LLM**, de-identified input | `POST /api/doctor/patients/:id/ai-summary`, review modal |
| **Emergency detection** (13 danger signs; checklist + phrases in English/Urdu/Roman Urdu) | **Deterministic rules**, works offline. The AI can add a concern, never remove one. | `backend/src/triage/emergencyRules.ts` |
| Priority, department, token, parchi | **Deterministic rules** (`rules-v3`) | `backend/src/triage/evaluateMedicalTriage.ts` |

**Safety and privacy**
- Only symptom text (or de-identified case fields) is sent to the AI: never name, CNIC, phone, email, patient id or token. Uploaded documents are sent once and **never stored**. No AI output is stored.
- All AI output is forced into a JSON schema and **validated on the server** (unknown symptoms dropped, lengths capped, medicine names and doses removed from guidance).
- The API key lives only in `backend\.env` and is sent in a request header; it never reaches the browser and is never logged. Logs record only the model name and HTTP status.
- If the key is missing, wrong or the AI is down, the app shows "AI assistant unavailable" and **everything else keeps working**: emergency rules, manual symptom form, triage, parchi and doctor review.
- AI requests are rate-limited per user (`AI_RATE_LIMIT_MAX`, default 30 per 10 minutes).

**Configuration** (`backend\.env`): `GEMINI_API_KEY` (free key from https://aistudio.google.com/apikey), `GEMINI_MODEL` (default `gemini-2.5-flash`), `GEMINI_FALLBACK_MODEL` (default `gemini-2.5-flash-lite`, used when the main model is busy).

## Triage rules (rules-v3)

All rules are always checked, and the highest matching priority wins.

| Priority | Rule |
|---|---|
| High | **Any emergency danger sign** ticked (or confirmed after a phrase match): chest pain, severe breathing difficulty, fainting, seizure, stroke signs, heavy bleeding, confusion, fever with stiff neck, non-fading purple rash, face/lip/throat swelling, self-harm thoughts, pregnancy with bleeding, severe abdominal pain. The action becomes "go to Emergency now / call 1122". |
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
| Database | PostgreSQL + Prisma 5 (migrations in `backend/prisma/migrations`; the AI features needed **no** migration) |
| AI | Google Gemini API (REST via built-in `fetch`, structured JSON output; no extra npm packages) |
| Tests | Vitest + Supertest (backend API), Vitest (frontend logic), Playwright (end-to-end) |

## Quick start (Windows PowerShell)

```powershell
cd "D:\MediNexus AI"; npm install
cd backend; npm install; npx prisma generate
# edit backend\.env (see SETUP.md; add GEMINI_API_KEY for the AI features), back up the DB, then:
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
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | Hackathon demo script, judge Q&A and fallback plan |

## Out of scope (MVP)

- A trained/validated ML disease-prediction model (possible conditions come from an LLM and are labelled as suggestions)
- Storing AI output, voice input, AI chat
- Vital signs, examination findings, prescriptions, billing
- Departments other than General Medicine and Dermatology
- QR scanning hardware (the parchi uses Patient ID + token for verification)
- Daily token reset (tokens are unique and increase forever; see DATABASE.md)
