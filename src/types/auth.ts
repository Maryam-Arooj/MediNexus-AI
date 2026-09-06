export type UserRole = 'patient' | 'doctor';

export interface AuthUser {
  id: string;
  fullName: string;
  cnic: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
