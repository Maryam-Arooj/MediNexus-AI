import { describe, expect, it } from 'vitest';
import { roleMismatchMessage, validateLoginInput } from './loginMode';

describe('login mode', () => {
  it('patient mode accepts CNIC or email', () => {
    expect(validateLoginInput('PATIENT', '35202-1234567-1', 'x')).toBeNull();
    expect(validateLoginInput('PATIENT', 'me@mail.pk', 'x')).toBeNull();
    expect(validateLoginInput('PATIENT', '', 'x')).toMatch(/CNIC\/Email/);
    expect(validateLoginInput('PATIENT', 'me@mail.pk', '')).toMatch(/CNIC\/Email/);
  });

  it('doctor mode accepts email only', () => {
    expect(validateLoginInput('DOCTOR', 'dr@hospital.pk', 'x')).toBeNull();
    expect(validateLoginInput('DOCTOR', '35202-1234567-1', 'x')).toMatch(/email address/);
    expect(validateLoginInput('DOCTOR', '', '')).toMatch(/doctor email/);
  });

  it('flags a mismatch between the selected mode and the server role', () => {
    expect(roleMismatchMessage('PATIENT', 'PATIENT')).toBeNull();
    expect(roleMismatchMessage('DOCTOR', 'DOCTOR')).toBeNull();
    expect(roleMismatchMessage('DOCTOR', 'PATIENT')).toMatch(/not a doctor account/);
    expect(roleMismatchMessage('PATIENT', 'DOCTOR')).toMatch(/doctor account/);
  });
});
