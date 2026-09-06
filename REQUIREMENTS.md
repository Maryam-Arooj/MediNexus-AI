# SmartCare — Requirements

## Problem Statement

Government hospital OPD counters create long manual queues before medical care begins. Patients wait 45–60 minutes to register on paper, then often wait outside the wrong department. Doctors receive patients with no structured prior context.

## Solution Goals

1. Digital patient pre-registration with symptom capture
2. Deterministic AI triage (rule-based, no external LLM)
3. Digital OPD slip (*parchi*) with token number and room assignment
4. Doctor dashboard for review, edit, and approval
5. Persistent storage via local PostgreSQL

## Functional Requirements

### Patient Registration (Screen 1)
- Capture: name (optional), age (required), gender (required), symptoms (required), duration (required)
- Symptom groups: General Medicine and Dermatology
- Form validation with inline errors
- Demo presets: Fever/Cough and Skin Rash (submit real PostgreSQL records)
- On submit: POST to backend, run triage, advance to Screen 2

### AI Medical Analysis (Screen 2)
- Display triage result: risk level, red flags, department, conditions, recommended action, doctor summary
- Mandatory disclaimer banner
- Navigation: back to edit or proceed to parchi

### Digital Parchi (Screen 3)
- Printable OPD slip with token, patient ID, demographics, symptoms, triage summary
- Print via `window.print()`
- Link to doctor dashboard

### Doctor Dashboard (Screen 4)
- Load all patients from PostgreSQL
- Metrics: total queue, high risk count, awaiting review count
- Filter by department; search by name, ID, token, symptom
- Modal: view report, edit action/notes, approve triage
- Review and approval persist to PostgreSQL

## Non-Functional Requirements

| Requirement | Implementation |
|---|---|
| Database | Local PostgreSQL only |
| Backend | Node.js, Express, TypeScript, Prisma |
| Frontend | React 18, Vite, Tailwind CSS |
| Triage | Deterministic rule engine — no external AI/LLM |
| Persistence | All patient data survives page refresh |
| Security | No auth/RBAC in MVP; `.env` never committed |

## Out of Scope

- External AI/LLM APIs
- User authentication or RBAC
- Real QR code generation
- Vital signs input
- Prescriptions
- SMS/notifications
- Cloud databases (MongoDB, SQLite, Supabase, Firebase)
- Departments beyond General Medicine and Dermatology

## Data Models

### Patient
`id`, `patientId`, `name`, `age`, `gender`, `symptoms`, `duration`, `tokenNumber`, `department`, `assignedRoom`, `createdAt`

### TriageResult
`id`, `patientId`, `riskLevel`, `redFlags`, `possibleConditions`, `recommendedAction`, `doctorHandoverSummary`, `confidenceScore`, `createdAt`

### DoctorReview
`id`, `patientId`, `status`, `clinicalNotes`, `recommendedActionOverride`, `approvedBy`, `approvedAt`, `updatedAt`

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | API + PostgreSQL status |
| POST | `/api/patients` | Register patient + triage |
| GET | `/api/patients` | List all patients |
| GET | `/api/patients/:id` | Single patient with triage + review |
| PUT | `/api/patients/:id/review` | Save doctor edits |
| POST | `/api/patients/:id/approve` | Approve triage |
