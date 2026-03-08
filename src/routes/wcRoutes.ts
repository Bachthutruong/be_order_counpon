import express from 'express';
import { syncOrders, syncCoupons, getOrderDetail, updateOrder, webhookOrder } from '../controllers/wcController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/sync-orders', protect, adminOnly, syncOrders);
router.post('/sync-coupons', protect, adminOnly, syncCoupons);

router.get('/orders/:wcOrderId', protect, adminOnly, getOrderDetail);
router.put('/orders/:wcOrderId', protect, adminOnly, updateOrder);

router.post('/webhook/order', webhookOrder);

export default router;
