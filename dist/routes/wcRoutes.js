"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wcController_1 = require("../controllers/wcController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/sync-orders', authMiddleware_1.protect, authMiddleware_1.adminOnly, wcController_1.syncOrders);
exports.default = router;
