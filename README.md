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

The MVP is a fully client-side, single-page React application with four sequential screens connected by a shared application state.

### Screen 1 — Patient Pre-Registration

- Input fields: full name (optional / anonymous allowed), age (required, 1–120), gender (required: Male / Female / Other).
- Symptom selector grouped by department — toggleable cards for **General Medicine** (Fever, Flu, Headache, Cough, Sore throat, Body pain) and **Dermatology** (Skin rash, Itching, Redness, Minor skin infection).
- Duration selector: Today (sudden onset) / 1–2 days / 3–5 days / 1–2 weeks / More than 2 weeks.
- Form validation with inline error messages.
- Two quick-fill demo presets in the navbar for hackathon judges: **Load Fever/Cough Demo** and **Load Skin Rash Demo**.
- On submission, the triage engine is called synchronously and the app advances to Screen 2.

### Screen 2 — AI Medical Analysis

- Displays the triage result generated for the submitted patient:
  - **Risk level** badge: Low / Medium / High, with a 3-segment visual scale.
  - **Red flags & clinical warnings** panel.
  - **Suggested department** (General Medicine or Dermatology) with the assigned OPD room.
  - **Possible conditions** — a ranked differential list (pre-triage only, not a diagnosis).
  - **Recommended action** — plain-language instruction to the patient.
  - **Doctor Handover Summary** — a pre-formatted, SBAR-style clinical summary ready for the doctor's desk.
- A mandatory disclaimer banner states that the output requires doctor review and does not replace a licensed physician.
- Navigation: back to edit symptoms, or proceed to generate the digital parchi.

### Screen 3 — Digital Parchi (OPD Slip)

- A printable registration slip containing:
  - Hospital header, token number, and department.
  - Patient ID (e.g. `SC-2026-xxxx`), name, age/gender, assigned OPD room.
  - Reported symptoms and duration.
  - Risk level badge and triage tier.
  - Red flags assessment.
  - AI Pre-Triage Handover Summary (same text as Screen 2).
  - Recommended action / patient instructions.
  - A placeholder QR code icon labelled "Digital Token Verification QR" (visual mock only — not a real scannable code).
- **Print / Save Slip** button invokes `window.print()`.
- Status badges: "Digital Registration Completed" and "Doctor Review Required".

### Screen 4 — Physician OPD Triage Dashboard

- A data table listing all pre-registered patients in the current session (including four pre-loaded mock patients).
- **Metrics summary row**: Total Queue count, High Risk count, Awaiting Review count.
- **Filters**: department tab filter (All / General Medicine / Dermatology) and a live search field (by name, patient ID, token number, or symptom).
- Each row shows: token number, patient ID, name, age/gender, department, presenting symptoms, risk level badge, and status (Pending Review / Under Review / Approved).
- **Open Report** opens a modal with the full AI triage report for that patient.
- Inside the modal, the doctor can:
  - View risk level, red flags, the AI handover summary, and recommended action.
  - Click **Edit** to modify the recommended action text and add free-text clinical notes.
  - Click **Approve Triage** to mark the patient status as Approved (recorded with a timestamp and "Dr. Resident Medical Officer" as the approver).
- **Register New Patient** button resets the form and returns to Screen 1.

---

## Current User Flow

```
Patient / Receptionist
        |
        v
[Screen 1] Enter name, age, gender, symptoms, duration
        |
        v  (Submit -> triage engine runs instantly)
[Screen 2] Review AI risk level, red flags, suggested department,
           possible conditions, recommended action, doctor summary
        |
        v  (Proceed)
[Screen 3] Digital Parchi generated -- token number + OPD room assigned
           Patient prints or saves slip; goes directly to OPD room
        |
        v  (Doctor Dashboard link)
[Screen 4] Doctor sees patient queue, opens report modal,
           edits notes if needed, and approves triage
```

---

## AI's Role

There is **no external AI API** in this MVP. The "AI" is a deterministic, rule-based triage engine implemented in `src/data/mockData.ts` (`evaluateMedicalTriage` function). It:

- Counts symptom matches per department to assign a department.
- Applies rule-based logic (symptom combinations, age, duration) to classify risk as Low / Medium / High and generate red-flag text.
- Selects possible conditions from a fixed differential list based on symptom patterns.
- Constructs the recommended action and doctor handover summary as template strings.
- Returns a fixed `confidenceScore` of 94% (hardcoded for demonstration).

