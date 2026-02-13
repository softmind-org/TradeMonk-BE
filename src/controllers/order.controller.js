import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import crypto from 'crypto';

const orderController = {
    // @desc    Create new order and clear cart
    // @route   POST /api/v1/orders
    // @access  Private
    createOrder: async (req, res, next) => {
        try {
            const { items, totalAmount, shippingAddress, paymentIntentId } = req.body;

            if (!items || items.length === 0) {
                res.status(400);
                throw new Error('No items in order');
            }

            // Generate unique order number
            const orderNumber = `TM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

            const order = await Order.create({
                userId: req.user._id,
                orderNumber,
                items,
                totalAmount,
                shippingAddress,
                paymentStatus: 'paid', // Assuming frontend only calls this after stripe success
                orderStatus: 'grading',
                paymentIntentId
            });

            // Clear user's cart after successful order creation
            await Cart.deleteMany({ userId: req.user._id });

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

            res.status(200).json({
                success: true,
                count: orders.length,
                data: orders
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

            res.status(200).json({
                success: true,
                data: order
            });
        } catch (error) {
            next(error);
        }
    }
};

export default orderController;
