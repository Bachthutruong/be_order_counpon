import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';

import connectDB from './config/db';
import User from './models/User';

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import agentRoutes from './routes/agentRoutes';
import wcRoutes from './routes/wcRoutes';
import { doSyncOrders } from './controllers/wcController';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/wc', wcRoutes);

const PORT = process.env.PORT || 5011;

const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'ADMIN' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'System Admin',
                phone: 'admin',
                password: hashedPassword,
                role: 'ADMIN',
                isFirstLogin: false, // Default admin doesn't need to change password immediately
                active: true
            });
            console.log('Default admin seeded: phone=admin password=admin123');
        }
    } catch (e) {
        console.error('Seed error:', e);
    }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedAdmin();
  
  // Auto sync WooCommerce orders every 5 minutes
  setInterval(() => {
    console.log('Running auto background sync...');
    doSyncOrders().catch(e => console.error('Background sync failed', e));
  }, 5 * 60 * 1000);
});
