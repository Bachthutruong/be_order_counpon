"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const agentController_1 = require("../controllers/agentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.route('/coupons').get(agentController_1.getMyCoupons).post(agentController_1.createMyCoupon);
router.get('/orders', agentController_1.getMyOrders);
router.get('/stats', agentController_1.getMyStats);
exports.default = router;
