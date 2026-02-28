import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  discountType: 'percent' | 'fixed_cart';
  discountValue: number;
  agentId: mongoose.Types.ObjectId;
  wcCouponId?: number;
  active: boolean;
}

const CouponSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true },
  discountType: { type: String, enum: ['percent', 'fixed_cart'], required: true },
  discountValue: { type: Number, required: true },
  agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  wcCouponId: { type: Number },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<ICoupon>('Coupon', CouponSchema);
