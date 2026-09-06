/**
 * SmartCare API Client
 * All calls to the backend Express server.
 * If backend is unavailable, throws an error — NO silent fallback to mock data.
 */

import { PatientRecord, PatientRegistrationInput } from '../types/medical';
import { AuthUser, AuthResponse, LoginInput, RegisterInput } from '../types/auth';

const API_BASE = '/api';

// ─── Token helpers ────────────────────────────────────────────────────────────

const TOKEN_KEY = 'smartcare_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
    });
  } catch {
    throw new Error(
      'Cannot reach the MediNexus AI backend. Make sure the backend server is running on port 3001.'
    );
  }

  const body: ApiResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.error || `Server error: ${res.status}`);
  }

  return body.data as T;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export async function authRegister(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function authLogin(input: LoginInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function authMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me');
}

export async function authLogout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
  clearToken();
}

// ─── Patient API ──────────────────────────────────────────────────────────────

/**
 * POST /api/patients
 * Registers a patient, runs deterministic triage on the backend,
 * saves to PostgreSQL, returns a full PatientRecord.
 */
export async function registerPatient(
  input: PatientRegistrationInput
): Promise<PatientRecord> {
  return apiFetch<PatientRecord>('/patients', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      age: input.age,
      gender: input.gender,
      symptoms: input.symptoms,
      duration: input.duration,
    }),
  });
}

/**
 * GET /api/patients
 * Returns all patients from PostgreSQL for the Doctor Dashboard.
 */
export async function fetchAllPatients(): Promise<PatientRecord[]> {
  return apiFetch<PatientRecord[]>('/patients');
}

/**
 * GET /api/patients/:id
 * Returns a single patient record by patientId (e.g. "SC-2026-1042").
 */
export async function fetchPatient(patientId: string): Promise<PatientRecord> {
  return apiFetch<PatientRecord>(`/patients/${patientId}`);
}

/**
 * PUT /api/patients/:id/review
 * Saves doctor edits (notes + action override) to PostgreSQL.
 */
export async function savePatientReview(
  patientId: string,
  data: {
    clinicalNotes?: string;
    recommendedActionOverride?: string;
    status?: string;
  }
): Promise<PatientRecord> {
  return apiFetch<PatientRecord>(`/patients/${patientId}/review`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * POST /api/patients/:id/approve
 * Approves the triage for a patient, saves to PostgreSQL.
 */
export async function approvePatient(
  patientId: string,
  data: { approvedBy?: string; clinicalNotes?: string }
): Promise<PatientRecord> {
  return apiFetch<PatientRecord>(`/patients/${patientId}/approve`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * GET /api/health
 * Checks if backend and PostgreSQL are reachable.
 */
export async function checkHealth(): Promise<{ status: string; database: string }> {
  return apiFetch('/health');
}
