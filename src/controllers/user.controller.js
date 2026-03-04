import userService from '../services/user.service.js';

const userController = {
    // Create a new user
    createUser: async (req, res, next) => {
        try {
            const user = await userService.createUser(req.body);
            res.status(201).json({
                success: true,
                data: user,
            });
        } catch (error) {
            if (error.code === 11000) {
                res.status(400);
                return next(new Error('Email already exists'));
            }
            next(error);
        }
    },

    // Get all users
    getUsers: async (req, res, next) => {
        try {
            const users = await userService.getUsers();
            // Just returning all users. We might want to remove passwords.
            res.status(200).json({
                success: true,
                count: users.length,
                data: users,
            });
        } catch (error) {
            next(error);
        }
    },

    // Get user details by ID
    getUserById: async (req, res, next) => {
        try {
            const user = await userService.getUserById(req.params.id);
            if (!user) {
                res.status(404);
                throw new Error('User not found');
            }

            // Get stats (this is simplified, optimally this would be in the service and use aggregation)
            const Order = (await import('../models/order.model.js')).default;

            // Stats for buyer
            let purchasesCount = 0;
            let totalVolume = 0;

            if (user.role === 'buyer' || user.role === 'seller') {
                const orders = await Order.find({ userId: user._id, paymentStatus: 'paid' });
                purchasesCount = orders.length;
                totalVolume = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
            }

            // For trust score, let's use a placeholder calculation
            const trustScore = user.status === 'active' ? 98 : 45;

            res.status(200).json({
                success: true,
                data: {
                    user,
                    stats: {
                        totalPurchases: purchasesCount,
                        totalVolume,
                        trustScore
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // Toggle user status
    toggleUserStatus: async (req, res, next) => {
        try {
            const { status } = req.body;
            if (!['active', 'suspended'].includes(status)) {
                res.status(400);
                throw new Error('Invalid status. Must be active or suspended.');
            }

            const user = await userService.getUserById(req.params.id);
            if (!user) {
                res.status(404);
                throw new Error('User not found');
            }

            // Cannot suspend admin
            if (user.role === 'admin') {
                res.status(400);
                throw new Error('Cannot change status of admin users');
            }

            user.status = status;
            await user.save({ validateBeforeSave: false });

            res.status(200).json({
                success: true,
                message: `User account ${status}`,
                data: user
            });
        } catch (error) {
            next(error);
        }
    }
};

export default userController;
