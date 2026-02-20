import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import crypto from 'crypto';
import { signImageUrls } from '../utils/s3.utils.js';

const orderController = {
    // @desc    Create new order (per-seller) and clear seller's items from cart
    // @route   POST /api/v1/orders
    // @access  Private
    createOrder: async (req, res, next) => {
        try {
            const { items, totalAmount, sellerId, feeBreakdown, shippingAddress, paymentIntentId } = req.body;

            if (!items || items.length === 0) {
                res.status(400);
                throw new Error('No items in order');
            }

            if (!sellerId) {
                res.status(400);
                throw new Error('sellerId is required');
            }

            // Generate unique order number
            const orderNumber = `TM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

            const order = await Order.create({
                userId: req.user._id,
                sellerId,
                orderNumber,
                items,
                totalAmount,
                feeBreakdown,
                shippingAddress,
                paymentStatus: 'paid',
                orderStatus: 'processing',
                transferStatus: 'pending',
                paymentIntentId
            });

            // Clear only this seller's items from cart (not entire cart)
            const productIds = items.map(item => item.productId);
            await Cart.deleteMany({
                userId: req.user._id,
                productId: { $in: productIds }
            });

            res.status(201).json({
                success: true,
                data: order
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Get user's order history
    // @route   GET /api/v1/orders
    // @access  Private
    getMyOrders: async (req, res, next) => {
        try {
            const orders = await Order.find({ userId: req.user._id }).sort('-createdAt');

            // Sign S3 image URLs in order items
            const signedOrders = await signImageUrls(orders);

            res.status(200).json({
                success: true,
                count: signedOrders.length,
                data: signedOrders
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Get single order details
    // @route   GET /api/v1/orders/:id
    // @access  Private
    getOrderById: async (req, res, next) => {
        try {
            const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });

            if (!order) {
                res.status(404);
                throw new Error('Order not found');
            }

            // Sign S3 image URLs in order items
            const signedOrder = await signImageUrls(order);

            res.status(200).json({
                success: true,
                data: signedOrder
            });
        } catch (error) {
            next(error);
        }
    }
};

export default orderController;
