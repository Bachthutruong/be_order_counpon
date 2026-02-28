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
exports.syncCoupons = exports.doSyncCoupons = exports.syncOrders = exports.doSyncOrders = void 0;
const wcService = __importStar(require("../services/wcService"));
const Order_1 = __importDefault(require("../models/Order"));
const Coupon_1 = __importDefault(require("../models/Coupon"));
const doSyncOrders = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    let page = 1;
    let keepGoing = true;
    let imported = 0;
    const dbCoupons = yield Coupon_1.default.find();
    const couponMap = {};
    dbCoupons.forEach(c => {
        couponMap[c.code.toLowerCase()] = c.agentId;
    });
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
                let couponCodeUsed = undefined;
                let agentId = undefined;
                if (data.coupon_lines && data.coupon_lines.length > 0) {
                    const cc = data.coupon_lines[0].code.toLowerCase();
                    couponCodeUsed = cc;
                    agentId = couponMap[cc] || null;
                }
                const orderData = {
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
                yield Order_1.default.findOneAndUpdate({ wcOrderId: data.id }, orderData, { upsert: true });
                imported++;
            }
            page++;
        }
        catch (error) {
            const errorMsg = ((_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message;
            console.error(`doSyncOrders page ${page} Error:`, errorMsg);
            if (imported === 0) {
                throw new Error(errorMsg);
            }
            break; // stop on network error or end of items after some imports
        }
    }
    return imported;
});
exports.doSyncOrders = doSyncOrders;
const syncOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const imported = yield (0, exports.doSyncOrders)();
        res.json({ message: `Successfully synced ${imported} orders`, imported });
    }
    catch (error) {
        console.error('Sync request Error', error);
        res.status(500).json({ message: 'Lỗi hệ thống trong quá trình đồng bộ.' });
    }
});
exports.syncOrders = syncOrders;
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
        res.json({ message: `Successfully synced ${synced} coupons to WordPress`, synced });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.syncCoupons = syncCoupons;
