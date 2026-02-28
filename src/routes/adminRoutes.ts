import express from 'express';
import { getAgents, createAgent, updateAgent, deleteAgent, getConfig, updateConfig, getCoupons, createCouponAdmin, deleteCouponAdmin, getOrders, getStats } from '../controllers/adminController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect, adminOnly);

router.route('/agents').get(getAgents).post(createAgent);
router.route('/agents/:id').put(updateAgent).delete(deleteAgent);

router.route('/config').get(getConfig).put(updateConfig);

router.route('/coupons').get(getCoupons).post(createCouponAdmin);
router.route('/coupons/:id').delete(deleteCouponAdmin);

router.get('/orders', getOrders);
router.get('/stats', getStats);

export default router;
