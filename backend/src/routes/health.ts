import { Router } from 'express';
import prisma from '../lib/prisma';

const r = Router();
r.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    // No raw error text: it can contain connection details.
    res.status(503).json({ success: false, status: 'error', database: 'unavailable', timestamp: new Date().toISOString() });
  }
});
export default r;
