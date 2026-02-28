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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("./config/db"));
const User_1 = __importDefault(require("./models/User"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const agentRoutes_1 = __importDefault(require("./routes/agentRoutes"));
const wcRoutes_1 = __importDefault(require("./routes/wcRoutes"));
const wcController_1 = require("./controllers/wcController");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => callback(null, true), // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
(0, db_1.default)();
app.use('/api/auth', authRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/agent', agentRoutes_1.default);
app.use('/api/wc', wcRoutes_1.default);
const PORT = process.env.PORT || 5011;
const seedAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const adminExists = yield User_1.default.findOne({ role: 'ADMIN' });
        if (!adminExists) {
            const hashedPassword = yield bcryptjs_1.default.hash('admin123', 10);
            yield User_1.default.create({
                name: 'System Admin',
                phone: 'admin',
                password: hashedPassword,
                role: 'ADMIN',
                isFirstLogin: false, // Default admin doesn't need to change password immediately
                active: true
            });
            console.log('Default admin seeded: phone=admin password=admin123');
        }
    }
    catch (e) {
        console.error('Seed error:', e);
    }
});
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server running on port ${PORT}`);
    yield seedAdmin();
    // Auto sync WooCommerce orders every 5 minutes
    setInterval(() => {
        console.log('Running auto background sync...');
        (0, wcController_1.doSyncOrders)().catch(e => console.error('Background sync failed', e));
    }, 5 * 60 * 1000);
}));
