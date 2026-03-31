import userService from '../services/user.service.js';
import { getSignedImageUrl } from '../utils/s3.utils.js';

const userController = {
    // Get logged in user profile
    getProfile: async (req, res, next) => {
        try {
            const User = (await import('../models/user.model.js')).default;
            const user = await User.findById(req.user._id);

            if (!user) {
                res.status(404);
                throw new Error('User not found');
            }

            const userObj = user.toObject();
            if (userObj.storeLogo) {
                userObj.storeLogo = await getSignedImageUrl(userObj.storeLogo);
            }

            res.status(200).json({
                success: true,
                data: userObj
            });
        } catch (error) {
            next(error);
        }
    },

    // Update user profile
    updateProfile: async (req, res, next) => {
        try {
            const User = (await import('../models/user.model.js')).default;
            const user = await User.findById(req.user._id);

            if (!user) {
                res.status(404);
                throw new Error('User not found');
            }

            const { fullName, storeName, warehouseAddress } = req.body;

            const updateFields = {};
            if (fullName !== undefined) updateFields.fullName = fullName;
            if (storeName !== undefined) updateFields.storeName = storeName;
            
            // Handle logo upload using S3 middleware configuration
            if (req.file) {
                updateFields.storeLogo = req.file.key || req.file.location;
            }

            if (warehouseAddress !== undefined) {
                if (typeof warehouseAddress === 'string') {
                    try {
                        updateFields.warehouseAddress = JSON.parse(warehouseAddress);
                    } catch (e) {
                        // fallback if unparseable
                    }
                } else {
                    updateFields.warehouseAddress = warehouseAddress;
                }
            }

            const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: updateFields }, { new: true });

            const userObj = updatedUser.toObject();
            if (userObj.storeLogo) {
                userObj.storeLogo = await getSignedImageUrl(userObj.storeLogo);
            }

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: userObj
            });
        } catch (error) {
            next(error);
        }
    },

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
    },

    // --- SELLER ADMIN METHODS ---

    // @desc    Get all sellers with stats
    // @route   GET /api/v1/users/sellers
    // @access  Private (Admin)
    getSellers: async (req, res, next) => {
        try {
            const User = (await import('../models/user.model.js')).default;
            const Product = (await import('../models/product.model.js')).default;
            const Order = (await import('../models/order.model.js')).default;

            const sellers = await User.find({ role: 'seller' }).sort('-createdAt');

            // Enrich each seller with listing count and GMV
            const enrichedSellers = await Promise.all(
                sellers.map(async (seller) => {
                    const activeListings = await Product.countDocuments({
                        'seller.userId': seller._id,
                        status: 'active'
                    });

                    const orders = await Order.find({
                        sellerId: seller._id,
                        paymentStatus: 'paid'
                    });
                    const totalGmv = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

                    return {
                        ...seller.toObject(),
                        activeListings,
                        totalGmv,
                    };
                })
            );

            res.status(200).json({
                success: true,
                count: enrichedSellers.length,
                data: enrichedSellers,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Get seller detail with full stats
    // @route   GET /api/v1/users/sellers/:id
    // @access  Private (Admin)
    getSellerDetail: async (req, res, next) => {
        try {
            const User = (await import('../models/user.model.js')).default;
            const Product = (await import('../models/product.model.js')).default;
            const Order = (await import('../models/order.model.js')).default;

            const seller = await User.findById(req.params.id);
            if (!seller || seller.role !== 'seller') {
                res.status(404);
                throw new Error('Seller not found');
            }

            // Stats
            const totalListings = await Product.countDocuments({ 'seller.userId': seller._id });
            const orders = await Order.find({ sellerId: seller._id, paymentStatus: 'paid' });
            const totalGmv = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            const refundedOrders = await Order.countDocuments({ sellerId: seller._id, paymentStatus: 'refunded' });
            const refundRate = orders.length > 0 ? ((refundedOrders / orders.length) * 100).toFixed(1) : '0.0';

            // Top listing (highest price active listing)
            let topListing = await Product.findOne({ 'seller.userId': seller._id, status: 'active' })
                .sort('-price')
                .lean();

            if (topListing) {
                const { signImageUrls } = await import('../utils/s3.utils.js');
                topListing = await signImageUrls(topListing);
            }

            res.status(200).json({
                success: true,
                data: {
                    seller,
                    stats: {
                        totalGmv,
                        totalListings,
                        followers: 0, // Placeholder
                        disputes: 0,  // Placeholder
                        refundRate: `${refundRate}%`,
                        storeRating: 4.9, // Placeholder
                    },
                    topListing,
                }
            });
        } catch (error) {
            next(error);
        }
    },
};

export default userController;
