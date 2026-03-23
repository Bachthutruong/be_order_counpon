import express from 'express';
import {
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getConfig,
  updateConfig,
  getCoupons,
  createCouponAdmin,
  updateCouponAdmin,
  deleteCouponAdmin,
  getOrders,
  getStats,
  getStatsRevenueByAgent
} from '../controllers/adminController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect, adminOnly);

router.route('/agents').get(getAgents).post(createAgent);
router.route('/agents/:id').put(updateAgent).delete(deleteAgent);
router.route('/admins').get(getAdmins).post(createAdmin);
router.route('/admins/:id').put(updateAdmin).delete(deleteAdmin);

router.route('/config').get(getConfig).put(updateConfig);

router.route('/coupons').get(getCoupons).post(createCouponAdmin);
router.route('/coupons/:id').put(updateCouponAdmin).delete(deleteCouponAdmin);

router.get('/orders', getOrders);
router.get('/stats', getStats);
router.get('/stats/revenue-by-agent', getStatsRevenueByAgent);

export default router;
