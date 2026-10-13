# MediNexus AI — Setup Guide (Windows)

All commands are for **Windows PowerShell**. Run them from the folder shown in each step.

## 1. Prerequisites

- **Node.js 18 or newer** (check with `node -v`)
- **PostgreSQL 14 or newer** running on `localhost:5432` (pgAdmin optional)
- The PostgreSQL bin folder on your PATH so that `psql`, `pg_dump` and `createdb` work. If they don't:
  ```powershell
  $env:Path += ";C:\Program Files\PostgreSQL\16\bin"
  ```

## 2. Install dependencies

```powershell
cd "D:\MediNexus AI"
npm install
cd backend
npm install
npx prisma generate
```

## 3. Configure the backend (`backend\.env`)

```powershell
cd "D:\MediNexus AI\backend"
Copy-Item .env.example .env      # only if you don't have a .env yet
notepad .env
```

| Variable | What to put |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/smartcare` |
| `JWT_SECRET` | A random value of **at least 32 characters**. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. The server refuses to start without it, and it also refuses the old value that used to be hard-coded in the source. |
| `JWT_EXPIRES_IN` | Session length, default `8h` |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:4173` |
| `DEMO_DOCTOR_EMAIL` / `DEMO_DOCTOR_PASSWORD` / `DEMO_DOCTOR_NAME` | Your **own** demo doctor login (see step 6). The password needs 12+ characters with letters and numbers. |

| `GEMINI_API_KEY` | **AI features.** Free key from https://aistudio.google.com/apikey (sign in with Google → *Create API key*). Paste it here yourself; never share it in chat or commit it. Leave empty to run without AI. |
| `GEMINI_MODEL` | Default `gemini-2.5-flash`. If Google renames models and you get an AI error, put the current *Flash* model name shown in AI Studio here. |
| `GEMINI_FALLBACK_MODEL` | Default `gemini-2.5-flash-lite` (used automatically when the main model is busy) |
| `GEMINI_TOTAL_BUDGET_MS` | Optional, default `45000`. Max total wait for one AI request; attempts go main → fallback → main, and each is cut short so the total stays within this budget. |

If your `backend\.env` was created before the AI features, add these lines at the end:

```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
```

Check the AI is on: start the backend and open http://localhost:3001/api/triage/options. It should show `"aiEnabled":true`.

`backend\.env` is git-ignored. Never commit it.

## 4. Back up your database, then apply migrations

**Always back up before migrating:**

```powershell
cd "D:\MediNexus AI\backend"
pg_dump -U postgres -h localhost -d smartcare -F c -f smartcare_backup_before_repair.dump
```

Optionally, check what's in the database first (read-only; prints counts only, no personal data):

```powershell
npm run db:inspect
```

Then apply the migrations:

```powershell
npm run db:migrate          # = prisma migrate deploy  (never resets or drops anything)
npm run db:status           # should say "Database schema is up to date"
npm run db:inspect          # check counters, linked/unlinked cases, role audit
```

> ⚠️ Use `db:migrate` (`prisma migrate deploy`). Do **not** use `prisma migrate reset`, and don't accept a reset prompt from `prisma migrate dev`, because a reset deletes all data.

What the repair migration (`20261012090000_security_and_integrity`) does:

- Adds `token_counters` and starts each counter at the **highest token and patient id already in your database**, so no old token is ever reissued.
- Converts `users.role` to `PATIENT | DOCTOR`. Accounts that picked "doctor" on the old public sign-up form were never verified, so they are set to `PATIENT`. Each change is written to `role_change_audit`, so nothing is lost.
- Adds reviewer/approver columns, an idempotency key, a session-revocation counter (`tokenVersion`) and indexes.
- Back-fills a review row for any old patient that was missing one.
- **Drops no tables and deletes or changes no patient rows.**

To undo everything, restore the backup:

```powershell
pg_restore -U postgres -h localhost -d smartcare --clean smartcare_backup_before_repair.dump
```

## 5. Start the application (two terminals)

```powershell
# Terminal 1 — backend (http://localhost:3001)
cd "D:\MediNexus AI\backend"
npm run dev
```

```powershell
# Terminal 2 — frontend (http://localhost:5173)
cd "D:\MediNexus AI"
npm run dev
```

Health check: <http://localhost:3001/api/health>

## 6. Create the demo doctor account

Doctor accounts **cannot** be created through the public sign-up page. They are only created by this script:

1. Set these in `backend\.env` (use your own values; never commit them):
   ```ini
   DEMO_DOCTOR_EMAIL=dr.yourname@yourdomain.pk
   DEMO_DOCTOR_PASSWORD=SomethingLong2026
   DEMO_DOCTOR_NAME=Dr. Your Name
   DEMO_DOCTOR_CNIC=            # optional
   ```
2. Run:
   ```powershell
   cd "D:\MediNexus AI\backend"
   npm run doctor:provision
   ```

The script is safe to run again:

