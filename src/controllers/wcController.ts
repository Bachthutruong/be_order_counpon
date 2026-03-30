import { Request, Response } from 'express';
import * as wcService from '../services/wcService';
import Order from '../models/Order';
import Coupon from '../models/Coupon';

const dbCouponsToMap = async () => {
  const dbCoupons = await Coupon.find();
  const couponMap: Record<string, any> = {};
  dbCoupons.forEach(c => { couponMap[c.code.toLowerCase()] = c.agentId; });
  return couponMap;
};

const mapWcOrderToLocal = (data: any, couponMap: Record<string, any>) => {
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
    customerName: `${data.billing?.first_name || ''} ${data.billing?.last_name || ''}`.trim() || 'Guest'
  };
};

/** Đồng bộ một đơn từ WC vào DB (dùng cho webhook và sau khi update) */
export const syncSingleOrder = async (wcOrderId: number): Promise<boolean> => {
  const couponMap = await dbCouponsToMap();
  try {
    const data = await wcService.getOrder(wcOrderId);
    
    // Nếu đơn hàng đã bị xóa (vào thùng rác), xóa luôn ở DB local
    if (data.status === 'trash') {
      console.log(`Order ${wcOrderId} is trashed, removing locally.`);
      await Order.findOneAndDelete({ wcOrderId });
      return true;
    }

    const orderData = mapWcOrderToLocal(data, couponMap);
    await Order.findOneAndUpdate({ wcOrderId }, orderData, { upsert: true });
    return true;
  } catch (e: any) {
    // Nếu WC báo 404, có nghĩa đơn hàng đã bị xóa vĩnh viễn
    if (e.response?.status === 404) {
      console.log(`Order ${wcOrderId} not found in WC, removing locally.`);
      await Order.findOneAndDelete({ wcOrderId });
      return true;
    }
    console.error('syncSingleOrder error', wcOrderId, e.response?.data?.message || e.message);
    return false;
  }
};

export const doSyncOrders = async () => {
    let page = 1;
    let keepGoing = true;
    let imported = 0;

    const couponMap = await dbCouponsToMap();

    while (keepGoing) {
      try {
        const wcOrders = await wcService.getOrders(page);

        if (!Array.isArray(wcOrders)) {
          console.error('WC API returned non-array:', wcOrders);
          throw new Error(typeof wcOrders === 'object' && wcOrders.message ? wcOrders.message : 'WC API returned unexpected format');
        }
        if (wcOrders.length === 0) {
          keepGoing = false;
          break;
        }
        
        for (const data of wcOrders) {
          if (data.status === 'trash') {
            await Order.findOneAndDelete({ wcOrderId: data.id });
            continue;
          }
          const orderData = mapWcOrderToLocal(data, couponMap);
          await Order.findOneAndUpdate({ wcOrderId: data.id }, orderData, { upsert: true });
          imported++;
        }
        page++;
      } catch (error: any) {
         const errorMsg = error.response?.data?.message || error.message;
         console.error(`doSyncOrders page ${page} Error:`, errorMsg);
         if (imported === 0) {
            throw new Error(errorMsg);
         }
         break;
      }
    }
    return imported;
};

export const syncOrders = async (req: Request, res: Response) => {
  try {
    const imported = await doSyncOrders();
    res.json({ message: `已同步 ${imported} 筆訂單`, imported });
  } catch (error: any) {
    console.error('Sync request Error', error);
    res.status(500).json({ message: '同步過程中發生系統錯誤。' });
  }
};

/** Chi tiết đơn hàng (lấy từ WC + merge agent từ DB) */
export const getOrderDetail = async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.wcOrderId) ? req.params.wcOrderId[0] : req.params.wcOrderId;
    const wcOrderId = parseInt(idParam ?? '', 10);
    if (isNaN(wcOrderId)) return res.status(400).json({ message: '訂單 ID 無效' });
    const wcOrder = await wcService.getOrder(wcOrderId);
    const local = await Order.findOne({ wcOrderId }).populate('agentId', 'name phone');
    res.json({
      ...wcOrder,
      agentId: local?.agentId,
      couponCodeUsed: local?.couponCodeUsed,
    });
  } catch (error: any) {
    const msg = error.response?.data?.message || error.message;
    if (error.response?.status === 404) return res.status(404).json({ message: 'WordPress 中找不到此訂單' });
    res.status(500).json({ message: msg });
  }
};

