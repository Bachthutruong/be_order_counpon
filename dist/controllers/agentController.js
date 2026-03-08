"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyStats = exports.getMyOrders = exports.deleteMyCoupon = exports.updateMyCoupon = exports.createMyCoupon = exports.getMyCoupons = void 0;
const Coupon_1 = __importDefault(require("../models/Coupon"));
const Config_1 = __importDefault(require("../models/Config"));
const Order_1 = __importDefault(require("../models/Order"));
const wcService = __importStar(require("../services/wcService"));
const getMyCoupons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        let query = { agentId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id };
        if (search) {
            query.code = { $regex: search, $options: 'i' };
        }
        const coupons = yield Coupon_1.default.find(query).sort({ createdAt: -1 })
            .skip((page - 1) * limit).limit(limit);
        const total = yield Coupon_1.default.countDocuments(query);
        res.json({ data: coupons, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMyCoupons = getMyCoupons;
const createMyCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { code, discountType, discountValue } = req.body;
        // Validate custom rules!
        const config = (yield Config_1.default.findOne()) || {
            minDiscountPercent: 10, maxDiscountPercent: 50,
            minDiscountFixed: 20000, maxDiscountFixed: 501100,
            applyRules: true
        };
        if (config.applyRules) {
            if (discountType === 'percent') {
                if (discountValue < config.minDiscountPercent || discountValue > config.maxDiscountPercent) {
                    return res.status(400).json({ message: `折扣 % 須介於 ${config.minDiscountPercent}% 至 ${config.maxDiscountPercent}%` });
                }
            }
            else {
                if (discountValue < config.minDiscountFixed || discountValue > config.maxDiscountFixed) {
                    return res.status(400).json({ message: `折扣金額須介於 ${config.minDiscountFixed} 至 ${config.maxDiscountFixed}` });
                }
            }
        }
        // Sync to WC
        let wcId;
        try {
            const wcCoupon = yield wcService.createCoupon(code, discountValue.toString(), discountType);
            wcId = wcCoupon.id;
        }
        catch (e) {
            console.log('Error creating WP coupon by Agent', ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
            return res.status(400).json({ message: '與 WordPress 建立折扣碼時發生錯誤' });
        }
        const coupon = yield Coupon_1.default.create({
            code,
            discountType,
            discountValue,
            agentId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
            wcCouponId: wcId,
        });
        res.status(201).json(coupon);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createMyCoupon = createMyCoupon;
const updateMyCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { discountType, discountValue } = req.body;
        const coupon = yield Coupon_1.default.findOne({ _id: req.params.id, agentId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!coupon)
            return res.status(404).json({ message: '找不到折扣碼' });
        // Validate rules
        const config = (yield Config_1.default.findOne()) || { applyRules: true, minDiscountPercent: 10, maxDiscountPercent: 50, minDiscountFixed: 20000, maxDiscountFixed: 500000 };
        if (config.applyRules) {
            if (discountType === 'percent') {
                if (discountValue < config.minDiscountPercent || discountValue > config.maxDiscountPercent) {
                    return res.status(400).json({ message: `折扣 % 須介於 ${config.minDiscountPercent}% 至 ${config.maxDiscountPercent}%` });
                }
            }
            else {
                if (discountValue < config.minDiscountFixed || discountValue > config.maxDiscountFixed) {
                    return res.status(400).json({ message: `折扣金額須介於 ${config.minDiscountFixed} 至 ${config.maxDiscountFixed}` });
                }
            }
        }
        if (coupon.wcCouponId) {
            yield wcService.updateCoupon(coupon.wcCouponId, {
                discount_type: discountType,
                amount: discountValue.toString()
            });
        }
        coupon.discountType = discountType;
        coupon.discountValue = discountValue;
        yield coupon.save();
        res.json(coupon);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateMyCoupon = updateMyCoupon;
const deleteMyCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const coupon = yield Coupon_1.default.findOne({ _id: req.params.id, agentId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!coupon)
            return res.status(404).json({ message: '找不到' });
        if (coupon.wcCouponId) {
            try {
                yield wcService.deleteCoupon(coupon.wcCouponId);
            }
            catch (e) {
                console.log('WP Coupon delete failed', e);
            }
        }
        yield coupon.deleteOne();
        res.json({ message: '已刪除' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteMyCoupon = deleteMyCoupon;
const getMyOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        let query = { agentId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id };
        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { couponCodeUsed: { $regex: search, $options: 'i' } }
            ];
        }
        const orders = yield Order_1.default.find(query).sort({ dateCreated: -1 })
            .skip((page - 1) * limit).limit(limit);
        const total = yield Order_1.default.countDocuments(query);
        res.json({ data: orders, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMyOrders = getMyOrders;
const getMyStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { startDate, endDate } = req.query;
        let matchStage = { agentId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id, status: { $in: ['completed', 'processing', 'on-hold'] } };
        if (startDate || endDate) {
            matchStage.dateCreated = {};
            if (startDate)
                matchStage.dateCreated.$gte = new Date(startDate);
            if (endDate)
                matchStage.dateCreated.$lte = new Date(endDate);
        }
        const stats = yield Order_1.default.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    totalOrders: { $sum: 1 },
                    discountGiven: { $sum: "$discountTotal" }
                }
            }
        ]);
        // Daily stats for chart
        const dailyPipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateCreated" } },
                    revenue: { $sum: "$total" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];
        const dailyStats = yield Order_1.default.aggregate(dailyPipeline);
        res.json({
            summary: stats[0] || { totalRevenue: 0, totalOrders: 0, discountGiven: 0 },
            daily: dailyStats.map(d => ({ date: d._id, revenue: d.revenue, orders: d.orders }))
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMyStats = getMyStats;