| Situation | Result |
|---|---|
| No account with that email | Creates a **DOCTOR** (bcrypt-hashed password) |
| Already a doctor | Nothing changes; the password is **not** reset |
| Email belongs to a **patient** account | Stops and changes nothing. To promote it, run `npm run doctor:provision -- --promote-existing`. This only works if `DEMO_DOCTOR_PASSWORD` matches that account's current password, and the change is audited. |
| `NODE_ENV=production` | Refuses, unless `ALLOW_DOCTOR_PROVISIONING_IN_PRODUCTION=true` is set deliberately |
| Placeholder or weak password | Refuses |

**Old demo doctor (e.g. `doctor.test@smartcare.com`):** the migration set it to PATIENT, because the old sign-up let anyone pick "doctor". To restore it, put that email and its current password in `DEMO_DOCTOR_EMAIL` / `DEMO_DOCTOR_PASSWORD` and run `npm run doctor:provision -- --promote-existing`.

**Adding a real doctor later:** run the same script with that doctor's details in the environment. Only someone with access to the server's `.env` and shell can do this.

## 7. Logging in

| Who | How | Lands on |
|---|---|---|
| Patient | Register at `/register` (CNIC, name, password), or log in with CNIC or email | `/patient` (My Visits) |
| Doctor | Log in with `DEMO_DOCTOR_EMAIL` + `DEMO_DOCTOR_PASSWORD` | `/doctor` |

## 8. How authorization works

- **Public sign-up only ever creates `PATIENT` accounts.** Any `role` field sent by a browser is ignored.
- Every protected API call needs `Authorization: Bearer <token>`. The server checks the token signature, then **re-reads the user and their role from PostgreSQL on every request**. Editing local storage or the token cannot grant extra rights.
- `/api/doctor/*` is **DOCTOR only** (a patient gets `403`). `/api/patients/*` is for patients, who only ever see **their own** cases (someone else's case returns `404`).
- Logout calls `/api/auth/logout`, which increases `tokenVersion`. Every token issued before that stops working (`401`).
- The frontend also routes by the server-reported role: patients who open `/doctor` are sent to `/patient`, and doctors who open `/patient` are sent to `/doctor`. This is only a convenience; the server enforces the real rules.

## 9. Running the tests

### Backend (unit + API integration, uses a separate test database)

```powershell
createdb -U postgres -h localhost medinexus_test
cd "D:\MediNexus AI\backend"
Copy-Item .env.test.example .env.test   # if .env.test doesn't exist; set your DB password
npm test            # applies migrations to medinexus_test, then runs the tests
npm run typecheck
```

The test runner refuses to start unless `DATABASE_URL` in `.env.test` points to a database whose name ends in `_test`. The tests delete all rows in that database.

### Frontend (unit tests, type check, production build)

```powershell
cd "D:\MediNexus AI"
npm test
npm run typecheck
npm run build
```

### End-to-end (browser) tests

These create real accounts and cases, so run the backend against the **test** database. They use an **offline fake Gemini server** (`e2e/fake-gemini.mjs`), so no API key or quota is needed:

```powershell
# Terminal 0 — fake AI for tests only
cd "D:\MediNexus AI"
node e2e/fake-gemini.mjs

# Terminal 1
cd "D:\MediNexus AI\backend"
$env:ENV_FILE=".env.test"; npm run doctor:provision    # needs DEMO_DOCTOR_* in .env.test
$env:ENV_FILE=".env.test"; $env:GEMINI_API_KEY="fake"; $env:GEMINI_API_BASE="http://localhost:8787/v1beta/models"; $env:GEMINI_FALLBACK_MODEL=""; npm run dev

# Terminal 2
cd "D:\MediNexus AI"
npm run dev

# Terminal 3 (first time only: npx playwright install chromium)
cd "D:\MediNexus AI"
$env:E2E_DOCTOR_EMAIL="<DEMO_DOCTOR_EMAIL from .env.test>"
$env:E2E_DOCTOR_PASSWORD="<DEMO_DOCTOR_PASSWORD from .env.test>"
npm run test:e2e
```

## 10. Production build

```powershell
cd "D:\MediNexus AI\backend"; npm run build; npm start
cd "D:\MediNexus AI"; npm run build; npm run preview
```

Rebuild the backend (`npm run build`) after pulling changes; `backend\dist` holds compiled code and is not updated automatically.

## Troubleshooting

| Problem | Fix |
|---|---|
| "AI assistant is not configured" | `GEMINI_API_KEY` is empty in `backend\.env`. Add it and restart the backend. |
| "The AI service rejected the request…" | Wrong key or model name. Check `GEMINI_API_KEY` / `GEMINI_MODEL`, restart the backend. |
| "AI assistant unavailable" / "Too many AI requests" | Internet down, Google busy or free quota reached. Wait a minute; the rest of the app keeps working. |
| `Configuration error: JWT_SECRET …` | Set a new random `JWT_SECRET` (32+ characters) in `backend\.env` |
| `Cannot reach the MediNexus AI server` | Start the backend (`npm run dev` in `backend`) |
| `Failed to connect to PostgreSQL` | Start the PostgreSQL service; check `DATABASE_URL` |
| Logged out after restarting with a new secret | Expected: old tokens are signed with the old secret. Log in again. |
| Old doctor account now opens the patient page | Expected after the migration. See step 6, `--promote-existing`. |
| `Too many attempts` | Login rate limit (`AUTH_RATE_LIMIT_MAX` per 15 minutes); wait or raise it for local testing |
