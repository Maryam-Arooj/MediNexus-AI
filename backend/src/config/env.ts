/**
 * Central, validated environment configuration.
 * The server refuses to start with a missing/weak JWT secret — there is no fallback.
 */
import * as dotenv from 'dotenv';

// ENV_FILE lets you start the server against another env file (e.g. the test database for e2e runs):
//   PowerShell:  $env:ENV_FILE=".env.test"; npm run dev
dotenv.config({ path: process.env.ENV_FILE || '.env' });

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
  authRateLimitMax: number;
  authRateLimitWindowMs: number;
  aiRateLimitMax: number;
  aiRateLimitWindowMs: number;
}

/** AI (Google Gemini) settings. Optional: without GEMINI_API_KEY every AI feature switches off cleanly. */
export interface AiConfig {
  apiKey: string | null;
  model: string;
  fallbackModel: string | null;
  timeoutMs: number;
}

/** Read on every call so tests (and a restarted server) always see the current values. */
export function getAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const key = (env.GEMINI_API_KEY || '').trim();
  const model = (env.GEMINI_MODEL || '').trim() || 'gemini-2.5-flash';
  const fallback = (env.GEMINI_FALLBACK_MODEL ?? 'gemini-2.5-flash-lite').trim();
  return {
    apiKey: key && !/^your|replace|placeholder/i.test(key) ? key : null,
    model,
    fallbackModel: fallback && fallback !== model ? fallback : null,
    timeoutMs: parseInt(env.GEMINI_TIMEOUT_MS || '25000', 10),
  };
}

export class ConfigError extends Error {}

const MIN_SECRET_LENGTH = 32;
// Secrets that were ever committed to source code are public and must never be accepted.
const KNOWN_LEAKED_SECRETS = new Set(['smartcare_jwt_secret_2026_secure_key']);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = (env.NODE_ENV as NodeEnv) || 'development';
  const jwtSecret = env.JWT_SECRET ?? '';

  if (!env.DATABASE_URL) {
    throw new ConfigError('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.');
  }
  if (jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(
      `JWT_SECRET must be set to a random value of at least ${MIN_SECRET_LENGTH} characters (see backend/.env.example).`
    );
  }
  if (KNOWN_LEAKED_SECRETS.has(jwtSecret)) {
    throw new ConfigError('JWT_SECRET is a value that was published in the source code. Generate a new random secret (see backend/.env.example).');
  }
  if (/change[_-]?me|your[_-]?jwt|example|placeholder/i.test(jwtSecret) && nodeEnv === 'production') {
    throw new ConfigError('JWT_SECRET still contains a placeholder value. Generate a real secret for production.');
  }

  return {
    nodeEnv,
    port: parseInt(env.PORT || '3001', 10),
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '8h',
    corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    authRateLimitMax: parseInt(env.AUTH_RATE_LIMIT_MAX || '20', 10),
    authRateLimitWindowMs: parseInt(env.AUTH_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
    aiRateLimitMax: parseInt(env.AI_RATE_LIMIT_MAX || '30', 10),
    aiRateLimitWindowMs: parseInt(env.AI_RATE_LIMIT_WINDOW_MS || String(10 * 60 * 1000), 10),
  };
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) cached = loadConfig();
  return cached;
}
