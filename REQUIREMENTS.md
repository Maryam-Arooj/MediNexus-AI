# MediNexus AI — Requirements

## Problem Statement

Government hospital OPD counters create long manual queues before medical care begins. Patients wait 45–60 minutes to register on paper, then often wait outside the wrong department. Doctors receive patients with no structured prior context.

## Solution Goals

1. Simple, secure user authentication with dedicated Patient and Doctor identity pathways
2. Digital patient pre-registration with symptom capture
3. Deterministic AI triage (rule-based, zero external LLM dependencies)
4. Digital OPD slip (*parchi*) with token number and room assignment
5. Doctor dashboard for queue management, clinical note editing, and triage approval
6. Persistent relational storage via local PostgreSQL and Prisma ORM

---

## Functional Requirements

### 1. Authentication & Identity Flow

- **Splash Screen:** 3-second animated branding screen with auto-transition to Login.
- **User Registration:** Capture Full Name, CNIC, Phone (optional), Email (optional), Password (min. 6 characters), and Role tab (`Patient` or `Doctor`).
- **User Login:** Authenticate using CNIC or Email + Password with show/hide password toggle.
- **Role Selection:** Post-login routing screen allowing users to choose their operational identity (Patient OPD intake vs. Doctor Dashboard).
- **Session Management:** Stateless JSON Web Token (JWT) issued on login/registration, verified via Bearer header.

### 2. Patient Registration (Screen 1)

- Capture: Name (optional / anonymous allowed), Age (required, 1–120), Gender (required), Symptoms (required, at least one), Duration (required).
- Symptom groups: General Medicine (Room 104) and Dermatology (Room 208).
- Form validation with inline error feedback.
- Quick-test demo presets: Fever/Cough and Skin Rash (submits real PostgreSQL records).
- On submit: `POST /api/patients` executes deterministic triage and advances to Screen 2.

### 3. AI Medical Analysis (Screen 2)

- Displays triage assessment: Risk level (`Low` / `Medium` / `High`) with visual scale, clinical red flags, suggested department, possible conditions, recommended action, and SBAR doctor handover summary.
- Mandatory medical disclaimer banner.
- Navigation: Back to edit symptoms or proceed to generate digital parchi.

### 4. Digital Parchi Slip (Screen 3)

- Printable electronic OPD slip with token number, patient ID, demographics, symptoms, triage summary, and verification QR mock.
- Native browser print support via `window.print()`.
- Status badges: "Digital Registration Completed" and "Doctor Review Required".
- Navigation link to Doctor Dashboard.

### 5. Doctor Dashboard (Screen 4)

- Real-time patient queue loaded from PostgreSQL via `GET /api/patients`.
- Metrics summary row: Total Queue count, High Risk Priority count, Awaiting Review count.
- Department filter tabs (`All`, `General Medicine`, `Dermatology`) and live search by name, ID, token, or symptom.
- Clinical Review Modal: View AI triage and red flags, edit attending physician clinical notes and action overrides (`PUT /api/patients/:id/review`), and approve triage (`POST /api/patients/:id/approve`).
- Data and reviews persist across browser sessions.

---

## Non-Functional Requirements

| Requirement | Implementation |
|---|---|
| Database | Local PostgreSQL with Prisma ORM migrations |
| Backend | Node.js, Express 4, TypeScript |
| Frontend | React 18, Vite 6, Tailwind CSS v3, Lucide React |
| Security | Salted bcrypt password hashing (work factor 12), JWT Bearer token authorization; `.env` strictly gitignored |
| Triage | Pure TypeScript deterministic rule engine — zero external AI/LLM API latency |
| Persistence | Relational persistence in PostgreSQL; survives server restarts and page refreshes |

---

## Data Models

### User
`id`, `fullName`, `cnic`, `email`, `phone`, `passwordHash`, `role`, `createdAt`, `updatedAt`

### Patient
`id`, `patientId`, `name`, `age`, `gender`, `symptoms`, `duration`, `tokenNumber`, `department`, `assignedRoom`, `userId`, `createdAt`

### TriageResult
`id`, `patientId`, `riskLevel`, `redFlags`, `possibleConditions`, `recommendedAction`, `doctorHandoverSummary`, `confidenceScore`, `createdAt`

### DoctorReview
`id`, `patientId`, `status`, `clinicalNotes`, `recommendedActionOverride`, `approvedBy`, `approvedAt`, `updatedAt`

---

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Backend and PostgreSQL health check |
| POST | `/api/auth/register` | Register user account (Patient/Doctor) + issue JWT |
| POST | `/api/auth/login` | Authenticate with CNIC/Email + password |
| GET | `/api/auth/me` | Retrieve authenticated user profile via JWT |
| POST | `/api/auth/logout` | Client-side session termination |
| POST | `/api/patients` | Register OPD pre-check + generate triage |
| GET | `/api/patients` | List all patient records from PostgreSQL |
| GET | `/api/patients/:id` | Retrieve single patient record |
| PUT | `/api/patients/:id/review` | Save doctor clinical notes & plan overrides |
| POST | `/api/patients/:id/approve` | Approve patient triage consultation |

---

## Out of Scope

- External third-party LLM / AI cloud APIs (MVP uses local deterministic rule engine)
- Real biometric fingerprint or SMS verification
- Physical QR scanner hardware integration
- Pharmacy dispensing / billing systems
- Cloud multi-region databases (MVP uses local PostgreSQL)
- Clinical departments beyond General Medicine and Dermatology
