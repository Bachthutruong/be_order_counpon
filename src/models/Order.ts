import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  wcOrderId: number;
  total: number;
  discountTotal: number;
  couponCodeUsed?: string;
  agentId?: mongoose.Types.ObjectId | null;
  status: string;
  dateCreated: Date;
  currency: string;
  customerName: string;
}

const OrderSchema: Schema = new Schema({
  wcOrderId: { type: Number, required: true, unique: true },
  total: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  couponCodeUsed: { type: String },
  agentId: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, required: true },
  dateCreated: { type: Date, required: true },
  customerName: { type: String },
  currency: { type: String },
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);
