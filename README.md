# MediNexus AI — AI Medical Assistant & Digital Registration System

> *"From Digital Registration to Smarter Medical Care."*

**MediNexus AI** is a full-stack healthcare application that digitises the outpatient (OPD) patient registration, pre-triage, and clinical review workflow at government hospitals. Patients self-register their symptoms beforehand, receive an instant rule-based AI triage assessment and a digital registration slip (*parchi*), and are routed directly to the correct OPD room — eliminating manual queue bottlenecks. Attending physicians inspect patient records, review AI pre-triage summaries, annotate clinical notes, and sign off consultations from a dedicated Doctor Dashboard.

---

## Problem Identified

Government hospital OPD counters create severe manual queues before medical care begins:
* Patients wait 45–60 minutes in registration lines just to report basic demographics and symptoms on paper.
* Without structured pre-triage, patients frequently queue outside the wrong department.
* Doctors receive patients without prior clinical context, consuming valuable consultation time to gather basic history.

---

## Proposed Solution

MediNexus AI replaces physical counter queues with a self-service digital workflow:

1. **Identity & Authentication:** Secure registration and login for both Patients and Doctors with CNIC or Email.
2. **Patient Pre-Registration:** Patients enter basic demographics and select symptoms on Screen 1.
3. **Deterministic AI Triage:** A transparent, rule-based medical triage engine evaluates symptoms, age, and duration to classify risk (`Low` / `Medium` / `High`), flag clinical warnings, suggest differential conditions, and draft an SBAR clinical handover summary.
4. **Digital Parchi (Slip):** Generates a printable electronic OPD ticket with an assigned token number (e.g. `GM-01`, `DERM-03`) and assigned room, allowing patients to bypass central counters and proceed directly to their clinic.
5. **Physician OPD Dashboard:** Attending doctors review the incoming queue, filter by department, inspect AI triage summaries, edit clinical notes and prescription overrides, and approve consultations.

---

## Features Implemented

### 1. Splash Screen & Authentication
* **Splash Screen:** 3-second animated hospital brand screen with automatic transition to Login.
* **User Registration:** Supports account creation with Full Name, CNIC, Phone, Email, Password, Terms agreement, and dedicated **Patient** and **Doctor** role selector tabs.
* **User Login:** Authenticates using registered CNIC or Email + Password, complete with show/hide password toggle and validation alerts.
* **JWT Session Management:** Stateless JSON Web Token (JWT) issued on login/registration, verified via Bearer header, and cached in browser `localStorage`.
* **Role Selection:** Post-login routing screen allowing users to branch into the Patient OPD Intake flow or the Doctor OPD Dashboard.

### 2. Screen 1 — Patient Pre-Registration
* Input fields: Full name (optional / anonymous allowed), age (1–120), gender (`Male` / `Female` / `Other`).
* Department-based symptom selector:
  * **General Medicine (Room 104):** Fever, Flu, Headache, Cough, Sore throat, Body pain.
  * **Dermatology (Room 208):** Skin rash, Itching, Redness, Minor skin infection.
* Duration selector: Today (sudden onset) / 1–2 days / 3–5 days / 1–2 weeks / More than 2 weeks.
* Quick-fill demo presets: **Load Fever/Cough Demo** and **Load Skin Rash Demo** (persists real PostgreSQL records).
* Submits to `POST /api/patients`, executes deterministic triage, and advances to Screen 2.

### 3. Screen 2 — AI Medical Analysis
* **Risk Classification:** Color-coded triage badge (`Low` in emerald, `Medium` in amber, `High` in rose) with 3-segment visual scale and 94% confidence indicator.
* **Clinical Red Flags:** Highlights critical warnings (e.g., prolonged febrile respiratory illness, spreading bacterial dermopathy).
* **Suggested Department & Room:** Directs patients to General Medicine (Room 104) or Dermatology (Room 208).
* **Possible Conditions:** Ranked differential considerations for the examining doctor.
* **Recommended Action:** Plain-language guidance on immediate next steps.
* **Doctor Handover Summary:** Pre-compiled SBAR clinical narrative that saves physicians up to 70% in documentation time.
* **Medical Disclaimer:** Clear banner stating AI assists triage and does NOT replace a licensed physician.

### 4. Screen 3 — Digital Parchi (OPD Slip)
* Printable electronic registration slip with assigned Token Number (`GM-01`, `DERM-03`), Patient ID (`SC-2026-XXXX`), demographics, symptoms, and room assignment.
* **Print / Save Slip** button triggers native browser print dialogue (`window.print()`).
* Status Badges: "Digital Registration Completed" and "Doctor Review Required".
* Mock digital verification QR code for OPD door nurse or doctor desk validation.

### 5. Screen 4 — Physician OPD Triage Dashboard
* Real-time patient queue fetched from PostgreSQL via `GET /api/patients`.
* **Live Metrics Summary:** Total Queue count, High Risk Priority count, Awaiting Review count.
* **Filters & Search:** Filter by department (`All`, `General Medicine`, `Dermatology`) and live search across patient names, IDs, tokens, or symptoms.
* **Doctor Review Modal:** Attending physician inspects full triage summary, clicks **Edit** to enter clinical notes and prescription overrides (`PUT /api/patients/:id/review`), and clicks **Approve Triage** (`POST /api/patients/:id/approve`) to record approval with timestamp and doctor attribution.

