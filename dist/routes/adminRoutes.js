"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect, authMiddleware_1.adminOnly);
router.route('/agents').get(adminController_1.getAgents).post(adminController_1.createAgent);
router.route('/agents/:id').put(adminController_1.updateAgent).delete(adminController_1.deleteAgent);
router.route('/config').get(adminController_1.getConfig).put(adminController_1.updateConfig);
router.route('/coupons').get(adminController_1.getCoupons).post(adminController_1.createCouponAdmin);
router.route('/coupons/:id').delete(adminController_1.deleteCouponAdmin);
router.get('/orders', adminController_1.getOrders);
router.get('/stats', adminController_1.getStats);
exports.default = router;
