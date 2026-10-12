/** Roles come from the server (GET /api/auth/me). The frontend never decides a user's role. */
export type UserRole = 'PATIENT' | 'DOCTOR';

export interface AuthUser {
  id: string;
  fullName: string;
  cnic: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}

export interface LoginInput {
  identifier: string; // CNIC or email
  password: string;
}

export interface RegisterInput {
  fullName: string;
  cnic: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
