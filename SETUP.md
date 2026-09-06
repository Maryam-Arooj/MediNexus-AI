# MediNexus AI — Setup Guide

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** running locally on port 5432
- A PostgreSQL database named `smartcare` (created automatically by Prisma migrate if permissions allow)

---

## 1. Clone and Install

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

---

## 2. Configure Environment

Copy the example env file and fill in your PostgreSQL credentials:

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Edit `backend/.env`:
```ini
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/smartcare
PORT=3001
JWT_SECRET=your_secure_random_jwt_secret_here
```

> **Never commit `.env` to git.** It is strictly listed in `.gitignore`. A secure default key is used if `JWT_SECRET` is left blank.

---

## 3. Database Setup

```bash
cd backend

# Generate Prisma client + apply migrations
npx prisma migrate dev

# Seed database verification (idempotent)
npm run db:seed
```

---

## 4. Start the Backend

```bash
cd backend
npm run dev
```

Expected output:
```
✅ PostgreSQL connected
🚀 MediNexus AI backend running at http://localhost:3001
   Health: http://localhost:3001/api/health
   Patients: http://localhost:3001/api/patients
```

Verify: Open `http://localhost:3001/api/health` — should return:
```json
{
  "success": true,
  "status": "ok",
  "api": "MediNexus AI Backend",
  "database": "PostgreSQL — connected"
}
```

---

## 5. Start the Frontend

In a **separate terminal**, from the project root:

```bash
npm run dev
```

Open `http://localhost:5173`.

The Vite development server automatically proxies `/api/*` requests to the Express backend on port 3001.

---

## 6. Quick Verification Walkthrough

1. **Splash Screen:** Open `http://localhost:5173` — displays the 3-second animated MediNexus AI branding screen.
2. **Account Registration:** Click **Register** on the Login screen, choose **Patient** or **Doctor**, fill out the form, and register.
3. **Login:** Log in with your newly registered CNIC or Email + Password.
4. **Role Selection:** Select **Patient** to enter the OPD Pre-Registration flow or **Doctor** to enter the Doctor Dashboard.
5. **Patient Pre-Registration:** On Screen 1, enter symptoms (or click the quick "Fever Case" demo button) and click **Start AI Check**.
6. **AI Triage & Slip:** Inspect the AI Triage Assessment on Screen 2, then generate and print the Digital Parchi on Screen 3.
7. **Doctor Review:** Log out and log in using doctor credentials, open the Doctor Dashboard (Screen 4), open the patient report, edit clinical notes, and click **Approve Triage**.
8. **Persistence:** Refresh the browser — all patient records, doctor notes, and approvals remain persisted in PostgreSQL.

---

## Production Build

```bash
# Backend TypeScript compile
cd backend
npm run build
npm start

# Frontend production build
cd ..
npm run build
npm run preview   # serves dist/ on port 4173
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot reach the MediNexus AI backend` | Ensure the backend server is running on port 3001 (`npm run dev` in `backend/`) |
| `Failed to connect to PostgreSQL` | Verify local PostgreSQL service is started and credentials in `backend/.env` match |
| `Migration failed` | Ensure the database exists and your PostgreSQL user has `CREATE` privileges |
| Port 5173 in use | Vite will automatically select the next available port (e.g. 5174) |
| `Invalid credentials` | Verify you typed the exact CNIC or Email and password used during registration |

---

## Project Structure

```
MediNexus-AI/
├── src/                          # React frontend
│   ├── components/               # Clinical screens (1-4) & Navbar
│   │   └── auth/                 # Splash, Login, Register, RoleSelect
│   ├── context/                  # AuthContext (JWT session management)
│   ├── api/                      # client.ts (REST API client)
│   ├── types/                    # TypeScript interfaces (medical, auth)
│   └── data/                     # Mock symptom categories & duration options
├── backend/
│   ├── prisma/                   # schema.prisma, migrations, seed.ts
│   └── src/
│       ├── controllers/          # auth & patients controllers
│       ├── routes/               # /api/health, /api/auth, /api/patients
│       ├── middleware/           # authMiddleware, errorHandler
│       ├── services/             # patients.service.ts
│       └── triage/               # evaluateMedicalTriage.ts
├── README.md                     # Main project overview
├── USER_GUIDE.md                 # Complete step-by-step user manual
├── SETUP.md                      # This file
├── REQUIREMENTS.md               # Functional & non-functional requirements
├── ARCHITECTURE.md               # System architecture & component design
├── API.md                        # REST API endpoint reference
└── DATABASE.md                   # Database schema & Prisma models
```
