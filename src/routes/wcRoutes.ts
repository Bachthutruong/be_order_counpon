import express from 'express';
import { syncOrders, syncCoupons } from '../controllers/wcController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/sync-orders', protect, adminOnly, syncOrders);
router.post('/sync-coupons', protect, adminOnly, syncCoupons);

export default router;
