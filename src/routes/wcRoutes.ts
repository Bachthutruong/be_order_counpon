import express from 'express';
import { syncOrders } from '../controllers/wcController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/sync-orders', protect, adminOnly, syncOrders);

export default router;
