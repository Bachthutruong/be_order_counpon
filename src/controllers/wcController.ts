import { Request, Response } from 'express';
import * as wcService from '../services/wcService';
import Order from '../models/Order';
import Coupon from '../models/Coupon';

export const doSyncOrders = async () => {
    let page = 1;
    let keepGoing = true;
    let imported = 0;

    const dbCoupons = await Coupon.find();
    const couponMap: Record<string, any> = {};
    dbCoupons.forEach(c => {
      couponMap[c.code.toLowerCase()] = c.agentId;
    });

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
            customerName: `${data.billing?.first_name || ''} ${data.billing?.last_name || ''}`.trim() || 'Guest'
          };

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
         break; // stop on network error or end of items after some imports
      }
    }
    return imported;
};

export const syncOrders = async (req: Request, res: Response) => {
  try {
    const imported = await doSyncOrders();
    res.json({ message: `Successfully synced ${imported} orders`, imported });
  } catch (error: any) {
    console.error('Sync request Error', error);
    res.status(500).json({ message: 'Lỗi hệ thống trong quá trình đồng bộ.' });
  }
};
