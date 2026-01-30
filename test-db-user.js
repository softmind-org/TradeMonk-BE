import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/user.model.js';

dotenv.config();

const listUsers = async () => {
    console.log('Listing all registered users...');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({}, 'email role fullName');

        if (users.length > 0) {
            console.log('\n--- Registered Users ---');
            users.forEach(u => {
                console.log(`ID: ${u._id}`);
                console.log(`Email: ${u.email}`);
                console.log(`Role: ${u.role}`);
                console.log(`Name: ${u.fullName}`);
                console.log('------------------------');
            });
        } else {
            console.log('❌ No users found in database.');
        }
    } catch (error) {
        console.error('❌ DB Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
};

listUsers();
