/**
 * End-to-end tests for the AI + emergency features.
 * Run against a backend that uses the TEST database and the OFFLINE fake Gemini server
 * (e2e/fake-gemini.mjs) — see SETUP.md "Running the tests". No real AI key or quota is used.
 */
import { expect, test, Page } from '@playwright/test';

const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL || '';
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD || '';
const stamp = (Date.now() + 17).toString().slice(-7);
const patient = { fullName: `AI E2E ${stamp}`, cnic: `35201${stamp.padStart(7, '0')}3`, password: 'Patient2026x' };

async function login(page: Page, identifier: string, password: string, mode: 'patient' | 'doctor' = 'patient') {
  await page.goto('/login');
  await page.click(`#login-mode-${mode}`);
  await page.fill('#login-identifier', identifier);
  await page.fill('#login-password', password);
  await page.click('#login-submit');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'));
}

test.describe.serial('MediNexus AI — AI assistant, emergency rules, documents, doctor summary', () => {
  let emergencyCaseId = '';

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/auth/register', { data: { ...patient, confirmPassword: patient.password } });
    expect(res.status()).toBe(201);
  });

  test('free-text Roman Urdu fills the form; AI suggestions are labelled; rules set the priority', async ({ page }) => {
    await login(page, patient.cnic, patient.password);
    await page.goto('/patient/new');
    await page.fill('#symptom-text', 'mujhe 3 din se bukhar, khansi aur gala kharab hai, umar 34');
    await page.click('#btn-analyze-symptoms');
    await expect(page.locator('#ai-result')).toBeVisible();
    for (const s of ['Fever', 'Cough', 'Sore throat']) {
      await expect(page.locator(`[data-symptom="${s}"]`)).toHaveAttribute('aria-pressed', 'true');
    }
    await expect(page.locator('#patient-age')).toHaveValue('34');
    await expect(page.locator('#ai-conditions')).toContainText('Viral upper respiratory infection');
    await expect(page.locator('#ai-result')).toContainText('not a diagnosis');
    // The server-side safety filter removed the medicine + dose line the model returned.
    await expect(page.locator('body')).not.toContainText(/paracetamol|500 mg/i);
    await expect(page.locator('body')).not.toContainText(/confidence/i);
    await expect(page.locator('#emergency-alert')).toHaveCount(0);

    await page.selectOption('#patient-gender', 'Female');
    await page.click('#btn-start-ai-check');
    await expect(page.locator('#token-number')).toHaveText(/^GM-\d+$/);
    await expect(page.locator('#emergency-banner')).toHaveCount(0);
  });

  test('emergency phrase triggers the rule-based alert even when the AI is down', async ({ page }) => {
    await login(page, patient.cnic, patient.password);
    await page.goto('/patient/new');
    await page.fill('#symptom-text', 'kal se seene mein dard hai FORCE_AI_DOWN');
    await page.click('#btn-analyze-symptoms');
    await expect(page.locator('#emergency-alert')).toBeVisible();
    await expect(page.locator('#emergency-alert')).toContainText('Chest pain');
    await expect(page.locator('#emergency-alert')).toContainText('1122');
    await page.click('#btn-emergency-continue');
    await expect(page.locator('#ai-unavailable')).toBeVisible();
    await expect(page.locator('[data-danger-sign="chest_pain"]')).toBeChecked();

    await page.fill('#patient-age', '58');
    await page.selectOption('#patient-gender', 'Male');
    await page.click('[data-symptom="Fever"]');
    await page.click('button:has-text("1 - 2 days")');
    await page.click('#btn-start-ai-check');
    await expect(page.locator('#emergency-banner')).toBeVisible();
    await expect(page.locator('#risk-label')).toContainText('HIGH');
    emergencyCaseId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!);

    await page.goto(`/patient/cases/${encodeURIComponent(emergencyCaseId)}/parchi`);
    await expect(page.locator('#emergency-banner')).toBeVisible();
  });

  test('ticking a danger sign shows the alert immediately (no AI involved)', async ({ page }) => {
    await login(page, patient.cnic, patient.password);
    await page.goto('/patient/new');
    await page.check('[data-danger-sign="breathing"]');
    await expect(page.locator('#emergency-alert')).toContainText('Severe difficulty breathing');
    await page.click('text=I will go to Emergency now');
    await expect(page).toHaveURL(/\/patient$/);
  });

  test('report explainer shows values with flags and the AI notice', async ({ page }) => {
    await login(page, patient.cnic, patient.password);
    await page.click('#btn-documents');
    await expect(page).toHaveURL(/\/patient\/documents$/);
    await page.fill('#doc-text', 'CBC: Haemoglobin 9.8 g/dL (12.0 - 16.0)');
    await page.click('#btn-explain');
    await expect(page.locator('#doc-tests')).toContainText('Haemoglobin');
    await expect(page.locator('#doc-tests')).toContainText(/low/i);
    await expect(page.locator('#doc-result')).toContainText('not a diagnosis');
  });

  test('doctor sees the emergency case first and generates an AI summary', async ({ page }) => {
    test.skip(!DOCTOR_EMAIL || !DOCTOR_PASSWORD, 'Set E2E_DOCTOR_EMAIL / E2E_DOCTOR_PASSWORD to run the doctor test.');
    await login(page, DOCTOR_EMAIL, DOCTOR_PASSWORD, 'doctor');
    await expect(page).toHaveURL(/\/doctor$/);
    const first = page.locator('tbody tr[data-case-id]').first();
    await expect(first).toHaveAttribute('data-case-id', emergencyCaseId);
    await expect(first.locator('[data-emergency="true"]')).toBeVisible();
    await first.click();
    await expect(page.locator('#review-modal')).toContainText('Emergency danger sign reported');
    await page.click('#btn-ai-summary');
    await expect(page.locator('#ai-summary')).toContainText('S — Situation');
    await expect(page.locator('#ai-summary')).toContainText('verify before use');
  });
});
