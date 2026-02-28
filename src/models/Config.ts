import mongoose, { Schema, Document } from 'mongoose';

export interface IConfig extends Document {
  minDiscountPercent: number;
  maxDiscountPercent: number;
  minDiscountFixed: number;
  maxDiscountFixed: number;
  applyRules: boolean;
}

const ConfigSchema: Schema = new Schema({
  minDiscountPercent: { type: Number, default: 0 },
  maxDiscountPercent: { type: Number, default: 100 },
  minDiscountFixed: { type: Number, default: 0 },
  maxDiscountFixed: { type: Number, default: 999999999 },
  applyRules: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IConfig>('Config', ConfigSchema);
