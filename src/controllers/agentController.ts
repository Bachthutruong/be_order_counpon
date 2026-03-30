import { Request, Response } from 'express';
import Coupon from '../models/Coupon';
import Config from '../models/Config';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/authMiddleware';
import * as wcService from '../services/wcService';

export const getMyCoupons = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    let query: any = { agentId: req.user?._id };
    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit);
    const total = await Coupon.countDocuments(query);
    res.json({ data: coupons, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMyCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const { code, discountType, discountValue } = req.body;
    
    // Validate custom rules!
    const config = await Config.findOne() || {
      minDiscountPercent: 10, maxDiscountPercent: 50,
      minDiscountFixed: 20000, maxDiscountFixed: 501100,
      applyRules: true
    };

    if (config.applyRules) {
      if (discountType === 'percent') {
        if (discountValue < config.minDiscountPercent || discountValue > config.maxDiscountPercent) {
          return res.status(400).json({ message: `折扣 % 須介於 ${config.minDiscountPercent}% 至 ${config.maxDiscountPercent}%` });
        }
      } else {
        if (discountValue < config.minDiscountFixed || discountValue > config.maxDiscountFixed) {
          return res.status(400).json({ message: `折扣金額須介於 ${config.minDiscountFixed} 至 ${config.maxDiscountFixed}` });
        }
      }
    }

    // Sync to WC
    let wcId;
    try {
      const wcCoupon = await wcService.createCoupon(code, discountValue.toString(), discountType);
      wcId = wcCoupon.id;
    } catch (e: any) {
      console.log('Error creating WP coupon by Agent', e.response?.data || e.message);
      return res.status(400).json({ message: '與 WordPress 建立折扣碼時發生錯誤' });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      agentId: req.user?._id,
      wcCouponId: wcId,
    });
    
    res.status(201).json(coupon);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMyCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const { discountType, discountValue } = req.body;
    const coupon = await Coupon.findOne({ _id: req.params.id, agentId: req.user?._id });
    if (!coupon) return res.status(404).json({ message: '找不到折扣碼' });

    // Validate rules
    const config = await Config.findOne() || { applyRules: true, minDiscountPercent: 10, maxDiscountPercent: 50, minDiscountFixed: 20000, maxDiscountFixed: 500000 };
    if (config.applyRules) {
        if (discountType === 'percent') {
          if (discountValue < config.minDiscountPercent || discountValue > config.maxDiscountPercent) {
            return res.status(400).json({ message: `折扣 % 須介於 ${config.minDiscountPercent}% 至 ${config.maxDiscountPercent}%` });
          }
        } else {
          if (discountValue < config.minDiscountFixed || discountValue > config.maxDiscountFixed) {
            return res.status(400).json({ message: `折扣金額須介於 ${config.minDiscountFixed} 至 ${config.maxDiscountFixed}` });
          }
        }
    }

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

export const deleteMyCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, agentId: req.user?._id });
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

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    let query: any = { agentId: req.user?._id };
    if (search) {
      query.$and = [
        { agentId: req.user?._id },
        { 
          $or: [
            { customerName: { $regex: search, $options: 'i' } },
            { couponCodeUsed: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }
    
    // Luôn luôn lọc bỏ các đơn hàng rác và nháp
    query.status = { $nin: ['trash', 'checkout-draft', 'auto-draft', 'draft'] };

    const orders = await Order.find(query).sort({ dateCreated: -1 })
        .skip((page - 1) * limit).limit(limit);
    const total = await Order.countDocuments(query);
    res.json({ data: orders, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let matchStage: any = { agentId: req.user?._id, status: { $in: ['completed', 'processing', 'on-hold'] } };
    
    if (startDate || endDate) {
      matchStage.dateCreated = {};
      if (startDate) matchStage.dateCreated.$gte = new Date(startDate as string);
      if (endDate) matchStage.dateCreated.$lte = new Date(endDate as string);
    }

    const stats = await Order.aggregate([
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
