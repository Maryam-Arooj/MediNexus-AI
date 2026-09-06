# SmartCare — Setup Guide

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
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/smartcare
PORT=3001
```

> **Never commit `.env` to git.** It is listed in `.gitignore`.

---

## 3. Database Setup

```bash
cd backend

# Generate Prisma client + apply migrations
npx prisma migrate dev

# Seed 4 demo patients (idempotent)
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
🚀 SmartCare backend running at http://localhost:3001
```

Verify: open `http://localhost:3001/api/health` — should show `"database": "PostgreSQL — connected"`.

---

## 5. Start the Frontend

In a **separate terminal**, from the project root:

```bash
npm run dev
```

Open `http://localhost:5173`.

The Vite dev server proxies `/api/*` requests to the backend on port 3001.

---

## 6. Quick Verification

1. **Health check:** `GET http://localhost:3001/api/health`
2. **Dashboard:** Navigate to Screen 4 — should show 4 seeded patients
3. **Register:** Submit Screen 1 form or click "Fever Case" demo — creates a real DB record
4. **Refresh browser** — dashboard still shows all patients
5. **Doctor review:** Open a report, edit notes, approve — persists after refresh

---

## Production Build

```bash
# Backend TypeScript compile
cd backend
npm run build
npm start

# Frontend build
cd ..
npm run build
npm run preview   # serves dist/ on port 4173
```

For production, configure your reverse proxy to forward `/api` to the backend.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot reach the SmartCare backend` | Ensure backend is running on port 3001 |
| `Failed to connect to PostgreSQL` | Check PostgreSQL is running; verify `DATABASE_URL` |
| `Migration failed` | Ensure database exists and user has CREATE privileges |
| Port 5173 in use | Vite will try the next available port |
| Empty dashboard | Run `npm run db:seed` in backend |

---

## Project Structure

```
SmartCare/
├── src/                  # React frontend
├── backend/
│   ├── prisma/           # Schema, migrations, seed
│   └── src/              # Express API
├── README.md
├── SETUP.md              # This file
├── REQUIREMENTS.md
├── ARCHITECTURE.md
├── API.md
└── DATABASE.md
```
