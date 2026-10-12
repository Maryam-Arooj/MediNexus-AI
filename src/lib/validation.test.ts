import { describe, expect, it } from 'vitest';
import { formatCnicInput, validateCase, validateRegistration } from './validation';
import { matchPath } from './router';

const ok = { fullName: 'Hina Fatima', cnic: '35202-1234567-1', phone: '', email: '', password: 'Abcdef12', confirmPassword: 'Abcdef12' };

describe('client-side validation', () => {
  it('formats CNIC as the user types', () => {
    expect(formatCnicInput('3520212345671')).toBe('35202-1234567-1');
    expect(formatCnicInput('35202')).toBe('35202');
    expect(formatCnicInput('352021')).toBe('35202-1');
    expect(formatCnicInput('35202-1234567-1999')).toBe('35202-1234567-1');
  });

  it('validates registration fields', () => {
    expect(validateRegistration(ok)).toBeNull();
    expect(validateRegistration({ ...ok, cnic: '123' })).toMatch(/CNIC/);
    expect(validateRegistration({ ...ok, phone: '12345' })).toMatch(/Phone/);
    expect(validateRegistration({ ...ok, phone: '+92 300 1234567' })).toBeNull();
    expect(validateRegistration({ ...ok, email: 'bad' })).toMatch(/email/);
    expect(validateRegistration({ ...ok, password: 'short1', confirmPassword: 'short1' })).toMatch(/8 characters/);
    expect(validateRegistration({ ...ok, password: 'abcdefgh', confirmPassword: 'abcdefgh' })).toMatch(/number/);
    expect(validateRegistration({ ...ok, confirmPassword: 'x' })).toMatch(/match/);
  });

  it('validates the case form', () => {
    const c = { age: 30 as number | '', gender: 'Male', symptoms: ['Fever'], duration: '1 - 2 days' };
    expect(validateCase(c)).toBeNull();
    expect(validateCase({ ...c, age: '' })).toMatch(/age/);
    expect(validateCase({ ...c, age: 25.5 })).toMatch(/age/);
    expect(validateCase({ ...c, age: 121 })).toMatch(/age/);
    expect(validateCase({ ...c, gender: '' })).toMatch(/gender/);
    expect(validateCase({ ...c, symptoms: [] })).toMatch(/symptom/);
    expect(validateCase({ ...c, duration: '' })).toMatch(/how long/);
  });

  it('matches routes', () => {
    expect(matchPath('/patient/cases/:id/parchi', '/patient/cases/SC-2026-0001/parchi')).toEqual({ id: 'SC-2026-0001' });
    expect(matchPath('/patient/cases/:id', '/patient/cases/SC-2026-0001/parchi')).toBeNull();
  });
});
