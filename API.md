# SmartCare — API Reference

Base URL: `http://localhost:3001/api`

All responses use JSON with a `success` boolean. Successful responses include `data`; errors include `error`.

---

## GET /api/health

Check API and PostgreSQL connectivity.

**Response 200:**
```json
{
  "success": true,
  "status": "ok",
  "api": "SmartCare Backend",
  "database": "PostgreSQL — connected",
  "timestamp": "2026-09-05T10:00:00.000Z"
}
```

**Response 503** (database unreachable):
```json
{
  "success": false,
  "status": "error",
  "database": "PostgreSQL — disconnected",
  "error": "..."
}
```

---

## POST /api/patients

Register a patient, run deterministic triage, save to PostgreSQL.

**Request body:**
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
| name | string | No | Defaults to "Anonymous Patient" |
| age | number | Yes | 1–120 |
| gender | string | Yes | Male / Female / Other |
| symptoms | string[] | Yes | At least one |
| duration | string | Yes | One of duration options |

**Response 201:** Full `PatientRecord` in `data`.

**Response 400:** Validation error.

---

## GET /api/patients

List all patients with triage and review data, newest first.

**Response 200:**
```json
{
  "success": true,
  "data": [ /* PatientRecord[] */ ]
}
```

---

## GET /api/patients/:id

Get a single patient by `patientId` (e.g. `SC-2026-0841`).

**Response 200:** Single `PatientRecord` in `data`.

**Response 404:** Patient not found.

---

## PUT /api/patients/:id/review

Save doctor clinical notes and optional action override.

**Request body:**
```json
{
  "clinicalNotes": "Examined pharynx: mild cobblestoning...",
  "recommendedActionOverride": "Custom action plan",
  "status": "Under Review"
}
```

**Response 200:** Updated `PatientRecord` in `data`.

---

## POST /api/patients/:id/approve

Approve triage for a patient.

**Request body:**
```json
{
  "approvedBy": "Dr. Resident Medical Officer",
  "clinicalNotes": "Optional notes at approval time"
}
```

**Response 200:** Updated `PatientRecord` with `status: "Approved"`, `approvedBy`, `approvedAt`.

---

## PatientRecord Shape

```json
{
  "id": "SC-2026-0841",
  "tokenNumber": "GM-042",
  "createdAt": "Sep 5, 03:15 PM",
  "name": "Ramesh Verma",
  "age": 54,
  "gender": "Male",
  "symptoms": ["Fever", "Cough", "Body pain"],
  "duration": "1 - 2 weeks",
  "department": "General Medicine",
  "opdRoom": "Room 104 — General Medicine OPD",
  "analysis": {
    "riskLevel": "High",
    "redFlags": ["..."],
    "suggestedDepartment": "General Medicine",
    "possibleConditions": ["..."],
    "recommendedAction": "...",
    "shortDoctorSummary": "...",
    "confidenceScore": 94
  },
  "status": "Pending Review",
  "doctorNotes": null,
  "approvedAt": null,
  "approvedBy": null
}
```

---

## Error Format

```json
{
  "success": false,
  "error": "Valid age between 1 and 120 is required."
}
```
