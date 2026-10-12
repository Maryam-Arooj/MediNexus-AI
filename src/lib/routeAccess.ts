import type { UserRole } from '../types/auth';

/**
 * Frontend route guard (UX only — the backend enforces the same rules on every API call).
 * Returns null when the user may view `path`, otherwise the path to redirect to.
 */
export function homeFor(role: UserRole): string {
  return role === 'DOCTOR' ? '/doctor' : '/patient';
}

export function resolveAccess(path: string, role: UserRole | null): string | null {
  const p = path.replace(/\/+$/, '') || '/';
  const isPublic = p === '/login' || p === '/register';

  if (p === '/') return role ? homeFor(role) : null; // splash, then login
  if (isPublic) return role ? homeFor(role) : null;
  if (!role) return '/login';

  if (p === '/patient' || p.startsWith('/patient/')) return role === 'PATIENT' ? null : homeFor(role);
  if (p === '/doctor' || p.startsWith('/doctor/')) return role === 'DOCTOR' ? null : homeFor(role);
  return homeFor(role); // unknown path
}
