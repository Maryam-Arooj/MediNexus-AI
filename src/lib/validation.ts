/** Client-side checks that mirror the server's validation (the server re-validates everything). */

export function formatCnicInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export const isValidCnic = (v: string) => /^\d{13}$/.test(v.replace(/[\s-]/g, ''));
export const isValidPkMobile = (v: string) => /^(?:\+?92|0)3\d{9}$/.test(v.replace(/[\s()-]/g, ''));
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw.length > 72) return 'Password must be at most 72 characters.';
  if (!/[A-Za-z]/.test(pw)) return 'Password must contain at least one letter.';
  if (!/\d/.test(pw)) return 'Password must contain at least one number.';
  return null;
}

export interface RegisterFields {
  fullName: string;
  cnic: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateRegistration(f: RegisterFields): string | null {
  if (f.fullName.trim().length < 2) return 'Please enter your full name.';
  if (!isValidCnic(f.cnic)) return 'CNIC must be 13 digits, e.g. 35202-1234567-1.';
  if (f.phone.trim() && !isValidPkMobile(f.phone)) return 'Phone must be a Pakistani mobile number, e.g. 03001234567.';
  if (f.email.trim() && !isValidEmail(f.email)) return 'Please enter a valid email address.';
  const pw = passwordProblem(f.password);
  if (pw) return pw;
  if (f.password !== f.confirmPassword) return 'Passwords do not match.';
  return null;
}

export function validateCase(input: { age: number | ''; gender: string; symptoms: string[]; duration: string }): string | null {
  if (input.age === '' || !Number.isInteger(Number(input.age)) || Number(input.age) < 1 || Number(input.age) > 120) {
    return 'Please provide a valid age (whole number between 1 and 120).';
  }
  if (!input.gender) return 'Please select a gender.';
  if (input.symptoms.length === 0) return 'Please select at least one symptom.';
  if (!input.duration) return 'Please select how long you have had the symptoms.';
  return null;
}
