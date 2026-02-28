import express from 'express';
import { getMyCoupons, createMyCoupon, getMyOrders, getMyStats } from '../controllers/agentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.route('/coupons').get(getMyCoupons).post(createMyCoupon);
router.get('/orders', getMyOrders);
router.get('/stats', getMyStats);

export default router;
