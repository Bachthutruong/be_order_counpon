import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
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

export const createAgent = async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;
    const exists = await User.findOne({ phone });
    if (exists) {
      return res.status(400).json({ message: 'Phone already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456789', salt);

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
    res.json({ message: 'Agent deleted' });
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
    const { minDiscountPercent, maxDiscountPercent, minDiscountFixed, maxDiscountFixed, applyRules } = req.body;
    let config = await Config.findOne();
    if (!config) {
      config = new Config({});
    }
    config.minDiscountPercent = minDiscountPercent;
    config.maxDiscountPercent = maxDiscountPercent;
    config.minDiscountFixed = minDiscountFixed;
    config.maxDiscountFixed = maxDiscountFixed;
    config.applyRules = applyRules;
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
      return res.status(400).json({ message: 'Lỗi đồng bộ mã với WordPress' });
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
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

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
    if (!coupon) return res.status(404).json({ message: 'Not found' });

    if (coupon.wcCouponId) {
       try {
         await wcService.deleteCoupon(coupon.wcCouponId);
       } catch (e) {
         console.log('WP Coupon delete failed', e);
       }
    }
    
    await coupon.deleteOne();
    res.json({ message: 'Deleted' });
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

    // Usually we only count completed/processing orders towards revenue
    // matchStage.status = { $in: ['completed', 'processing'] };
    // Depending on WP order statuses: pending, processing, on-hold, completed, cancelled, refunded, failed
    matchStage.status = { $in: ['completed', 'processing', 'on-hold'] }; // Typical valid orders

    const pipeline = [
      { $match: matchStage },
      { 
        $group: {
          _id: null, // Group total summary
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
          discountGiven: { $sum: "$discountTotal" }
        }
      }
    ];

    const stats = await Order.aggregate(pipeline);
    
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
