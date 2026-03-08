import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone, active: true });

    if (!user) {
      return res.status(401).json({ message: '帳號或密碼錯誤，或帳號已停用' });
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return res.status(401).json({ message: '帳號或密碼錯誤' });
    }

    const token = generateToken(user._id.toString());
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // Required for sameSite: 'none'
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isFirstLogin: user.isFirstLogin,
      token, // Also send in body just in case
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({ message: '找不到使用者' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password as string);
    if (!isMatch) {
      return res.status(400).json({ message: '目前密碼錯誤' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.isFirstLogin = false; // Mark as not first login
    await user.save();

    res.json({ message: '密碼已更新' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        expires: new Date(0),
    });
    res.json({ message: '已登出' });
}
