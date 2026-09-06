import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/health
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Test DB connection with a lightweight query
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'ok',
      api: 'MediNexus AI Backend',
      database: 'PostgreSQL — connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      status: 'error',
      api: 'MediNexus AI Backend',
      database: 'PostgreSQL — disconnected',
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
