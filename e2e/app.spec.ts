import { expect, test, Page } from '@playwright/test';

const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL || '';
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD || '';
const stamp = Date.now().toString().slice(-7);
const patient = {
  name: `E2E Patient ${stamp}`,
  cnic: `35202${stamp.padStart(7, '0')}9`,
  password: 'Patient2026x',
};

async function login(page: Page, identifier: string, password: string, mode: 'patient' | 'doctor' = 'patient') {
  await page.goto('/login');
  await page.click(`#login-mode-${mode}`);
  await page.fill('#login-identifier', identifier);
  await page.fill('#login-password', password);
  await page.click('#login-submit');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'));
}

async function logout(page: Page) {
  await page.click('#navbar-logout');
  await expect(page).toHaveURL(/\/login$/);
}

test.describe.serial('MediNexus AI — patient & doctor workflows', () => {
  let caseId = '';
  let token = '';

  test('patient registers and lands ONLY on the patient dashboard', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('#role-doctor')).toHaveCount(0); // no doctor sign-up option
    await page.fill('#reg-fullname', patient.name);
    await page.fill('#reg-cnic', patient.cnic);
    await expect(page.locator('#reg-cnic')).toHaveValue(/^\d{5}-\d{7}-\d$/);
    await page.fill('#reg-password', patient.password);
    await page.fill('#reg-confirm-password', patient.password);
    await page.check('#reg-terms');
    await page.click('#register-submit');
    await expect(page).toHaveURL(/\/patient$/);
    await expect(page.locator('#navbar-user')).toContainText('Patient');
    await expect(page.locator('#nav-doctor')).toHaveCount(0);
  });

  test('patient submits an assessment (double click creates one case), edits it, prints the parchi', async ({ page }) => {
    await login(page, patient.cnic, patient.password);
    await expect(page).toHaveURL(/\/patient$/);
    await page.click('#btn-new-assessment');
    await page.fill('#patient-age', '34');
    await page.selectOption('#patient-gender', 'Female');
    await page.click('[data-symptom="Skin rash"]');
    await page.click('[data-symptom="Itching"]');
    await page.click('button:has-text("3 - 5 days")');
    await page.locator('#btn-start-ai-check').dblclick();
    await expect(page).toHaveURL(/\/patient\/cases\/SC-\d{4}-\d+$/);
    caseId = page.url().split('/').pop()!;
    await expect(page.locator('#token-number')).toHaveText(/^DERM-\d+$/);
    await expect(page.locator('body')).not.toContainText(/confidence|0\.4s|~70%/i);

    // Edit symptoms: form is prefilled and saving keeps the same case id.
    await page.click('#btn-edit-symptoms');
    await expect(page.locator('#patient-age')).toHaveValue('34');
    await expect(page.locator('[data-symptom="Skin rash"]')).toHaveAttribute('aria-pressed', 'true');
    await page.click('[data-symptom="Minor skin infection"]');
    await page.click('#btn-start-ai-check');
    await expect(page).toHaveURL(new RegExp(`/patient/cases/${caseId}$`));
    await expect(page.locator('#risk-label')).toContainText('HIGH');

    await page.goto('/patient');
    await expect(page.locator('#my-cases [data-case-id]')).toHaveCount(1);

    // Parchi shows real data; print hides navigation and keeps the slip.
    await page.goto(`/patient/cases/${caseId}/parchi`);
    await expect(page.locator('#parchi-patient-id')).toHaveText(caseId);
    await expect(page.locator('#parchi-status [data-status]')).toHaveAttribute('data-status', 'Pending Review');
    await page.evaluate(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => { (window as unknown as { __printed: number }).__printed++; };
    });
    await page.click('#btn-print-parchi');
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('header')).toBeHidden();
    await expect(page.locator('#parchi-card')).toBeVisible();
    await page.emulateMedia({ media: 'screen' });

    token = await page.evaluate(() => localStorage.getItem('medinexus_token') || '');
    expect(token).not.toBe('');
  });

  test('patient cannot reach the doctor dashboard or doctor APIs', async ({ page, request }) => {
    await login(page, patient.cnic, patient.password);
    await expect(page).toHaveURL(/\/patient$/);
    await page.goto('/doctor');
    await expect(page).toHaveURL(/\/patient$/);
    // Tampering with local storage cannot grant a role — the role comes from the server.
    await page.evaluate(() => localStorage.setItem('role', 'DOCTOR'));
    await page.goto('/doctor');
    await expect(page).toHaveURL(/\/patient$/);

    const auth = { Authorization: `Bearer ${token}` };
    expect((await request.get('/api/doctor/patients', { headers: auth })).status()).toBe(403);
    expect((await request.post(`/api/doctor/patients/${caseId}/approve`, { headers: auth, data: {} })).status()).toBe(403);
    expect((await request.get('/api/doctor/patients')).status()).toBe(401);
  });

  test('logout ends the session on the server and in the UI', async ({ page, request }) => {
    await login(page, patient.cnic, patient.password);
    await expect(page).toHaveURL(/\/patient$/);
    const t = await page.evaluate(() => localStorage.getItem('medinexus_token'));
    await logout(page);
    await page.goto('/patient');
    await expect(page).toHaveURL(/\/login$/);
    expect((await request.get('/api/patients/mine', { headers: { Authorization: `Bearer ${t}` } })).status()).toBe(401);
  });

  test('login page Patient/Doctor selector: register link, email-only doctor mode, role mismatch is blocked', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#login-mode-patient')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#go-to-register')).toBeVisible();
    await page.click('#login-mode-doctor');
    await expect(page.locator('#go-to-register')).toHaveCount(0);
    await expect(page.locator('#doctor-login-note')).toBeVisible();

    // Doctor mode rejects a CNIC before calling the server.
    await page.fill('#login-identifier', patient.cnic);
    await page.fill('#login-password', patient.password);
    await page.click('#login-submit');
    await expect(page.locator('text=Doctors sign in with their email address.')).toBeVisible();

    // A patient account in Doctor mode is refused and no session is stored.
    const email = `e2e.${stamp}@patient.pk`;
    await page.click('#login-mode-patient');
    await page.click('#go-to-register');
    await page.fill('#reg-fullname', 'E2E Email Patient');
    await page.fill('#reg-cnic', `35203${stamp.padStart(7, '0')}8`);
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', patient.password);
    await page.fill('#reg-confirm-password', patient.password);
    await page.check('#reg-terms');
    await page.click('#register-submit');
    await expect(page).toHaveURL(/\/patient$/);
    await logout(page);
    await page.click('#login-mode-doctor');
    await page.fill('#login-identifier', email);
    await page.fill('#login-password', patient.password);
    await page.click('#login-submit');
    await expect(page.locator('text=This is not a doctor account')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('medinexus_token'))).toBeNull();
    await page.goto('/doctor');
    await expect(page).toHaveURL(/\/login$/);

    // A doctor account in Patient mode is refused too.
    if (DOCTOR_EMAIL && DOCTOR_PASSWORD) {
      await page.click('#login-mode-patient');
      await page.fill('#login-identifier', DOCTOR_EMAIL);
      await page.fill('#login-password', DOCTOR_PASSWORD);
      await page.click('#login-submit');
      await expect(page.locator('text=This is a doctor account')).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      expect(await page.evaluate(() => localStorage.getItem('medinexus_token'))).toBeNull();
    }
  });

  test('doctor logs in, finds the case, adds notes, approves; patient sees the approval', async ({ page }) => {
    test.skip(!DOCTOR_EMAIL || !DOCTOR_PASSWORD, 'Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD');
    await login(page, DOCTOR_EMAIL, DOCTOR_PASSWORD, 'doctor');
    await expect(page).toHaveURL(/\/doctor$/);
    await expect(page.locator('#navbar-user')).toContainText('Doctor');
    await page.goto('/patient');
    await expect(page).toHaveURL(/\/doctor$/); // doctors are kept out of patient pages

    await page.fill('#queue-search', caseId);
    await expect(page.locator('#queue-table tbody tr[data-case-id]')).toHaveCount(1);
    await page.click('[data-filter-dept="General Medicine"]');
    await expect(page.locator('#queue-table tbody tr[data-case-id]')).toHaveCount(0);
    await page.click('[data-filter-dept="Dermatology"]');
    await page.click(`tr[data-case-id="${caseId}"]`);
    await expect(page.locator('#review-modal')).toBeVisible();

    await page.click('#btn-edit-plan');
    await page.fill('#edit-notes', 'Infected lesion on forearm. Topical antibiotic prescribed.');
    await page.click('#btn-save-review');
    await expect(page.locator('#modal-notes')).toContainText('Topical antibiotic');
    await expect(page.locator('#modal-status [data-status]')).toHaveAttribute('data-status', 'Under Review');

    await page.click('#btn-approve-report');
    await expect(page.locator('#modal-status [data-status]')).toHaveAttribute('data-status', 'Approved');
    await expect(page.locator('#modal-approved-by')).toContainText('Approved by');

    // Persists after reload.
    await page.reload();
    await page.fill('#queue-search', caseId);
    await page.click(`tr[data-case-id="${caseId}"]`);
    await expect(page.locator('#modal-status [data-status]')).toHaveAttribute('data-status', 'Approved');
    await page.click('button:has-text("Close")');
    await logout(page);

    // Patient's parchi now shows the approval (but not the doctor's private notes).
    await login(page, patient.cnic, patient.password);
    await page.goto(`/patient/cases/${caseId}/parchi`);
    await expect(page.locator('#parchi-status [data-status]')).toHaveAttribute('data-status', 'Approved');
    await expect(page.locator('#parchi-card')).not.toContainText('Topical antibiotic');
    await page.goto(`/patient/cases/${caseId}`);
    await expect(page.locator('#btn-edit-symptoms')).toHaveCount(0); // locked after review
  });
});
