import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const testSuspension = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find a test user (buyer or seller)
        const user = await User.findOne({ role: { $ne: 'admin' } });
        if (!user) {
            console.log('No test user found');
            return;
        }

        console.log(`Testing user: ${user.fullName} (${user.email})`);
        console.log(`Current status: ${user.status}`);

        // Toggle to suspended
        user.status = 'suspended';
        await user.save({ validateBeforeSave: false });
        console.log('Status set to suspended and saved');

        // Refresh from DB
        const refreshedUser = await User.findById(user._id);
        console.log(`Refreshed status: ${refreshedUser.status}`);

        if (refreshedUser.status === 'suspended') {
            console.log('✅ TEST PASSED: Status correctly persisted');
        } else {
            console.log('❌ TEST FAILED: Status did not persist');
        }

        // Toggle back to active
        refreshedUser.status = 'active';
        await refreshedUser.save({ validateBeforeSave: false });
        console.log('Status set back to active and saved');

        const finalUser = await User.findById(user._id);
        console.log(`Final status: ${finalUser.status}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Test error:', error);
    }
};

testSuspension();
