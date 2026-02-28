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
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const Coupon_1 = __importDefault(require("./src/models/Coupon"));
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config();
const url = 'https://trayson.tw';
const consumerKey = process.env.WC_CONSUMER_KEY || '';
const consumerSecret = process.env.WC_CONSUMER_SECRET || '';
const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
const client = axios_1.default.create({
    baseURL: `${url}/wp-json/wc/v3`,
    headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': url
    }
});
function check() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            console.log('Checking coupons from WP...');
            const res = yield client.get('/coupons');
            if (Array.isArray(res.data)) {
                console.log('WP Coupons:', JSON.stringify(res.data.map((c) => ({ id: c.id, code: c.code })), null, 2));
            }
            else {
                console.log('WP Response NOT array:', JSON.stringify(res.data, null, 2));
            }
            // Connect to local DB to see MA1
            yield mongoose_1.default.connect(process.env.MONGODB_URI || '');
            const c = yield Coupon_1.default.findOne({ code: 'MA1' });
            console.log('Local MA1:', JSON.stringify(c, null, 2));
            if (c && !c.wcCouponId) {
                console.log('Attempting to create MA1 in WP explicitly...');
                try {
                    const createRes = yield client.post('/coupons', {
                        code: c.code,
                        discount_type: c.discountType,
                        amount: c.discountValue.toString()
                    });
                    console.log('Create result:', JSON.stringify(createRes.data, null, 2));
                }
                catch (err) {
                    console.log('Create Error:', ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message);
                }
            }
            yield mongoose_1.default.disconnect();
        }
        catch (e) {
            console.error('Check failed:', ((_b = e.response) === null || _b === void 0 ? void 0 : _b.data) || e.message);
        }
    });
}
check();
