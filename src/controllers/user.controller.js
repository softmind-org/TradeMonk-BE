import userService from '../services/user.service.js';
import { getSignedImageUrl } from '../utils/s3.utils.js';
import User from '../models/user.model.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import Favorite from '../models/favorite.model.js';

const userController = {
    // Get logged in user profile
    getProfile: async (req, res, next) => {
        try {
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

    // Get logged in user stats (Buyer/Collector/Seller perspective)
    getMyStats: async (req, res, next) => {
        try {
            const userId = req.user?._id;
            const userRole = req.user?.role?.toLowerCase();
            
            console.log(`[DEBUG] getMyStats for user: ${userId}, role: ${userRole}`);

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Not authorized' });
            }

            if (userRole === 'seller') {
                try {
                    // 1. Total Sales (GMV) - Sum of totalAmount for paid orders where user is seller
                    const salesOrders = await Order.find({
                        sellerId: userId,
                        paymentStatus: 'paid'
                    }).lean();
                    

                    const totalSales = salesOrders.reduce((sum, order) => {
                        return sum + (Number(order?.totalAmount) || 0);
                    }, 0);

                    const totalSalesNet = salesOrders.reduce((sum, order) => {
                        return sum + (Number(order?.feeBreakdown?.sellerNet) || 0);
                    }, 0);

                    // 2. Active Listings
                    const activeListings = await Product.countDocuments({
                        'seller.userId': userId,
                        status: 'active'
                    }).catch(e => 0);

                    // 3. Pending Orders (Seller perspective: Confirmed but not yet shipped)
                    const pendingOrdersCount = await Order.countDocuments({
                        sellerId: userId,
                        orderStatus: 'confirmed'
                    }).catch(e => 0);

                    // 4. Recent Activity (Latest 5 items)
                    const recentOrders = await Order.find({ sellerId: userId })
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .lean()
                        .catch(e => []);
                    
                    const recentProducts = await Product.find({ 'seller.userId': userId })
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .lean()
                        .catch(e => []);

                    const recentActivity = [
                        ...recentOrders.map(o => ({
                            id: `ord-${o?._id}`,
                            action: `${o?.items?.[0]?.title || 'Item'} Sold`,
                            time: o?.createdAt || new Date(),
                            type: 'sale'
                        })),
                        ...recentProducts.map(p => ({
                            id: `prod-${p?._id}`,
                            action: `New Listing: ${p?.name}`,
                            time: p?.createdAt || new Date(),
                            type: 'listing'
                        }))
                    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

                    return res.status(200).json({
                        success: true,
                        data: {
                            totalSales,
                            totalSalesNet,
                            activeListings,
                            pendingOrdersCount,
                            recentActivity,
                            storeRating: 4.9,
                            followers: 0
                        }
                    });
                } catch (innerError) {
                    console.error('[SELLER_STATS_ERROR] Calculating seller stats:', innerError);
                    return res.status(500).json({
                        success: false,
                        message: `Seller Stats Error: ${innerError.message}`
                    });
                }
            }

            // Buyer / Collector stats (Fallback or for Admin/Buyer)
            try {
                const activeOrders = await Order.countDocuments({
                    userId,
                    orderStatus: { $in: ['processing', 'shipped', 'confirmed'] }
                }).catch(e => {
                    console.error('[BUYER_STATS_COUNT_ERROR] Order.countDocuments failed:', e);
                    return 0;
                });

                const totalPurchases = await Order.countDocuments({
                    userId,
                    paymentStatus: 'paid'
                }).catch(e => 0);

                const savedItems = await Favorite.countDocuments({ user: userId }).catch(e => {
                    console.error('[BUYER_STATS_FAVORITE_ERROR] Favorite.countDocuments failed:', e);
                    return 0;
                });

                return res.status(200).json({
                    success: true,
                    data: {
                        activeOrders,
                        totalPurchases,
                        savedItems
                    }
                });
            } catch (innerError) {
                console.error('[BUYER_STATS_ERROR] Calculating buyer stats:', innerError);
                return res.status(500).json({
                    success: false,
                    message: `Buyer Stats Error: ${innerError.message}`
                });
            }
        } catch (error) {
            console.error('[CRITICAL_STATS_ERROR] in getMyStats:', error);
            res.status(500).json({
                success: false,
                message: `Critical Stats Error: ${error.message}`
            });
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

    // @desc    Update user details (Admin)
    // @route   PUT /api/v1/users/:id
    // @access  Private (Admin)
    adminUpdateUser: async (req, res, next) => {
        try {
            const { fullName, email } = req.body;
            const userId = req.params.id;

            const user = await User.findById(userId);
            if (!user) {
                res.status(404);
                throw new Error('User not found');
            }

            // Check if email is already taken by another user
            if (email && email !== user.email) {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    res.status(400);
                    throw new Error('Email is already in use by another account');
                }
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: { fullName, email } },
                { new: true, runValidators: true }
            );

            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                data: updatedUser
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