---

## Complete User & Screen Flow

```
                     ┌──────────────────────────┐
                     │   Splash Screen (3s)     │
                     └─────────────┬────────────┘
                                   │
                     ┌─────────────▼────────────┐
                     │   Login / Register       │
                     └─────────────┬────────────┘
                                   │ (JWT Authenticated)
                     ┌─────────────▼────────────┐
                     │ Select Identity / Role   │
                     └─────────────┬────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌──────────────────┐                               ┌──────────────────┐
│   PATIENT ROLE   │                               │   DOCTOR ROLE    │
└────────┬─────────┘                               └────────┬─────────┘
         │                                                   │
         ▼                                                   ▼
┌──────────────────────────────┐                   ┌──────────────────────────────┐
│ Screen 1: OPD Registration   │                   │ Screen 4: Doctor Dashboard   │
│ (Demographics & Symptoms)    │                   │ - Live Queue Metrics         │
└────────┬─────────────────────┘                   │ - Department Search & Filter │
         │ (POST /api/patients)                    │ - Patient Queue Table        │
         ▼                                         └────────┬─────────────────────┘
┌──────────────────────────────┐                            │
│ Screen 2: AI Medical Analysis│                            │ (Open Report)
│ (Risk, Red Flags, SBAR)      │                            ▼
└────────┬─────────────────────┘                   ┌──────────────────────────────┐
         │                                         │ Doctor Clinical Review Modal │
         ▼                                         │ - Inspect AI Triage & Flags  │
┌──────────────────────────────┐                   │ - Edit Clinical Notes & Rx   │
│ Screen 3: Digital Parchi Slip│                   │ - Approve Triage Sign-off    │
│ (Printable Slip with Token)  │                   └──────────────────────────────┘
└──────────────────────────────┘
```

---

## AI's Role (Deterministic Triage Engine)

There is **no external AI or third-party LLM API dependency**. The triage engine in `backend/src/triage/evaluateMedicalTriage.ts` is a deterministic, rule-based clinical algorithm that:

1. Evaluates presenting symptoms to determine primary department alignment (General Medicine vs. Dermatology).
2. Applies clinical rules factoring in symptom combinations, age thresholds, and duration to classify triage risk as `Low`, `Medium`, or `High`.
3. Detects physiological red flags and warning triggers.
4. Selects candidate differential conditions for examining physicians.
5. Generates standardized SBAR physician handover summaries.
6. Operates instantly with zero API latency and zero cloud costs.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| UI Framework | React 18, TypeScript | Component-driven frontend architecture |
| Build Tool | Vite 6 | Development server, HMR, production bundling |
| Styling | Tailwind CSS v3 | Responsive design and medical theme styling |
| Icons | Lucide React | Medical and interface iconography |
| State & Auth | React Context API + LocalStorage | Session management and JWT token caching |
| Backend | Node.js, Express 4, TypeScript | RESTful API server |
| Security | bcryptjs (work factor 12) + jsonwebtoken | Salted password hashing and JWT authentication |
| ORM | Prisma 5 | Schema modeling and database migrations |
| Database | PostgreSQL (local) | Relational persistence for users and patient records |

---

## Running Locally

**Prerequisites:** Node.js 18+, local PostgreSQL running on port 5432.

```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ..

# 2. Configure environment (copy from backend/.env.example)
#    DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/smartcare
#    PORT=3001
#    JWT_SECRET=your_jwt_secret_key

# 3. Apply database migrations
cd backend
npx prisma migrate dev
npm run db:seed
cd ..

# 4. Start backend server (Terminal 1)
cd backend && npm run dev

# 5. Start frontend server (Terminal 2)
npm run dev
```

* **Frontend:** `http://localhost:5173`
* **Backend API:** `http://localhost:3001`
* **Health Check:** `http://localhost:3001/api/health`

---

## Documentation Index

| Document | Description |
|---|---|
| [USER_GUIDE.md](./USER_GUIDE.md) | Comprehensive step-by-step user & demonstration manual |
| [SETUP.md](./SETUP.md) | Installation, environment setup, and verification |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Functional & non-functional project specifications |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full system design, components, and data flow |
| [API.md](./API.md) | REST API endpoint documentation |
| [DATABASE.md](./DATABASE.md) | PostgreSQL schema, Prisma models, and migrations |

---

## Intentionally Out of Scope

- External cloud AI / LLM APIs (system uses deterministic, rule-based medical triage)
- Physical biometric fingerprint scanners or SMS gateways
- Real hardware barcode/QR scanners (application provides electronic mock verification block)
- Cloud databases (MongoDB, Firebase, Supabase — system uses local PostgreSQL)
- Clinical departments beyond General Medicine and Dermatology

---

*MediNexus AI — Built for a Hackathon. Not a medical device. All triage output requires clinical evaluation by a licensed physician.*
