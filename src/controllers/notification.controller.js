import Notification from '../models/notification.model.js';

const notificationController = {
    // @desc    Get current user's notifications (latest 20)
    // @route   GET /api/v1/notifications
    // @access  Private
    getMyNotifications: async (req, res, next) => {
        try {
            const notifications = await Notification.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            const unreadCount = await Notification.countDocuments({
                userId: req.user._id,
                isRead: false
            });

            res.status(200).json({
                success: true,
                data: notifications,
                unreadCount
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Mark a single notification as read
    // @route   PATCH /api/v1/notifications/:id/read
    // @access  Private
    markOneRead: async (req, res, next) => {
        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: req.params.id, userId: req.user._id },
                { isRead: true },
                { new: true }
            );

            if (!notification) {
                res.status(404);
                throw new Error('Notification not found');
            }

            res.status(200).json({ success: true, data: notification });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Mark ALL notifications as read for current user
    // @route   PATCH /api/v1/notifications/read-all
    // @access  Private
    markAllRead: async (req, res, next) => {
        try {
            await Notification.updateMany(
                { userId: req.user._id, isRead: false },
                { isRead: true }
            );

            res.status(200).json({ success: true, message: 'All notifications marked as read' });
        } catch (error) {
            next(error);
        }
    }
};

export default notificationController;
