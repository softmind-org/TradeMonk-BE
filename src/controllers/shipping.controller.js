import sendcloudService from '../services/sendcloud.service.js';

const shippingController = {
    // @desc    Get shipping methods estimation
    // @route   GET /api/v1/shipping/methods
    // @access  Public
    getShippingMethods: async (req, res, next) => {
        try {
            const { from, to, weight } = req.query;
            
            // Convert weight to number, default to 500g
            const weightNum = weight ? parseInt(weight) : 500;
            
            const methods = await sendcloudService.getShippingMethods(from, to, weightNum);
            
            res.status(200).json({
                success: true,
                count: methods.length,
                data: methods
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Estimate shipping dynamically manually assigning tiers and margins
    // @route   POST /api/v1/shipping/estimate
    // @access  Public
    estimateShipping: async (req, res, next) => {
        try {
            const { destinationCountry, sellerGroups } = req.body;

            if (!destinationCountry || !sellerGroups || !Array.isArray(sellerGroups)) {
                res.status(400);
                throw new Error('destinationCountry and sellerGroups are required');
            }

            const User = (await import('../models/user.model.js')).default;
            const estimates = {};

            // Tier/Carrier rules mappings
            const getRequiredCarrier = (originCountry) => {
                switch (originCountry.toUpperCase()) {
                    case 'NL': return 'postnl';
                    case 'DE': return 'dhl';
                    case 'BE': return 'bpost';
                    case 'FR': return 'colissimo'; // Using Colissimo as default La Poste equivalent for Sendcloud
                    default: return null; 
                }
            };

            const getRequiredTier = (value) => {
                if (value <= 15) return 'mailbox';
                if (value > 15 && value < 150) return 'tracked';
                if (value >= 150) return 'insured';
                return 'tracked';
            };

            // Loop through each seller to determine shipping
            for (const group of sellerGroups) {
                const sellerId = group.sellerId;
                const itemsTotal = group.itemsTotal || 0;
                
                const seller = await User.findById(sellerId);
                const originCountry = seller?.warehouseAddress?.country || 'NL';
                
                const requiredCarrier = getRequiredCarrier(originCountry);
                const requiredTier = getRequiredTier(itemsTotal);
                
                // Fetch all raw methods between these countries
                const availableMethods = await sendcloudService.getShippingMethods(originCountry, destinationCountry, 500);
                
                // 1. Filter by required carrier (if rule applies)
                let carrierMethods = availableMethods;
                if (requiredCarrier) {
                    const filtered = availableMethods.filter(m => m.carrier?.toLowerCase().includes(requiredCarrier));
                    if (filtered.length > 0) carrierMethods = filtered; // fallback to all if carrier not found for this route
                }

                // 2. Filter by tier
                let tierMethods = [];
                const searchKeywords = {
                    mailbox: ['mailbox', 'brievenbus', 'letter', 'groot', 'economy', 'untracked'],
                    tracked: ['parcel', 'pakket', 'standard', 'home', 'europaket', 'classic'],
                    insured: ['insured', 'verzekerd', 'signature', 'handtekening', 'premium']
                };
                
                const currentKeywords = searchKeywords[requiredTier];
                
                tierMethods = carrierMethods.filter(m => {
                    const nameLower = (m.name || '').toLowerCase();
                    if (requiredTier === 'mailbox') {
                        return currentKeywords.some(kw => nameLower.includes(kw));
                    } else if (requiredTier === 'tracked') {
                        const isNotMailbox = !searchKeywords['mailbox'].some(kw => nameLower.includes(kw));
                        const isNotInsured = !searchKeywords['insured'].some(kw => nameLower.includes(kw));
                        return isNotMailbox && isNotInsured;
                    } else if (requiredTier === 'insured') {
                        return currentKeywords.some(kw => nameLower.includes(kw));
                    }
                    return false;
                });
                
                // 3. Fallbacks if tier rule yields no results for international or specific carriers
                if (tierMethods.length === 0) {
                    if (requiredTier === 'mailbox') {
                        tierMethods = carrierMethods.filter(m => {
                            const nameLower = (m.name || '').toLowerCase();
                            return !searchKeywords['mailbox'].some(kw => nameLower.includes(kw));
                        });
                    } else if (requiredTier === 'insured') {
                         tierMethods = carrierMethods.filter(m => {
                            const nameLower = (m.name || '').toLowerCase();
                            const isNotMailbox = !searchKeywords['mailbox'].some(kw => nameLower.includes(kw));
                            return isNotMailbox;
                        });
                    }
                }
                
                // 4. Ultimate fallback - take the cheapest available method if everything else fails
                if (tierMethods.length === 0) {
                    tierMethods = availableMethods;
                }

                // 5. Select the cheapest from the remaining valid methods
                tierMethods.sort((a, b) => a.price - b.price);
                const selectedMethod = tierMethods.length > 0 ? tierMethods[0] : null;

                if (selectedMethod) {
                    // Add fixed platform margin
                    const platformMargin = 0.25;
                    const finalPrice = selectedMethod.price + platformMargin;

                    estimates[sellerId] = {
                        id: selectedMethod.id,
                        name: selectedMethod.name,
                        carrier: selectedMethod.carrier,
                        basePrice: selectedMethod.price,
                        margin: platformMargin,
                        price: parseFloat(finalPrice.toFixed(2)),
                        tierMatch: requiredTier
                    };
                } else {
                    estimates[sellerId] = null; 
                }
            }

            res.status(200).json({
                success: true,
                data: estimates
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Generate label for an order
    // @route   POST /api/v1/shipping/label
    // @access  Private (Seller/Admin)
    generateLabel: async (req, res, next) => {
        try {
            const { orderId } = req.body;
            
            // Dynamic import to avoid circular dependency if any, or just import at top
            const Order = (await import('../models/order.model.js')).default;
            const order = await Order.findById(orderId).populate('userId', 'email fullName');

            if (!order) {
                res.status(404);
                throw new Error('Order not found');
            }

            // Authorization: Ensure user is the seller of the order or an admin
            if (order.sellerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                res.status(403);
                throw new Error('Not authorized to generate label for this order');
            }

            if (!order.shippingMethodId) {
                res.status(400);
                throw new Error('Order does not have a shipping method selected');
            }

            // Call SendCloud Service
            const sendcloudData = await sendcloudService.createParcelAndLabel(order, req.user);
            const parcel = sendcloudData.parcel;

            // Save tracking info to the order
            order.sendcloudParcelId = parcel.id;
            order.trackingNumber = parcel.tracking_number;
            order.trackingUrl = parcel.tracking_url;
            
            // SendCloud returns multiple label formats (normal_printer, label_printer)
            if (parcel.label && parcel.label.normal_printer && parcel.label.normal_printer.length > 0) {
                order.labelUrl = parcel.label.normal_printer[0];
            } else if (parcel.label && parcel.label.label_printer && parcel.label.label_printer.length > 0) {
                order.labelUrl = parcel.label.label_printer[0];
            } else {
                console.warn(`No label URL returned for SendCloud parcel ${parcel.id}. If this is a test account without billing, labels are not generated.`);
            }

            // Optional: update trackingDetails for compatibility
            order.trackingDetails = {
                number: parcel.tracking_number,
                carrier: parcel.carrier?.name || 'SendCloud',
                shippedAt: new Date()
            };

            // Update order status if it's currently processing or confirmed
            if (['processing', 'confirmed'].includes(order.orderStatus)) {
                order.orderStatus = 'shipped';
                // Payout clearance date = 7 days after shipping
                const clearanceDate = new Date();
                clearanceDate.setDate(clearanceDate.getDate() + 7);
                order.payoutClearanceDate = clearanceDate;
            }

            await order.save();

            // Send tracking email to the buyer
            if (order.userId && order.userId.email) {
                try {
                    const sendEmail = (await import('../utils/sendEmail.js')).default;
                    
                    let emailMessage = `Hello ${order.userId.fullName || 'Customer'},\n\n`;
                    emailMessage += `Great news! Your TradeMonk order ${order.orderNumber} has been shipped by the seller.\n\n`;
                    
                    if (order.trackingUrl) {
                        emailMessage += `You can track your package's live status here: ${order.trackingUrl}\n`;
                        if (order.trackingNumber) {
                            emailMessage += `Tracking Number: ${order.trackingNumber}\n`;
                        }
                    } else if (order.trackingNumber) {
                        emailMessage += `Tracking Number: ${order.trackingNumber} (Status updates will begin shortly)\n`;
                    } else {
                        emailMessage += `Your package is on its way. Tracking information will be updated shortly.\n`;
                    }
                    
                    emailMessage += `\nThank you for shopping with TradeMonk!`;

                    await sendEmail({
                        email: order.userId.email,
                        subject: `Your TradeMonk Order ${order.orderNumber} has Shipped!`,
                        message: emailMessage,
                    });
                } catch (emailError) {
                    console.error('Failed to send shipping email to buyer:', emailError);
                    // We don't throw an error here because the label was still generated successfully
                }
            }

            res.status(200).json({
                success: true,
                message: 'Shipping label generated successfully',
                data: {
                    trackingNumber: order.trackingNumber,
                    trackingUrl: order.trackingUrl,
                    labelUrl: order.labelUrl
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Get tracking info
    // @route   GET /api/v1/shipping/tracking/:orderId
    // @access  Private (Buyer/Seller/Admin)
    getTrackingInfo: async (req, res, next) => {
        try {
            const Order = (await import('../models/order.model.js')).default;
            const order = await Order.findById(req.params.orderId);

            if (!order) {
                res.status(404);
                throw new Error('Order not found');
            }

            // Authorization: User must be buyer, seller, or admin
            if (order.userId.toString() !== req.user._id.toString() && 
                order.sellerId.toString() !== req.user._id.toString() && 
                req.user.role !== 'admin') {
                res.status(403);
                throw new Error('Not authorized to view tracking for this order');
            }

            if (!order.trackingNumber) {
                res.status(404);
                throw new Error('No tracking information available for this order yet');
            }

            // Alternatively, just return the trackingUrl saved in DB if we don't need real-time updates via API
            // But let's fetch live from SendCloud as per spec request
            try {
                const trackingData = await sendcloudService.getTracking(order.trackingNumber);
                res.status(200).json({
                    success: true,
                    data: trackingData
                });
            } catch (err) {
                // If fetching live fails, fallback to what we have in DB
                res.status(200).json({
                    success: true,
                    message: "Live tracking unavailable, using stored info",
                    data: {
                        tracking_url: order.trackingUrl,
                        tracking_number: order.trackingNumber
                    }
                });
            }
        } catch (error) {
            next(error);
        }
    },

    // @desc    Handle SendCloud Webhook for Tracking
    // @route   POST /api/v1/shipping/webhook
    // @access  Public (SendCloud)
    handleWebhook: async (req, res, next) => {
        try {
            // SendCloud sends webhook payload with "action": "parcel_status_changed"
            const payload = req.body;
            
            if (payload && payload.action === 'parcel_status_changed' && payload.parcel) {
                const { id: sendcloudParcelId, tracking_number, status } = payload.parcel;
                
                // Dynamic import
                const Order = (await import('../models/order.model.js')).default;
                const order = await Order.findOne({ sendcloudParcelId });
                
                if (order) {
                    const statusId = status?.id;
                    const statusMessage = (status?.message || '').toLowerCase();
                    
                    if (statusId === 15 || statusMessage.includes('delivered')) {
                        if (order.orderStatus !== 'delivered') {
                            order.orderStatus = 'delivered';
                            order.deliveryDate = new Date();
                            await order.save();
                        }
                    } else if (statusId >= 13 && statusId <= 14 || statusMessage.includes('transit')) {
                        if (order.orderStatus === 'confirmed') {
                            order.orderStatus = 'shipped';
                            await order.save();
                        }
                    }
                }
            }

            // Always respond 200 OK to SendCloud so they don't retry unnecessarily
            res.status(200).json({ received: true });
        } catch (error) {
            console.error('SendCloud Webhook Error:', error.message);
            // Don't fail the request, just log it, we want to return 200 to acknowledge receipt
            res.status(200).json({ received: true, error: error.message });
        }
    }
};

export default shippingController;
