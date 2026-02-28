import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  password?: string;
  role: 'ADMIN' | 'AGENT';
  name: string;
  isFirstLogin: boolean;
  active: boolean;
}

const UserSchema: Schema = new Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'AGENT'], required: true, default: 'AGENT' },
  name: { type: String, required: true },
  isFirstLogin: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
