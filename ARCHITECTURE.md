# SmartCare — Architecture

## Overview

SmartCare is a full-stack hackathon MVP: React frontend → Express/TypeScript backend → Prisma ORM → local PostgreSQL.

```
┌─────────────────┐     /api/* (Vite proxy)     ┌──────────────────┐
│  React Frontend │ ──────────────────────────► │ Express Backend  │
│  (port 5173)    │                               │  (port 3001)     │
└─────────────────┘                               └────────┬─────────┘
                                                             │
                                                    Prisma ORM │
                                                             ▼
                                                    ┌──────────────────┐
                                                    │   PostgreSQL     │
                                                    │  (localhost:5432)│
                                                    └──────────────────┘
```

## Frontend (`src/`)

| File | Role |
|---|---|
| `App.tsx` | Root state, screen routing, API orchestration |
| `api/client.ts` | Fetch wrapper for all backend endpoints |
| `types/medical.ts` | TypeScript interfaces |
| `data/mockData.ts` | Symptom lists, duration options (UI constants only) |
| `components/Screen1Registration.tsx` | Patient form |
| `components/Screen2AIAnalysis.tsx` | Triage result display |
| `components/Screen3DigitalParchi.tsx` | Printable OPD slip |
| `components/Screen4DoctorDashboard.tsx` | Doctor queue, filters, modal |
| `components/Navbar.tsx` | Navigation stepper + demo presets |

**Data flow:** Screen 1 submits → `POST /api/patients` → backend runs triage → returns `PatientRecord` → Screens 2–3 display active patient → Screen 4 loads all patients via `GET /api/patients`.

**Development proxy:** Vite proxies `/api` to `http://localhost:3001` (see `vite.config.ts`).

## Backend (`backend/src/`)

| File | Role |
|---|---|
| `server.ts` | Entry point, DB connection check, graceful shutdown |
| `app.ts` | Express app, CORS, routes, error handler |
| `routes/patients.ts` | Patient REST routes |
| `routes/health.ts` | Health check with DB ping |
| `controllers/patients.controller.ts` | Request validation + response |
| `services/patients.service.ts` | Business logic, ID/token generation, DB writes |
| `triage/evaluateMedicalTriage.ts` | Deterministic triage engine |
| `lib/prisma.ts` | Prisma client singleton |
| `middleware/errorHandler.ts` | Centralized error responses |

## Database (`backend/prisma/`)

- `schema.prisma` — Patient, TriageResult, DoctorReview models
- `migrations/` — Applied SQL migrations
- `seed.ts` — Idempotent seed of 4 demo patients

## Triage Engine

Located at `backend/src/triage/evaluateMedicalTriage.ts`. Pure rule-based logic:

1. Count symptoms per department → assign department
2. Apply symptom/age/duration rules → classify Low/Medium/High risk
3. Generate red flags, possible conditions, recommended action, SBAR summary
4. Fixed confidence score of 94%

No external AI API. Same deterministic output for identical inputs.

## Screen Flow

```
Screen 1 (Register) → Screen 2 (Analysis) → Screen 3 (Parchi) → Screen 4 (Dashboard)
         │                                                              │
         └──────────── POST /api/patients ──────────────────────────────┘
                                    GET /api/patients (dashboard load)
```

## Technology Stack

| Layer | Technology |
|---|---|
| UI | React 18, TypeScript, Tailwind CSS, lucide-react |
| Build | Vite 6 |
| API | Express 4, TypeScript, CORS |
| ORM | Prisma 5 |
| Database | PostgreSQL (local) |
| Dev | nodemon (backend), Vite HMR (frontend) |
