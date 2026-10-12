import type { UserRole } from '../types/auth';
import { isValidEmail } from './validation';

/**
 * The Patient / Doctor choice on the login page. It only changes the form and adds a safety check;
 * it never grants anything. The role that matters is the one the backend returns (and re-checks on
 * every API call).
 */
export type LoginMode = UserRole; // 'PATIENT' | 'DOCTOR'

export function validateLoginInput(mode: LoginMode, identifier: string, password: string): string | null {
  const id = identifier.trim();
  if (mode === 'DOCTOR') {
    if (!id || !password) return 'Please enter your doctor email and password.';
    if (!isValidEmail(id)) return 'Doctors sign in with their email address.';
    return null;
  }
  if (!id || !password) return 'Please enter your CNIC/Email and password.';
  return null;
}

/** Returns an error message when the server-verified role does not match the selected mode. */
export function roleMismatchMessage(mode: LoginMode, serverRole: UserRole): string | null {
  if (mode === serverRole) return null;
  return mode === 'DOCTOR'
    ? 'This is not a doctor account. Please use the Patient option to sign in.'
    : 'This is a doctor account. Please use the Doctor option to sign in.';
}
