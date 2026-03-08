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
exports.logout = exports.getMe = exports.changePassword = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone, password } = req.body;
        const user = yield User_1.default.findOne({ phone, active: true });
        if (!user) {
            return res.status(401).json({ message: '帳號或密碼錯誤，或帳號已停用' });
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: '帳號或密碼錯誤' });
        }
        const token = generateToken(user._id.toString());
        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: true, // Required for sameSite: 'none'
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        res.json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            isFirstLogin: user.isFirstLogin,
            token, // Also send in body just in case
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.login = login;
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { oldPassword, newPassword } = req.body;
        const user = yield User_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        if (!user) {
            return res.status(404).json({ message: '找不到使用者' });
        }
        const isMatch = yield bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '目前密碼錯誤' });
        }
        user.password = yield bcryptjs_1.default.hash(newPassword, 10);
        user.isFirstLogin = false; // Mark as not first login
        yield user.save();
        res.json({ message: '密碼已更新' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.changePassword = changePassword;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = yield User_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id).select('-password');
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMe = getMe;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.cookie('token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        expires: new Date(0),
    });
    res.json({ message: '已登出' });
});
exports.logout = logout;
