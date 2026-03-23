import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User';
import Config from '../models/Config';
import Coupon from '../models/Coupon';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/authMiddleware';
import * as wcService from '../services/wcService';

// Agents
export const getAgents = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    
    let query: any = { role: 'AGENT' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const agents = await User.find(query).skip((page - 1) * limit).limit(limit).select('-password');
    const total = await User.countDocuments(query);
    
    res.json({ data: agents, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admins
export const getAdmins = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = { role: 'ADMIN' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const admins = await User.find(query).skip((page - 1) * limit).limit(limit).select('-password');
    const total = await User.countDocuments(query);

    res.json({ data: admins, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: '請填寫完整資訊' });
    }

    const exists = await User.findOne({ phone });
    if (exists) {
      return res.status(400).json({ message: '此電話號碼已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      phone,
      password: hashedPassword,
      role: 'ADMIN',
      isFirstLogin: false,
      active: true,
    });

    res.status(201).json({
      id: admin._id,
      name: admin.name,
      phone: admin.phone,
      role: admin.role,
      isFirstLogin: admin.isFirstLogin,
      active: admin.active
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, active } = req.body;
    const adminId = String(req.params.id);

    if (!name || !phone) {
      return res.status(400).json({ message: '姓名與電話必填' });
    }

    const duplicate = await User.findOne({ phone, _id: { $ne: adminId } });
    if (duplicate) {
      return res.status(400).json({ message: '此電話號碼已存在' });
    }

    if (req.user?._id?.toString() === adminId && active === false) {
      return res.status(400).json({ message: '不可停用自己的管理員帳號' });
    }

    const admin = await User.findOneAndUpdate(
      { _id: adminId, role: 'ADMIN' },
      { name, phone, active },
      { new: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: '找不到管理員' });
    }

    res.json(admin);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = String(req.params.id);

    if (req.user?._id?.toString() === adminId) {
      return res.status(400).json({ message: '不可刪除目前登入帳號' });
    }

    const totalAdmins = await User.countDocuments({ role: 'ADMIN' });
    if (totalAdmins <= 1) {
      return res.status(400).json({ message: '系統至少需要一個管理員' });
    }

    const deleted = await User.findOneAndDelete({ _id: adminId, role: 'ADMIN' });
    if (!deleted) {
      return res.status(404).json({ message: '找不到管理員' });
    }

    res.json({ message: '管理員已刪除' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createAgent = async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;
    const exists = await User.findOne({ phone });
    if (exists) {
      return res.status(400).json({ message: '此電話號碼已存在' });
    }

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = (await Config.findOne().select('defaultAgentPassword').then(c => c?.defaultAgentPassword)) || '123456789';
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    const agent = await User.create({
      name,
      phone,
      password: hashedPassword,
      role: 'AGENT',
      isFirstLogin: true,
      active: true,
    });

    res.status(201).json({ id: agent._id, name: agent.name, phone: agent.phone });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAgent = async (req: Request, res: Response) => {
  try {
    const { name, phone, active } = req.body;
    const agent = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'AGENT' },
      { name, phone, active },
      { new: true }
    ).select('-password');
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAgent = async (req: Request, res: Response) => {
  try {
    await User.findOneAndDelete({ _id: req.params.id, role: 'AGENT' });
    res.json({ message: '經銷商已刪除' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Rules / Config
export const getConfig = async (req: Request, res: Response) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({});
    }
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const { minDiscountPercent, maxDiscountPercent, minDiscountFixed, maxDiscountFixed, applyRules, defaultAgentPassword } = req.body;
    let config = await Config.findOne();
    if (!config) {
      config = new Config({});
    }
    config.minDiscountPercent = minDiscountPercent;
    config.maxDiscountPercent = maxDiscountPercent;
    config.minDiscountFixed = minDiscountFixed;
    config.maxDiscountFixed = maxDiscountFixed;
    config.applyRules = applyRules;
    if (defaultAgentPassword !== undefined) {
      config.defaultAgentPassword = defaultAgentPassword || undefined;
    }
    await config.save();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin manage coupons
export const getCoupons = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const agentId = req.query.agentId as string;
    
    let query: any = {};
    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }
    if (agentId && agentId !== 'all') {
      query.agentId = agentId;
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).populate('agentId', 'name phone');
    const total = await Coupon.countDocuments(query);
    res.json({ data: coupons, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCouponAdmin = async (req: Request, res: Response) => {
  try {
    const { code, discountType, discountValue, agentId } = req.body;
    
    // Admin is not bound by range rules, or maybe they are? "Admin có thể cài đặt quy tắc... đại lý thì sẽ chỉ được tạo theo quy tắc đó". Which means admin might not be completely restricted. But let's assume valid.

    // 1. Create in WooCommerce
    let wcId = undefined;
    try {
      const wcCoupon = await wcService.createCoupon(code, discountValue.toString(), discountType);
      wcId = wcCoupon.id;
    } catch (e: any) {
      console.log('Error creating WP coupon', e.response?.data || e.message);
      return res.status(400).json({ message: '與 WordPress 同步折扣碼時發生錯誤' });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      agentId,
      wcCouponId: wcId,
    });
    
    res.status(201).json(coupon);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCouponAdmin = async (req: Request, res: Response) => {
  try {
    const { discountType, discountValue } = req.body;
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: '找不到折扣碼' });

    if (coupon.wcCouponId) {
      await wcService.updateCoupon(coupon.wcCouponId, {
        discount_type: discountType,
        amount: discountValue.toString()
      });
    }

    coupon.discountType = discountType;
    coupon.discountValue = discountValue;
    await coupon.save();

    res.json(coupon);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCouponAdmin = async (req: Request, res: Response) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: '找不到' });

    if (coupon.wcCouponId) {
       try {
         await wcService.deleteCoupon(coupon.wcCouponId);
       } catch (e) {
         console.log('WP Coupon delete failed', e);
       }
    }
    
    await coupon.deleteOne();
    res.json({ message: '已刪除' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Orders - Read only
export const getOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const agentId = req.query.agentId as string;
    
    let query: any = {};
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
    const orders = await Order.find(query).sort({ dateCreated: -1 })
        .skip((page - 1) * limit).limit(limit).populate('agentId', 'name phone');
    const total = await Order.countDocuments(query);
    res.json({ data: orders, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Stats
export const getStats = async (req: Request, res: Response) => {
  try {
    const { agentId, startDate, endDate } = req.query;
    let matchStage: any = {};
    
    if (agentId) {
      matchStage.agentId = agentId;
    }
    
    if (startDate || endDate) {
      matchStage.dateCreated = {};
      if (startDate) matchStage.dateCreated.$gte = new Date(startDate as string);
      if (endDate) matchStage.dateCreated.$lte = new Date(endDate as string);
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

    const stats = await Order.aggregate(pipeline);
    
    const dailyPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateCreated" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 as 1 } }
    ];
    const dailyStats = await Order.aggregate(dailyPipeline);

    res.json({
      summary: stats[0] || { totalRevenue: 0, totalOrders: 0, discountGiven: 0 },
      daily: dailyStats.map(d => ({ date: d._id, revenue: d.revenue, orders: d.orders }))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/** Thống kê doanh thu theo từng đại lý, lọc theo khoảng thời gian và/hoặc đại lý */
export const getStatsRevenueByAgent = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, agentId } = req.query;
    const matchStage: any = { status: { $in: ['completed', 'processing', 'on-hold'] } };

    if (agentId && agentId !== 'all') {
      matchStage.agentId = new mongoose.Types.ObjectId(agentId as string);
    }

    if (startDate || endDate) {
      matchStage.dateCreated = {};
      if (startDate) matchStage.dateCreated.$gte = new Date(startDate as string);
      if (endDate) matchStage.dateCreated.$lte = new Date(endDate as string);
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

    const result = await Order.aggregate(pipeline as any);
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
