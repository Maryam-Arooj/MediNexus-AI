# SmartCare — AI Medical Assistant & Digital Registration

> *"From Digital Registration to Smarter Medical Care."*

**SmartCare** is a hackathon MVP that digitises the OPD patient registration and pre-triage workflow at government hospitals. Patients self-register their symptoms before arriving at the doctor's desk, receive an AI-generated triage assessment and a digital registration slip (*parchi*), and are routed directly to the correct OPD room — bypassing the physical queue counter.

---

## Problem Identified

Government hospital OPD counters create long manual queues before any medical care begins. Patients wait 45–60 minutes just to register their name and symptoms on paper, then wait again outside the wrong department because there is no pre-screening step. Doctors receive patients with no structured prior context, forcing them to re-gather basic information during a short consultation.

---

## Proposed Solution

Replace the paper-based registration counter with a self-service digital pre-check:

1. The patient (or a receptionist) enters basic demographics and selects symptoms on Screen 1.
2. A deterministic triage engine evaluates the input and generates a risk classification, red-flag warnings, possible conditions, and a doctor-ready handover summary.
3. A printable digital *parchi* (OPD slip) is generated with a token number and the assigned OPD room, allowing the patient to skip the central queue and go directly to the correct department counter.
4. The attending physician reviews the AI-generated summary on the Doctor Dashboard and approves or annotates it before the consultation.

---

## Current MVP — What Is Built

The MVP is a **full-stack application**: React frontend → Express/TypeScript backend → Prisma → local PostgreSQL.

### Screen 1 — Patient Pre-Registration

- Input fields: full name (optional / anonymous allowed), age (required, 1–120), gender (required: Male / Female / Other).
- Symptom selector grouped by department — toggleable cards for **General Medicine** and **Dermatology**.
- Duration selector: Today (sudden onset) / 1–2 days / 3–5 days / 1–2 weeks / More than 2 weeks.
- Form validation with inline error messages.
- Two quick-fill demo presets: **Load Fever/Cough Demo** and **Load Skin Rash Demo** (creates real PostgreSQL records).
- On submission, `POST /api/patients` runs triage on the backend and the app advances to Screen 2.

### Screen 2 — AI Medical Analysis

- Displays the triage result generated for the submitted patient:
  - **Risk level** badge: Low / Medium / High, with a 3-segment visual scale.
  - **Red flags & clinical warnings** panel.
  - **Suggested department** with the assigned OPD room.
  - **Possible conditions** — a ranked differential list (pre-triage only, not a diagnosis).
  - **Recommended action** — plain-language instruction to the patient.
  - **Doctor Handover Summary** — a pre-formatted, SBAR-style clinical summary.
- Mandatory disclaimer banner.
- Navigation: back to edit symptoms, or proceed to generate the digital parchi.

### Screen 3 — Digital Parchi (OPD Slip)

- A printable registration slip containing token number, patient ID, demographics, symptoms, triage summary, and recommended action.
- **Print / Save Slip** button invokes `window.print()`.
- Status badges: "Digital Registration Completed" and "Doctor Review Required".

### Screen 4 — Physician OPD Triage Dashboard

- Loads all patients from PostgreSQL via `GET /api/patients`.
- **Metrics summary row**: Total Queue count, High Risk count, Awaiting Review count.
- **Filters**: department tab filter and live search field.
- Each row shows token, patient ID, demographics, department, symptoms, risk level, and status.
- **Open Report** modal: view triage, edit action/notes (`PUT /api/patients/:id/review`), approve (`POST /api/patients/:id/approve`).
- Data persists across browser refresh.

---

## Current User Flow

```
Patient / Receptionist
        |
        v
[Screen 1] Enter name, age, gender, symptoms, duration
        |
        v  (Submit -> POST /api/patients -> triage + save to PostgreSQL)
[Screen 2] Review AI risk level, red flags, suggested department,
           possible conditions, recommended action, doctor summary
        |
        v  (Proceed)
[Screen 3] Digital Parchi generated -- token number + OPD room assigned
           Patient prints or saves slip; goes directly to OPD room
        |
        v  (Doctor Dashboard link)
[Screen 4] Doctor sees patient queue from PostgreSQL, opens report modal,
           edits notes if needed, and approves triage (persisted)
```

---

## AI's Role

There is **no external AI API**. The "AI" is a deterministic, rule-based triage engine in `backend/src/triage/evaluateMedicalTriage.ts`. It:

- Counts symptom matches per department to assign a department.
- Applies rule-based logic (symptom combinations, age, duration) to classify risk as Low / Medium / High.
- Selects possible conditions from a fixed differential list.
- Constructs the recommended action and doctor handover summary as template strings.
- Returns a fixed `confidenceScore` of 94%.

---

## Technology & Architecture

| Layer | Choice |
|---|---|
| UI Framework | React 18 (TypeScript) |
| Build Tool | Vite 6 with @vitejs/plugin-react |
| Styling | Tailwind CSS v3 |
| Backend | Node.js, Express 4, TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL (local) |
| AI / ML | None — deterministic rule engine |
| State Management | React useState in App.tsx |
| Persistence | PostgreSQL via REST API |

**File structure:**

```
src/                          # React frontend
  App.tsx                     # Root component, API orchestration
  api/client.ts               # Backend API client
  types/medical.ts            # TypeScript interfaces
  data/mockData.ts            # Symptom lists, duration options (UI only)
  components/                 # Four screens + Navbar

backend/
  prisma/schema.prisma        # Patient, TriageResult, DoctorReview
  prisma/seed.ts              # 4 idempotent demo patients
  src/
    server.ts                 # Entry point
    app.ts                    # Express app
    routes/                   # /api/health, /api/patients
    services/                 # Business logic
    triage/                   # evaluateMedicalTriage()
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

---

## Running Locally

**Prerequisites:** Node.js 18+, PostgreSQL running locally.

```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ..

# 2. Configure backend/.env (copy from backend/.env.example)
#    DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/smartcare
#    PORT=3001

# 3. Migrate and seed
cd backend
npx prisma migrate dev
npm run db:seed
cd ..

# 4. Start backend (terminal 1)
cd backend && npm run dev

# 5. Start frontend (terminal 2)
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

Full setup guide: [SETUP.md](./SETUP.md)

---

## Documentation

| Document | Description |
|---|---|
| [SETUP.md](./SETUP.md) | Installation and configuration |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Functional requirements |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and data flow |
| [API.md](./API.md) | REST API reference |
| [DATABASE.md](./DATABASE.md) | Schema, migrations, seed |

---

## Intentionally Out of Scope

- Real AI / ML model or external LLM API integration
- User authentication or role-based access control
- Real QR code generation or scanning
- Vital signs input, prescriptions, SMS notifications
- Cloud databases (MongoDB, SQLite, Supabase, Firebase)
- Departments beyond General Medicine and Dermatology

---

*SmartCare MVP — Built for a Hackathon. Not a medical device. All triage output requires validation by a licensed physician.*
