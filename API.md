# MediNexus AI — API Reference

Base URL: `http://localhost:3001/api`

All responses use JSON with a `success` boolean. Successful responses include `data`; errors include `error`.

---

## Health Check

### GET /api/health

Checks backend service and PostgreSQL database connectivity.

**Response 200 (OK):**
```json
{
  "success": true,
  "status": "ok",
  "api": "MediNexus AI Backend",
  "database": "PostgreSQL — connected",
  "timestamp": "2026-09-06T10:00:00.000Z"
}
```

**Response 503 (Service Unavailable):**
```json
{
  "success": false,
  "status": "error",
  "api": "MediNexus AI Backend",
  "database": "PostgreSQL — disconnected",
  "error": "...",
  "timestamp": "2026-09-06T10:00:00.000Z"
}
```

---

## Authentication Endpoints

### POST /api/auth/register

Creates a new user account (Patient or Doctor), securely hashes the password with `bcryptjs` (work factor 12), and returns a signed JWT session token.

**Request Body:**
```json
{
  "fullName": "Ayesha Khan",
  "cnic": "42101-5678901-2",
  "phone": "03001234567",
  "email": "ayesha@example.com",
  "password": "Password123",
  "confirmPassword": "Password123",
  "role": "patient"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `fullName` | string | Yes | User's full display name |
| `cnic` | string | Yes | Unique National ID / CNIC |
| `phone` | string | No | Contact phone number |
| `email` | string | No | Email address (unique if provided) |
| `password` | string | Yes | Minimum 6 characters |
| `confirmPassword` | string | Yes | Must match `password` |
| `role` | string | No | `"patient"` or `"doctor"` (default: `"patient"`) |

**Response 201 (Created):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cmtp...",
      "fullName": "Ayesha Khan",
      "cnic": "42101-5678901-2",
      "email": "ayesha@example.com",
      "phone": "03001234567",
      "role": "patient",
      "createdAt": "2026-09-06T10:00:00.000Z"
    }
  }
}
```

---

### POST /api/auth/login

Authenticates a user via either CNIC or Email + Password and returns a signed JWT token.

**Request Body:**
```json
{
  "identifier": "42101-5678901-2",
  "password": "Password123"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `identifier` | string | Yes | User's registered CNIC or Email |
| `password` | string | Yes | Account password |

**Response 200 (OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cmtp...",
      "fullName": "Ayesha Khan",
      "cnic": "42101-5678901-2",
      "email": "ayesha@example.com",
      "phone": "03001234567",
      "role": "patient",
      "createdAt": "2026-09-06T10:00:00.000Z"
    }
  }
}
```

**Response 401 (Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid credentials."
}
```

---

### GET /api/auth/me

Validates the JWT token in the `Authorization` header and returns the current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response 200 (OK):**
```json
{
  "success": true,
  "data": {
    "id": "cmtp...",
    "fullName": "Ayesha Khan",
    "cnic": "42101-5678901-2",
    "email": "ayesha@example.com",
    "phone": "03001234567",
    "role": "patient",
    "createdAt": "2026-09-06T10:00:00.000Z"
  }
}
```

---

### POST /api/auth/logout

Standardized logout endpoint; instructs the frontend client to clear the stored JWT token from `localStorage`.

**Response 200 (OK):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully."
  }
}
```

---

## Patient & Triage Endpoints

### POST /api/patients

Registers an outpatient OPD pre-check, executes the deterministic triage engine, and persists the record to PostgreSQL.

**Request Body:**
```json
{
  "name": "Ramesh Verma",
  "age": 54,
  "gender": "Male",
  "symptoms": ["Fever", "Cough", "Body pain"],
  "duration": "1 - 2 weeks"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | No | Defaults to "Anonymous Patient" |
| `age` | number | Yes | Valid age between 1 and 120 |
| `gender` | string | Yes | `"Male"`, `"Female"`, or `"Other"` |
| `symptoms` | string[] | Yes | At least one symptom selected |
| `duration` | string | Yes | Duration string from predefined options |

**Response 201 (Created):** Full `PatientRecord` in `data`.

---

### GET /api/patients

Lists all registered patients with their triage and clinical review data from PostgreSQL, ordered by creation date (newest first).

**Response 200 (OK):**
```json
{
  "success": true,
  "data": [ /* PatientRecord[] */ ]
}
```

---

### GET /api/patients/:id

Retrieves a single patient record by public `patientId` (e.g., `SC-2026-1715`).

**Response 200 (OK):** Single `PatientRecord` in `data`.

**Response 404 (Not Found):**
```json
{
  "success": false,
  "error": "Patient not found."
}
```

---

### PUT /api/patients/:id/review  *(or PATCH)*

Saves attending physician clinical notes, prescription overrides, or plan adjustments.

**Request Body:**
```json
{
  "clinicalNotes": "Examined chest: clear. Prescribed Paracetamol 500mg TDS for 3 days.",
  "recommendedActionOverride": "Same-day OPD review. Maintain oral hydration.",
  "status": "Under Review"
}
```

**Response 200 (OK):** Updated `PatientRecord` in `data`.

---

### POST /api/patients/:id/approve  *(or PATCH)*

Approves the patient's triage assessment and consultation.

**Request Body:**
```json
{
  "approvedBy": "Dr. Resident Medical Officer",
  "clinicalNotes": "Clinical notes at time of approval"
}
```

**Response 200 (OK):** Updated `PatientRecord` with `status: "Approved"`, `approvedBy`, and `approvedAt`.

---

## PatientRecord Data Shape

```json
{
  "id": "SC-2026-1715",
  "tokenNumber": "DERM-03",
  "createdAt": "Sep 6, 08:59 AM",
  "name": "hina",
  "age": 21,
  "gender": "Female",
  "symptoms": ["Skin rash", "Itching"],
  "duration": "3 - 5 days",
  "department": "Dermatology",
  "opdRoom": "Room 208 — Dermatology Clinic",
  "analysis": {
    "riskLevel": "Medium",
    "redFlags": [
      "Active widespread cutaneous inflammation; risk of secondary excoriation or contact sensitization"
    ],
    "suggestedDepartment": "Dermatology",
    "possibleConditions": [
      "Allergic Contact Dermatitis",
      "Acute Urticaria",
      "Atopic Eczema Flare"
    ],
    "recommendedAction": "Same-day Consultation at Dermatology OPD. Comprehensive physical exam recommended. Maintain oral hydration and record temperature/skin lesion progression.",
    "shortDoctorSummary": "Patient (hina, 21y Female) presents with Skin rash, Itching of duration [3 - 5 days]. Primary triage indicators align with Dermatology. Risk classified as Medium...",
    "confidenceScore": 94
  },
  "status": "Pending Review",
  "doctorNotes": null,
  "approvedAt": null,
  "approvedBy": null
}
```

---

## Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message description."
}
```
