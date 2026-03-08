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
exports.getStatsRevenueByAgent = exports.getStats = exports.getOrders = exports.deleteCouponAdmin = exports.updateCouponAdmin = exports.createCouponAdmin = exports.getCoupons = exports.updateConfig = exports.getConfig = exports.deleteAgent = exports.updateAgent = exports.createAgent = exports.getAgents = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Config_1 = __importDefault(require("../models/Config"));
const Coupon_1 = __importDefault(require("../models/Coupon"));
const Order_1 = __importDefault(require("../models/Order"));
const wcService = __importStar(require("../services/wcService"));
// Agents
const getAgents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        let query = { role: 'AGENT' };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        const agents = yield User_1.default.find(query).skip((page - 1) * limit).limit(limit).select('-password');
        const total = yield User_1.default.countDocuments(query);
        res.json({ data: agents, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getAgents = getAgents;
const createAgent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, phone } = req.body;
        const exists = yield User_1.default.findOne({ phone });
        if (exists) {
            return res.status(400).json({ message: '此電話號碼已存在' });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const defaultPassword = (yield Config_1.default.findOne().select('defaultAgentPassword').then(c => c === null || c === void 0 ? void 0 : c.defaultAgentPassword)) || '123456789';
        const hashedPassword = yield bcryptjs_1.default.hash(defaultPassword, salt);
        const agent = yield User_1.default.create({
            name,
            phone,
            password: hashedPassword,
            role: 'AGENT',
            isFirstLogin: true,
            active: true,
        });
        res.status(201).json({ id: agent._id, name: agent.name, phone: agent.phone });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createAgent = createAgent;
const updateAgent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, phone, active } = req.body;
        const agent = yield User_1.default.findOneAndUpdate({ _id: req.params.id, role: 'AGENT' }, { name, phone, active }, { new: true }).select('-password');
        res.json(agent);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateAgent = updateAgent;
const deleteAgent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield User_1.default.findOneAndDelete({ _id: req.params.id, role: 'AGENT' });
        res.json({ message: '經銷商已刪除' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteAgent = deleteAgent;
// Rules / Config
const getConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let config = yield Config_1.default.findOne();
        if (!config) {
            config = yield Config_1.default.create({});
        }
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getConfig = getConfig;
const updateConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { minDiscountPercent, maxDiscountPercent, minDiscountFixed, maxDiscountFixed, applyRules, defaultAgentPassword } = req.body;
        let config = yield Config_1.default.findOne();
        if (!config) {
            config = new Config_1.default({});
        }
        config.minDiscountPercent = minDiscountPercent;
        config.maxDiscountPercent = maxDiscountPercent;
        config.minDiscountFixed = minDiscountFixed;
        config.maxDiscountFixed = maxDiscountFixed;
        config.applyRules = applyRules;
        if (defaultAgentPassword !== undefined) {
            config.defaultAgentPassword = defaultAgentPassword || undefined;
        }
        yield config.save();
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateConfig = updateConfig;
// Admin manage coupons
const getCoupons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const agentId = req.query.agentId;
        let query = {};
        if (search) {
            query.code = { $regex: search, $options: 'i' };
        }
        if (agentId && agentId !== 'all') {
            query.agentId = agentId;
        }
        const coupons = yield Coupon_1.default.find(query).sort({ createdAt: -1 })
            .skip((page - 1) * limit).limit(limit).populate('agentId', 'name phone');
        const total = yield Coupon_1.default.countDocuments(query);
        res.json({ data: coupons, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCoupons = getCoupons;
const createCouponAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { code, discountType, discountValue, agentId } = req.body;
        // Admin is not bound by range rules, or maybe they are? "Admin có thể cài đặt quy tắc... đại lý thì sẽ chỉ được tạo theo quy tắc đó". Which means admin might not be completely restricted. But let's assume valid.
        // 1. Create in WooCommerce
        let wcId = undefined;
        try {
            const wcCoupon = yield wcService.createCoupon(code, discountValue.toString(), discountType);
            wcId = wcCoupon.id;
        }
        catch (e) {
            console.log('Error creating WP coupon', ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
            return res.status(400).json({ message: '與 WordPress 同步折扣碼時發生錯誤' });
        }
        const coupon = yield Coupon_1.default.create({
            code,
            discountType,
            discountValue,
            agentId,
            wcCouponId: wcId,
        });
        res.status(201).json(coupon);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createCouponAdmin = createCouponAdmin;
const updateCouponAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { discountType, discountValue } = req.body;
        const coupon = yield Coupon_1.default.findById(req.params.id);
        if (!coupon)
            return res.status(404).json({ message: '找不到折扣碼' });
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
exports.updateCouponAdmin = updateCouponAdmin;
const deleteCouponAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coupon = yield Coupon_1.default.findById(req.params.id);
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
exports.deleteCouponAdmin = deleteCouponAdmin;
// Orders - Read only
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const agentId = req.query.agentId;
        let query = {};
        if (agentId && agentId !== 'all') {
            query.agentId = agentId;
        }
        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { couponCodeUsed: { $regex: search, $options: 'i' } }
            ];
        }
        // Filter out canceled or completed if needed, but for now we list all.
        const orders = yield Order_1.default.find(query).sort({ dateCreated: -1 })
            .skip((page - 1) * limit).limit(limit).populate('agentId', 'name phone');
        const total = yield Order_1.default.countDocuments(query);
        res.json({ data: orders, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOrders = getOrders;
// Stats
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { agentId, startDate, endDate } = req.query;
        let matchStage = {};
        if (agentId) {
            matchStage.agentId = agentId;
        }
        if (startDate || endDate) {
            matchStage.dateCreated = {};
            if (startDate)
                matchStage.dateCreated.$gte = new Date(startDate);
            if (endDate)
                matchStage.dateCreated.$lte = new Date(endDate);
        }
        matchStage.status = { $in: ['completed', 'processing', 'on-hold'] };
        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    totalOrders: { $sum: 1 },
                    discountGiven: { $sum: "$discountTotal" }
                }
            }
        ];
        const stats = yield Order_1.default.aggregate(pipeline);
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
exports.getStats = getStats;
/** Thống kê doanh thu theo từng đại lý, lọc theo khoảng thời gian và/hoặc đại lý */
const getStatsRevenueByAgent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, agentId } = req.query;
        const matchStage = { status: { $in: ['completed', 'processing', 'on-hold'] } };
        if (agentId && agentId !== 'all') {
            matchStage.agentId = new mongoose_1.default.Types.ObjectId(agentId);
        }
        if (startDate || endDate) {
            matchStage.dateCreated = {};
            if (startDate)
                matchStage.dateCreated.$gte = new Date(startDate);
            if (endDate)
                matchStage.dateCreated.$lte = new Date(endDate);
        }
        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: '$agentId',
                    totalRevenue: { $sum: '$total' },
                    totalOrders: { $sum: 1 },
                    discountGiven: { $sum: '$discountTotal' }
                }
            },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
            { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
            { $sort: { totalRevenue: -1 } },
            {
                $project: {
                    agentId: '$_id',
                    agentName: { $ifNull: ['$agent.name', 'Không gán đại lý'] },
                    agentPhone: '$agent.phone',
                    totalRevenue: 1,
                    totalOrders: 1,
                    discountGiven: 1,
                    _id: 0
                }
            }
        ];
        const result = yield Order_1.default.aggregate(pipeline);
        res.json({ data: result });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getStatsRevenueByAgent = getStatsRevenueByAgent;
