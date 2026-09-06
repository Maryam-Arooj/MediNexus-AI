# MediNexus AI — Architecture

## Overview

MediNexus AI is a full-stack digital hospital pre-check and triage application: React frontend → Express/TypeScript backend → Prisma ORM → local PostgreSQL.

```
┌─────────────────┐     /api/* (Vite proxy)     ┌──────────────────┐
│  React Frontend │ ──────────────────────────► │ Express Backend  │
│  (port 5173)    │ ◄────────────────────────── │  (port 3001)     │
└─────────────────┘   JWT / JSON Responses      └────────┬─────────┘
        │                                                │
   AuthContext                                  Prisma ORM (v5)
  (localStorage)                                         │
                                                         ▼
                                                ┌──────────────────┐
                                                │   PostgreSQL     │
                                                │  (localhost:5432)│
                                                └──────────────────┘
```

---

## Frontend Architecture (`src/`)

### Application Shell & State
* **`App.tsx`**: Root component orchestrating screen routing between Authentication (`splash`, `login`, `register`, `roleSelect`) and Clinical screens (`1`, `2`, `3`, `4`).
* **`context/AuthContext.tsx`**: Manages user authentication state (`user`, `token`, `isAuthenticated`, `isLoading`), validates stored JWTs on load via `GET /api/auth/me`, and provides `login()` and `logout()`.
* **`api/client.ts`**: Unified API client communicating with backend endpoints, handling JWT token attachment (`Authorization: Bearer <token>`) and standard error mapping.

### Types
* **`types/auth.ts`**: User, authentication state, login, and registration input interfaces.
* **`types/medical.ts`**: Patient records, triage analysis, clinical review, and department types.
* **`data/mockData.ts`**: UI symptom taxonomies, duration options, and constants for General Medicine and Dermatology.

### Components
* **Authentication Screens (`components/auth/`)**:
  * `SplashScreen.tsx`: 3-second animated hospital brand splash screen with auto-fade transition.
  * `LoginScreen.tsx`: CNIC / Email login with show/hide password toggle.
  * `RegisterScreen.tsx`: Account creation with Full Name, CNIC, Phone, Email, Password, Terms, and Patient/Doctor role selector.
  * `RoleSelectScreen.tsx`: Post-login gateway routing users to either Patient OPD Intake or Doctor Dashboard.
* **Clinical Screens (`components/`)**:
  * `Screen1Registration.tsx`: Patient demographics (name, age, gender) and department symptom selector.
  * `Screen2AIAnalysis.tsx`: Triage result presentation with risk level meter, clinical red flags, differential conditions, and SBAR handover summary.
  * `Screen3DigitalParchi.tsx`: Printable electronic outpatient slip (*parchi*) with token number and verification QR mock.
  * `Screen4DoctorDashboard.tsx`: Physician triage queue, live counters, search/filter, and doctor review modal for editing clinical notes and approving triage.
  * `Navbar.tsx`: Persistent navigation stepper, demo presets, and logout button.

---

## Backend Architecture (`backend/src/`)

* **`server.ts`**: Application bootstrapper; tests PostgreSQL connectivity via Prisma before starting Express server on port 3001.
* **`app.ts`**: Express application setup, CORS policy, JSON body parsing, route mounting, and global error handling.
* **`routes/auth.ts`**: Authentication route definitions (`/register`, `/login`, `/me`, `/logout`).
* **`controllers/auth.controller.ts`**: Validates input, hashes passwords with `bcryptjs` (cost factor 12), creates User records, and signs stateless JWT tokens.
* **`middleware/authMiddleware.ts`**: `requireAuth` middleware verifying Bearer JWT tokens and attaching user context to requests.
* **`routes/patients.ts`**: Patient and triage REST routes (`POST /`, `GET /`, `GET /:id`, `PUT /:id/review`, `POST /:id/approve`).
* **`controllers/patients.controller.ts`**: Request validation and response shaping for patient endpoints.
* **`services/patients.service.ts`**: Business logic, public Patient ID (`SC-2026-XXXX`) generation, OPD token serial (`GM-01`, `DERM-01`) generation, and database transactions.
* **`triage/evaluateMedicalTriage.ts`**: Deterministic, rule-based medical triage engine.
* **`lib/prisma.ts`**: Shared Prisma Client singleton.
* **`middleware/errorHandler.ts`**: Centralized HTTP error handler.

---

## Database Architecture (`backend/prisma/`)

* **`schema.prisma`**: Defines database models:
  * `User`: System accounts with roles (`patient`, `doctor`) and bcrypt password hashes.
  * `Patient`: Outpatient demographic and consultation intake records.
  * `TriageResult`: 1-to-1 relation with Patient storing risk classifications, red flags, and handover summaries.
  * `DoctorReview`: 1-to-1 relation with Patient storing clinical notes, prescription overrides, and approvals.
* **`migrations/`**:
  * `20260905101641_init`: Base schema for patients, triage, and doctor reviews.
  * `20260906041835_add_auth`: Added `users` table and linked `userId` on `patients`.

---

## Triage Engine

Located at `backend/src/triage/evaluateMedicalTriage.ts`. Operates deterministically without external API dependencies:

1. **Department Routing**: Evaluates symptom selections across General Medicine and Dermatology to assign the appropriate OPD clinic and room.
2. **Risk Classification**: Evaluates symptom combinations, age thresholds, and duration to assign `Low`, `Medium`, or `High` risk.
3. **Clinical Warnings (Red Flags)**: Flags potential acute conditions (e.g. prolonged febrile respiratory illness, spreading cutaneous bacterial infections).
4. **Differential Considerations**: Selects candidate conditions for the examining physician.
5. **Physician Handover Summary**: Generates a standardized SBAR (Situation, Background, Assessment, Recommendation) narrative to reduce physician documentation time.
6. **Confidence Rating**: Deterministic confidence score (94%).

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

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend UI | React 18, TypeScript | Component-driven user interface |
| Build Tool | Vite 6 | Fast compilation, HMR, and bundling |
| Styling | Tailwind CSS v3 | Utility-first responsive design |
| Icons | Lucide React | Clean medical and UI iconography |
| State & Auth | React Context + LocalStorage | Session persistence and JWT storage |
| Backend API | Node.js, Express 4, TypeScript | RESTful API server |
| Password Security | bcryptjs | Salted password hashing (work factor 12) |
| Token Security | jsonwebtoken (JWT) | Stateless token-based authentication |
| ORM | Prisma 5 | Type-safe database queries and migrations |
| Database | PostgreSQL (local) | Persistent relational data storage |
| Triage Engine | Pure TypeScript Rule Engine | Deterministic medical triage logic |
