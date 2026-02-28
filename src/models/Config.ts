import mongoose, { Schema, Document } from 'mongoose';

export interface IConfig extends Document {
  minDiscountPercent: number;
  maxDiscountPercent: number;
  minDiscountFixed: number;
  maxDiscountFixed: number;
}

const ConfigSchema: Schema = new Schema({
  minDiscountPercent: { type: Number, default: 0 },
  maxDiscountPercent: { type: Number, default: 100 },
  minDiscountFixed: { type: Number, default: 0 },
  maxDiscountFixed: { type: Number, default: 999999999 },
}, { timestamps: true });

export default mongoose.model<IConfig>('Config', ConfigSchema);