The engine produces consistent, deterministic output for any given input combination. It is labelled "AI Triage" in the UI to represent what a real ML/LLM-based triage model would do in production.

---

## Doctor's Role / Review

The doctor is **always the final authority**. The application makes this explicit at every step:

- Screen 2 shows a prominent disclaimer: *"SmartCare assists initial medical triage and queue routing. It does NOT replace a licensed physician."*
- Screen 3 bears a "Doctor Review Required" badge.
- Screen 4 requires the doctor to explicitly click **Approve Triage** for each patient.
- The doctor can override the recommended action text and add free-text clinical notes before approving.
- No prescription or diagnosis is generated or displayed; the system only produces pre-triage summaries.

---

## Included Departments

| Department | Token Prefix | OPD Room | Symptoms Covered |
|---|---|---|---|
| General Medicine | `GM-` | Room 104 | Fever, Flu, Headache, Cough, Sore throat, Body pain |
| Dermatology | `DERM-` | Room 208 | Skin rash, Itching, Redness, Minor skin infection |

Only these two departments are active in the current MVP.

---

## Technology & Architecture

| Layer | Choice |
|---|---|
| UI Framework | React 18 (TypeScript) |
| Build Tool | Vite 6 with @vitejs/plugin-react |
| Styling | Tailwind CSS v3 (utility classes; no custom CSS framework) |
| Icons | lucide-react |
| Fonts | Inter (Google Fonts, loaded via CDN in index.html) |
| State Management | React useState in App.tsx (no external store) |
| Data / Backend | None -- all data is in-memory (client-side only) |
| AI / ML | None -- deterministic rule engine (evaluateMedicalTriage) |
| Routing | None -- single-page, screen switching via currentScreen integer state |
| Persistence | None -- data resets on page refresh |

**File structure:**

```
src/
  App.tsx                      # Root component, global state, screen router
  main.tsx                     # React DOM entry point
  index.css                    # Minimal global styles
  types/
    medical.ts                 # TypeScript interfaces: PatientRecord, AIAnalysisResult, etc.
  data/
    mockData.ts                # Triage engine, symptom lists, duration options, mock patients
  components/
    Navbar.tsx                 # Sticky top nav with stepper tabs and demo presets
    Screen1Registration.tsx    # Patient pre-registration form
    Screen2AIAnalysis.tsx      # AI triage result display
    Screen3DigitalParchi.tsx   # Printable digital OPD slip
    Screen4DoctorDashboard.tsx # Doctor queue table, filters, report modal, approve action
```

---

## What Is Currently Implemented

- Patient pre-registration form (name, age, gender, symptoms, duration)
- Deterministic triage engine producing risk level, red flags, department, conditions, summary
- Token number and patient ID generation (sequential, in-memory)
- AI Medical Analysis screen with full triage result display
- Digital Parchi (OPD slip) with browser print support
- Doctor Dashboard with patient queue table, department/search filters, and metrics
- Doctor report modal with inline editing of action plan and clinical notes
- Doctor approval action (marks patient as Approved with timestamp)
- Four pre-loaded mock patients for dashboard demonstration
- Two quick-fill demo presets (Fever/Cough, Skin Rash) in the navbar
- Mandatory AI disclaimer and "Doctor Review Required" messaging throughout

---

## Intentionally Out of Scope (Current MVP)

- Real AI / ML model or external LLM API integration
- Backend server, database, or any data persistence
- User authentication or role-based access control
- Real QR code generation or scanning
- Vital signs input (temperature, SpO2, blood pressure, etc.)
- Prescription generation or medication management
- Patient history or medical record lookup
- SMS / WhatsApp / push notifications for token status
- Departments beyond General Medicine and Dermatology
- Multi-language / Urdu / Hindi support
- Mobile app (PWA or native)
- Hospital system integration (HIS / EMR / HL7 / FHIR)

---

## Running Locally

```bash
npm install
npm run dev
```

The app starts at `http://localhost:3000`.

---

*SmartCare MVP -- Built for a Hackathon. Not a medical device. All triage output requires validation by a licensed physician.*
