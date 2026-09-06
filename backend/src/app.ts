import express from 'express';
import cors from 'cors';
import patientsRouter from './routes/patients';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/health', healthRouter);
app.use('/api/patients', patientsRouter);

// 404 for unknown routes
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Error Handler (must be last) ────────────────────────────────────────────

app.use(errorHandler);

export default app;
