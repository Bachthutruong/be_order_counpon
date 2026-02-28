import express from 'express';
import { login, changePassword, getMe, logout } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', login);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);
router.post('/logout', logout);

export default router;