/** Cập nhật đơn hàng trên WordPress rồi đồng bộ lại DB (dùng luôn response từ WC để ghi DB, tránh lệch dữ liệu) */
export const updateOrder = async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.wcOrderId) ? req.params.wcOrderId[0] : req.params.wcOrderId;
    const wcOrderId = parseInt(idParam ?? '', 10);
    if (isNaN(wcOrderId)) return res.status(400).json({ message: '訂單 ID 無效' });
    const { status, billing } = req.body;
    const payload: { status?: string; billing?: Record<string, string> } = {};
    if (status !== undefined) payload.status = status;
    if (billing !== undefined) payload.billing = billing;

    const wcUpdated = await wcService.updateOrder(wcOrderId, payload);
    const couponMap = await dbCouponsToMap();
    const orderData = mapWcOrderToLocal(wcUpdated, couponMap);
    await Order.findOneAndUpdate({ wcOrderId }, orderData, { upsert: true, new: true });
    const local = await Order.findOne({ wcOrderId }).populate('agentId', 'name phone');
    res.json(local);
  } catch (error: any) {
    const msg = error.response?.data?.message || error.message;
    if (error.response?.status === 404) return res.status(404).json({ message: 'WordPress 中找不到此訂單' });
    res.status(500).json({ message: msg });
  }
};

/** Webhook do WordPress gọi khi có đơn mới/cập nhật/xóa – đồng bộ đơn đó ngay */
export const webhookOrder = async (req: Request, res: Response) => {
  try {
    const topic = req.headers['x-wc-webhook-topic'] || '';
    const id = req.body?.id ?? req.body?.order_id;
    const wcOrderId = typeof id === 'number' ? id : parseInt(String(id), 10);

    if (isNaN(wcOrderId)) {
      console.error('Webhook: Invalid Order ID', req.body);
      return res.status(400).json({ message: '請求內容缺少或無效的訂單 ID' });
    }

    console.log(`Webhook received: Topic=${topic}, OrderID=${wcOrderId}`);

    // Xử lý các trường hợp xóa đơn hàng
    if (topic === 'order.deleted' || topic === 'order.trashed') {
      await Order.findOneAndDelete({ wcOrderId });
      console.log(`Order ${wcOrderId} deleted via webhook topic: ${topic}`);
      return res.status(200).json({ synced: true, action: 'deleted' });
    }

    const ok = await syncSingleOrder(wcOrderId);
    res.status(ok ? 200 : 500).json({ synced: ok });
  } catch (error: any) {
    console.error('webhookOrder error', error);
    res.status(500).json({ message: error.message });
  }
};

export const doSyncCoupons = async () => {
    const coupons = await Coupon.find();
    let synced = 0;

    for (const coupon of coupons) {
        if (!coupon.wcCouponId) {
            try {
                // Try create in WC
                const wcResult = await wcService.createCoupon(coupon.code, coupon.discountValue.toString(), coupon.discountType);
                if (wcResult && wcResult.id) {
                    coupon.wcCouponId = wcResult.id;
                    await coupon.save();
                    synced++;
                } else {
                    const errorMsg = wcResult.message || 'WC API returned success but no ID found';
                    console.error(`Sync coupon ${coupon.code} failed:`, errorMsg);
                    // We don't increment synced here
                    if (coupons.length === 1) throw new Error(errorMsg);
                }
            } catch (e: any) {
                // If code already exists in WC, we should ideally fetch it, but usually it's just a sync conflict.
                console.error(`Sync coupon ${coupon.code} failed:`, e.response?.data?.message || e.message);
                // If it already exists, error message may contain "ID already exists" or similar.
            }
        }
    }
    return synced;
};

export const syncCoupons = async (req: Request, res: Response) => {
    try {
        const synced = await doSyncCoupons();
        res.json({ message: `已同步 ${synced} 個折扣碼至 WordPress`, synced });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
