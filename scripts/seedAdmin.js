import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/user.model.js';

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected.');

        // Check if admin already exists and delete to ensure fresh password
        const adminExists = await User.findOne({ email: 'admin@trademonk.com' });

        if (adminExists) {
            console.log('Admin user found. Resetting account...');
            await User.deleteOne({ email: 'admin@trademonk.com' });
        }

        // Create admin user
        const adminUser = await User.create({
            fullName: 'Super Admin',
            email: 'admin@trademonk.com',
            password: 'Admin@123', // Will be hashed by pre-save hook
            role: 'admin',
        });

        console.log('Successfully created Admin user!');
        console.log('Email:', adminUser.email);
        console.log('Password: Admin@123');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin user:', error);
        process.exit(1);
    }
};

seedAdmin();
