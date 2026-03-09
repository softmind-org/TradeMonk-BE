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
    },

    // @desc    Download order invoice as PDF
    // @route   GET /api/v1/orders/:id/invoice
    // @access  Private
    downloadOrderInvoice: async (req, res, next) => {
        try {
            const orderId = req.params.id;
            const currentUserId = req.user._id;
            const currentUserRole = req.user.role;

            const order = await Order.findById(orderId)
                .populate('userId', 'fullName email')
                .populate('sellerId', 'fullName email');

            if (!order) {
                res.status(404);
                throw new Error('Order not found');
            }

            // Authorization: Only Buyer, Seller, or Admin can download
            if (
                order.userId._id.toString() !== currentUserId.toString() &&
                order.sellerId._id.toString() !== currentUserId.toString() &&
                currentUserRole !== 'admin'
            ) {
                res.status(403);
                throw new Error('Not authorized to view this invoice');
            }

            const { generateInvoicePDF } = await import('../utils/pdf.utils.js');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice_${order.orderNumber}.pdf"`);

            // This will pipe the PDF to the response stream
            await generateInvoicePDF(order, res);

        } catch (error) {
            next(error);
        }
    },

    // --- SELLER METHODS ---

    // @desc    Get orders where user is the seller
    // @route   GET /api/v1/orders/seller
    // @access  Private (Seller/Admin)
    getSellerOrders: async (req, res, next) => {
        try {
            const { status } = req.query;
            let filter = { sellerId: req.user._id };

            if (status) {
                // Handle multiple comma-separated statuses if needed
                const statusList = status.split(',');
                filter.orderStatus = { $in: statusList };
            }

            const orders = await Order.find(filter).sort('-createdAt');

            // Sign image URLs for seller orders too
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

    // @desc    Update order status (by seller)
    // @route   PATCH /api/v1/orders/:id/status
    // @access  Private (Seller)
    updateOrderStatus: async (req, res, next) => {
        try {
            const orderId = req.params.id;
            const { status, trackingNumber, shippingCarrier } = req.body;
            const sellerId = req.user._id;

            const validStatuses = ['processing', 'confirmed', 'shipped', 'delivered', 'disputed'];
            if (!validStatuses.includes(status)) {
                res.status(400);
                throw new Error('Invalid status');
            }

            const order = await Order.findById(orderId);

            if (!order) {
                res.status(404);
                throw new Error('Order not found');
            }

            // Verify seller owns this order
            if (order.sellerId.toString() !== sellerId.toString()) {
                res.status(403);
                throw new Error('Unauthorized — not your order');
            }

            // Handle status-specific logic
            if (status === 'shipped') {
                // If tracking data wasn't explicitly provided in this request, we'll allow it anyway 
                // for testing, but ideally they'd provide tracking details.
                order.trackingDetails = {
                    number: trackingNumber || 'TRK-PENDING',
                    carrier: shippingCarrier || 'Standard',
                    shippedAt: new Date()
                };

                // Track 7-day payout hold from ship date
                const clearanceDate = new Date();
                clearanceDate.setDate(clearanceDate.getDate() + 7);
                order.payoutClearanceDate = clearanceDate;
            }

            if (status === 'delivered') {
                order.deliveryDate = new Date();
                // Delivered orders are available for payout immediately
                order.payoutClearanceDate = new Date();
            }

            order.orderStatus = status;
            await order.save();

            res.status(200).json({
                success: true,
                message: `Order marked as ${status}`,
                data: order
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Generate monthly sales CSV report for seller
    // @route   GET /api/v1/orders/seller/report/csv
    // @access  Private (Seller)
    generateMonthlyCsvReport: async (req, res, next) => {
        try {
            const { month, year } = req.query;
            const sellerId = req.user._id;

            if (!month || !year) {
                res.status(400);
                throw new Error('Month and Year are required query parameters');
            }

            // Create date range for the query (JS months are 0-11, so month - 1)
            const startMonth = parseInt(month, 10) - 1;
            const queryYear = parseInt(year, 10);

            const startDate = new Date(Date.UTC(queryYear, startMonth, 1, 0, 0, 0));
            // First day of next month
            const endDate = new Date(Date.UTC(queryYear, startMonth + 1, 1, 0, 0, 0));

            const orders = await Order.find({
                sellerId,
                createdAt: {
                    $gte: startDate,
                    $lt: endDate
                }
            }).sort('createdAt');

            // Generate CSV Header
            const csvHeaders = ['Order ID', 'Date', 'Items', 'Item Total (EUR)', 'Shipping Fee (EUR)', 'Seller Platform Fee (EUR)', 'Seller Net (EUR)', 'Status'];

            // Helper to escape commas and quotes in CSV
            const sanitizeCsvField = (field) => {
                if (field === null || field === undefined) return '';
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('\"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            };

            // Map orders to CSV rows
            const csvRows = orders.map(order => {
                const dateStr = order.createdAt.toISOString().replace('T', ' ').substring(0, 16);
                const itemsList = order.items.map(i => `${i.title} x${i.quantity}`).join(', ');

                return [
                    order.orderNumber,
                    dateStr,
                    itemsList,
                    (order.feeBreakdown?.itemsTotal || 0).toFixed(2),
                    (order.feeBreakdown?.shippingFee || 0).toFixed(2),
                    (order.feeBreakdown?.platformFee || 0).toFixed(2),
                    (order.feeBreakdown?.sellerNet || 0).toFixed(2),
                    order.orderStatus
                ].map(sanitizeCsvField).join(',');
            });

            const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

            const paddedMonth = String(month).padStart(2, '0');
            const fileName = `sales_report_${paddedMonth}_${year}.csv`;

            // Instruct browser to download file
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Don't format as JSON, just send the raw text
            res.status(200).send(csvContent);
        } catch (error) {
            next(error);
        }
    },

    // --- ADMIN METHODS ---

    // @desc    Get all orders (admin view)
    // @route   GET /api/v1/orders/all
    // @access  Private (Admin)
    getAllOrders: async (req, res, next) => {
        try {
            const orders = await Order.find()
                .populate('userId', 'fullName email')
                .populate('sellerId', 'fullName email')
                .sort('-createdAt');

            res.status(200).json({
                success: true,
                count: orders.length,
                data: orders
            });
        } catch (error) {
            next(error);
        }
    }
};

export default orderController;
