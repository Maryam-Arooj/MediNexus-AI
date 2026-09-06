import { Router } from 'express';
import { register, login, me, logout } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Public
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected
router.get('/me', requireAuth, me);

export default router;
