"use strict";
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
exports.updateOrder = exports.getOrder = exports.getOrders = exports.deleteCoupon = exports.updateCoupon = exports.createCoupon = void 0;
const axios_1 = __importDefault(require("axios"));
const getClient = () => {
    const url = process.env.WC_STORE_URL || 'https://trayson.tw';
    const consumerKey = process.env.WC_CONSUMER_KEY || '';
    const consumerSecret = process.env.WC_CONSUMER_SECRET || '';
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    return axios_1.default.create({
        baseURL: `${url}/wp-json/wc/v3`,
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': url
        }
    });
};
const createCoupon = (code, amount, discount_type) => __awaiter(void 0, void 0, void 0, function* () {
    const client = getClient();
    const response = yield client.post('/coupons', {
        code,
        discount_type,
        amount
    });
    return response.data;
});
exports.createCoupon = createCoupon;
const updateCoupon = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    const client = getClient();
    const response = yield client.put(`/coupons/${id}`, data);
    return response.data;
});
exports.updateCoupon = updateCoupon;
const deleteCoupon = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const client = getClient();
    const response = yield client.delete(`/coupons/${id}?force=true`);
    return response.data;
});
exports.deleteCoupon = deleteCoupon;
// We can implement sync function to pull orders too
const getOrders = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1) {
    const client = getClient();
    const response = yield client.get(`/orders?per_page=50&page=${page}`);
    return response.data;
});
exports.getOrders = getOrders;
const getOrder = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const client = getClient();
    const response = yield client.get(`/orders/${id}`);
    return response.data;
});
exports.getOrder = getOrder;
const updateOrder = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const client = getClient();
    const response = yield client.put(`/orders/${id}`, payload);
    return response.data;
});
exports.updateOrder = updateOrder;
