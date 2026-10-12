import { describe, expect, it } from 'vitest';
import { resolveAccess } from './routeAccess';

describe('frontend route guard', () => {
  it('sends logged-out users to /login for every protected page', () => {
    for (const p of ['/patient', '/patient/new', '/patient/cases/SC-2026-0001', '/doctor', '/anything']) {
      expect(resolveAccess(p, null)).toBe('/login');
    }
    expect(resolveAccess('/login', null)).toBeNull();
    expect(resolveAccess('/register', null)).toBeNull();
    expect(resolveAccess('/', null)).toBeNull();
  });

  it('patients can open patient pages but are redirected away from the doctor dashboard', () => {
    expect(resolveAccess('/patient', 'PATIENT')).toBeNull();
    expect(resolveAccess('/patient/cases/SC-2026-0001/parchi', 'PATIENT')).toBeNull();
    expect(resolveAccess('/patient/documents', 'PATIENT')).toBeNull();
    expect(resolveAccess('/patient/documents', 'DOCTOR')).toBe('/doctor');
    expect(resolveAccess('/patient/documents', null)).toBe('/login');
    expect(resolveAccess('/doctor', 'PATIENT')).toBe('/patient');
    expect(resolveAccess('/doctor/anything', 'PATIENT')).toBe('/patient');
  });

  it('doctors can open the doctor dashboard but not the patient pages', () => {
    expect(resolveAccess('/doctor', 'DOCTOR')).toBeNull();
    expect(resolveAccess('/patient', 'DOCTOR')).toBe('/doctor');
    expect(resolveAccess('/patient/new', 'DOCTOR')).toBe('/doctor');
  });

  it('logged-in users visiting login/register/root go to their own dashboard', () => {
    expect(resolveAccess('/login', 'PATIENT')).toBe('/patient');
    expect(resolveAccess('/register', 'DOCTOR')).toBe('/doctor');
    expect(resolveAccess('/', 'DOCTOR')).toBe('/doctor');
  });
});
