/**
 * MediNexus AI API client. All calls go to the Express backend via the Vite /api proxy.
 * The JWT is only a session credential — authorization is always enforced by the server.
 */
import { CaseFormInput, PatientRecord, TriageOptions } from '../types/medical';
import { AuthResponse, AuthUser, LoginInput, RegisterInput } from '../types/auth';

const API_BASE = '/api';
const TOKEN_KEY = 'medinexus_token';
export const UNAUTHORIZED_EVENT = 'medinexus:unauthorized';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('smartcare_token'); // legacy key from older builds
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string>) {
    super(message);
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
      },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the MediNexus AI server. Make sure the backend is running on port 3001.');
  }

  let body: { success?: boolean; data?: T; error?: string; details?: Record<string, string>; meta?: Record<string, unknown> } = {};
  try {
    body = await res.json();
  } catch {
    // Non-JSON (e.g. proxy error page) — fall through with a generic message.
  }

  if (res.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!res.ok || !body.success) {
    const fallback = res.status >= 500 ? 'The server had a problem. Please try again.' : `Request failed (${res.status}).`;
    throw new ApiError(res.status, body.error || fallback, body.details);
  }
  return { data: body.data as T, meta: body.meta };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authRegister = async (input: RegisterInput) =>
  (await apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) })).data;
export const authLogin = async (input: LoginInput) =>
  (await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) })).data;
export const authMe = async () => (await apiFetch<AuthUser>('/auth/me')).data;
export async function authLogout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' }); // revokes the token on the server
  } finally {
    clearToken();
  }
}

// ─── Triage options (single source of truth: the backend rule engine) ─────────
export const fetchTriageOptions = async () => (await apiFetch<TriageOptions>('/triage/options')).data;

// ─── Patient (own cases only) ─────────────────────────────────────────────────
const caseBody = (input: CaseFormInput, clientRequestId?: string) =>
  JSON.stringify({ ...input, ...(clientRequestId ? { clientRequestId } : {}) });

export const createCase = async (input: CaseFormInput, clientRequestId: string) =>
  (await apiFetch<PatientRecord>('/patients', { method: 'POST', body: caseBody(input, clientRequestId) })).data;
export const updateCase = async (id: string, input: CaseFormInput) =>
  (await apiFetch<PatientRecord>(`/patients/${encodeURIComponent(id)}`, { method: 'PUT', body: caseBody(input) })).data;
export const fetchMyCases = async () => (await apiFetch<PatientRecord[]>('/patients/mine')).data;
export const fetchCase = async (id: string) => (await apiFetch<PatientRecord>(`/patients/${encodeURIComponent(id)}`)).data;

// ─── Doctor only ──────────────────────────────────────────────────────────────
export const fetchDoctorQueue = async () => (await apiFetch<PatientRecord[]>('/doctor/patients')).data;
export async function saveReview(id: string, data: { clinicalNotes?: string; recommendedAction?: string }) {
  const r = await apiFetch<PatientRecord>(`/doctor/patients/${encodeURIComponent(id)}/review`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return { record: r.data, changed: Boolean(r.meta?.changed) };
}
export const approveCase = async (id: string, data: { clinicalNotes?: string }) =>
  (await apiFetch<PatientRecord>(`/doctor/patients/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify(data) })).data;
export const reopenCase = async (id: string) =>
  (await apiFetch<PatientRecord>(`/doctor/patients/${encodeURIComponent(id)}/reopen`, { method: 'POST' })).data;
