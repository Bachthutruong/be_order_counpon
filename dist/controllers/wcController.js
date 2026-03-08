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
exports.syncCoupons = exports.doSyncCoupons = exports.webhookOrder = exports.updateOrder = exports.getOrderDetail = exports.syncOrders = exports.doSyncOrders = exports.syncSingleOrder = void 0;
const wcService = __importStar(require("../services/wcService"));
const Order_1 = __importDefault(require("../models/Order"));
const Coupon_1 = __importDefault(require("../models/Coupon"));
const dbCouponsToMap = () => __awaiter(void 0, void 0, void 0, function* () {
    const dbCoupons = yield Coupon_1.default.find();
    const couponMap = {};
    dbCoupons.forEach(c => { couponMap[c.code.toLowerCase()] = c.agentId; });
    return couponMap;
});
const mapWcOrderToLocal = (data, couponMap) => {
    var _a, _b;
    let couponCodeUsed = undefined;
    let agentId = undefined;
    if (data.coupon_lines && data.coupon_lines.length > 0) {
        const cc = data.coupon_lines[0].code.toLowerCase();
        couponCodeUsed = cc;
        agentId = couponMap[cc] || null;
    }
    return {
        wcOrderId: data.id,
        total: parseFloat(data.total),
        discountTotal: parseFloat(data.discount_total),
        couponCodeUsed,
        agentId,
        status: data.status,
        dateCreated: new Date(data.date_created),
        currency: data.currency,
        customerName: `${((_a = data.billing) === null || _a === void 0 ? void 0 : _a.first_name) || ''} ${((_b = data.billing) === null || _b === void 0 ? void 0 : _b.last_name) || ''}`.trim() || 'Guest'
    };
};
/** Đồng bộ một đơn từ WC vào DB (dùng cho webhook và sau khi update) */
const syncSingleOrder = (wcOrderId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const couponMap = yield dbCouponsToMap();
    try {
        const data = yield wcService.getOrder(wcOrderId);
        const orderData = mapWcOrderToLocal(data, couponMap);
        yield Order_1.default.findOneAndUpdate({ wcOrderId }, orderData, { upsert: true });
        return true;
    }
    catch (e) {
        console.error('syncSingleOrder error', wcOrderId, ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || e.message);
        return false;
    }
});
exports.syncSingleOrder = syncSingleOrder;
const doSyncOrders = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let page = 1;
    let keepGoing = true;
    let imported = 0;
    const couponMap = yield dbCouponsToMap();
    while (keepGoing) {
        try {
            const wcOrders = yield wcService.getOrders(page);
            if (!Array.isArray(wcOrders)) {
                console.error('WC API returned non-array:', wcOrders);
                throw new Error(typeof wcOrders === 'object' && wcOrders.message ? wcOrders.message : 'WC API returned unexpected format');
            }
            if (wcOrders.length === 0) {
                keepGoing = false;
                break;
            }
            for (const data of wcOrders) {
                const orderData = mapWcOrderToLocal(data, couponMap);
                yield Order_1.default.findOneAndUpdate({ wcOrderId: data.id }, orderData, { upsert: true });
                imported++;
            }
            page++;
        }
        catch (error) {
            const errorMsg = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message;
            console.error(`doSyncOrders page ${page} Error:`, errorMsg);
            if (imported === 0) {
                throw new Error(errorMsg);
            }
            break;
        }
    }
    return imported;
});
exports.doSyncOrders = doSyncOrders;
const syncOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const imported = yield (0, exports.doSyncOrders)();
        res.json({ message: `已同步 ${imported} 筆訂單`, imported });
    }
    catch (error) {
        console.error('Sync request Error', error);
        res.status(500).json({ message: '同步過程中發生系統錯誤。' });
    }
});
exports.syncOrders = syncOrders;
/** Chi tiết đơn hàng (lấy từ WC + merge agent từ DB) */
const getOrderDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const idParam = Array.isArray(req.params.wcOrderId) ? req.params.wcOrderId[0] : req.params.wcOrderId;
        const wcOrderId = parseInt(idParam !== null && idParam !== void 0 ? idParam : '', 10);
        if (isNaN(wcOrderId))
            return res.status(400).json({ message: '訂單 ID 無效' });
        const wcOrder = yield wcService.getOrder(wcOrderId);
        const local = yield Order_1.default.findOne({ wcOrderId }).populate('agentId', 'name phone');
        res.json(Object.assign(Object.assign({}, wcOrder), { agentId: local === null || local === void 0 ? void 0 : local.agentId, couponCodeUsed: local === null || local === void 0 ? void 0 : local.couponCodeUsed }));
    }
    catch (error) {
        const msg = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message;
        if (((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) === 404)
            return res.status(404).json({ message: 'WordPress 中找不到此訂單' });
        res.status(500).json({ message: msg });
    }
});
exports.getOrderDetail = getOrderDetail;
/** Cập nhật đơn hàng trên WordPress rồi đồng bộ lại DB (dùng luôn response từ WC để ghi DB, tránh lệch dữ liệu) */
const updateOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const idParam = Array.isArray(req.params.wcOrderId) ? req.params.wcOrderId[0] : req.params.wcOrderId;
        const wcOrderId = parseInt(idParam !== null && idParam !== void 0 ? idParam : '', 10);
        if (isNaN(wcOrderId))
            return res.status(400).json({ message: '訂單 ID 無效' });
        const { status, billing } = req.body;
        const payload = {};
        if (status !== undefined)
            payload.status = status;
        if (billing !== undefined)
            payload.billing = billing;
        const wcUpdated = yield wcService.updateOrder(wcOrderId, payload);
        const couponMap = yield dbCouponsToMap();
        const orderData = mapWcOrderToLocal(wcUpdated, couponMap);
        yield Order_1.default.findOneAndUpdate({ wcOrderId }, orderData, { upsert: true, new: true });
        const local = yield Order_1.default.findOne({ wcOrderId }).populate('agentId', 'name phone');
        res.json(local);
    }
    catch (error) {
        const msg = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message;
        if (((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) === 404)
            return res.status(404).json({ message: 'WordPress 中找不到此訂單' });
        res.status(500).json({ message: msg });
    }
});
exports.updateOrder = updateOrder;
/** Webhook do WordPress gọi khi có đơn mới/cập nhật – đồng bộ đơn đó ngay */
const webhookOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const id = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : (_c = req.body) === null || _c === void 0 ? void 0 : _c.order_id;
        const wcOrderId = typeof id === 'number' ? id : parseInt(String(id), 10);
        if (isNaN(wcOrderId)) {
            return res.status(400).json({ message: '請求內容缺少或無效的訂單 ID' });
        }
        const ok = yield (0, exports.syncSingleOrder)(wcOrderId);
        res.status(ok ? 200 : 500).json({ synced: ok });
    }
    catch (error) {
        console.error('webhookOrder', error);
        res.status(500).json({ message: error.message });
    }
});
exports.webhookOrder = webhookOrder;
const doSyncCoupons = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const coupons = yield Coupon_1.default.find();
    let synced = 0;
    for (const coupon of coupons) {
        if (!coupon.wcCouponId) {
            try {
                // Try create in WC
                const wcResult = yield wcService.createCoupon(coupon.code, coupon.discountValue.toString(), coupon.discountType);
                if (wcResult && wcResult.id) {
                    coupon.wcCouponId = wcResult.id;
                    yield coupon.save();
                    synced++;
                }
                else {
                    const errorMsg = wcResult.message || 'WC API returned success but no ID found';
                    console.error(`Sync coupon ${coupon.code} failed:`, errorMsg);
                    // We don't increment synced here
                    if (coupons.length === 1)
                        throw new Error(errorMsg);
                }
            }
            catch (e) {
                // If code already exists in WC, we should ideally fetch it, but usually it's just a sync conflict.
                console.error(`Sync coupon ${coupon.code} failed:`, ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || e.message);
                // If it already exists, error message may contain "ID already exists" or similar.
            }
        }
    }
    return synced;
});
exports.doSyncCoupons = doSyncCoupons;
const syncCoupons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const synced = yield (0, exports.doSyncCoupons)();
        res.json({ message: `已同步 ${synced} 個折扣碼至 WordPress`, synced });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.syncCoupons = syncCoupons;
