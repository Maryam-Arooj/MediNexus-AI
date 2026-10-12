import express from 'express';
import cors from 'cors';
import { AppConfig, getConfig } from './config/env';
import { authRouter } from './routes/auth';
import patientsRouter from './routes/patients';
import doctorRouter from './routes/doctor';
import triageRouter from './routes/triage';
import healthRouter from './routes/health';
import { aiRouter } from './routes/ai';
import { aiRateLimiter, authRateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

export function createApp(config: AppConfig = getConfig()) {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors({ origin: config.corsOrigins }));
  // Report/prescription uploads (base64, max 4 MB file) need a larger body limit on this ONE route only.
  app.use('/api/ai/document', express.json({ limit: '6mb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/health', healthRouter);
  app.use('/api/triage', triageRouter);
  app.use('/api/auth', authRouter(authRateLimiter(config.authRateLimitMax, config.authRateLimitWindowMs)));
  app.use('/api/patients', patientsRouter);
  app.use('/api/doctor', doctorRouter);
  app.use('/api/ai', aiRouter(aiRateLimiter(config.aiRateLimitMax, config.aiRateLimitWindowMs)));

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found.' });
  });
  app.use(errorHandler);
  return app;
}
