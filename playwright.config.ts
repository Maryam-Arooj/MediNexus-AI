import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests drive the real UI against a running backend + frontend.
 * ⚠️ They create accounts and cases, so the backend MUST be using a test database
 *    (see "Running the tests" in SETUP.md). Doctor credentials come from E2E_DOCTOR_EMAIL /
 *    E2E_DOCTOR_PASSWORD (provision that doctor first with `npm run doctor:provision`).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
