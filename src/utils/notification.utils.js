/**
 * Notification Utility
 * Centralized helper to create notifications — keeps controllers clean.
 * All notification creation is fire-and-forget (non-blocking).
 */
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';

/**
 * Create a single notification for a specific user.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.role  - 'buyer' | 'seller' | 'admin'
 * @param {string} params.type  - notification type key
 * @param {string} params.title
 * @param {string} params.message
 * @param {Object} [params.metadata]
 */
export const createNotification = async ({ userId, role, type, title, message, metadata = {} }) => {
    try {
        await Notification.create({ userId, role, type, title, message, metadata });
    } catch (err) {
        // Never throw — notifications are non-critical side effects
        console.error('[Notification] Failed to create:', err.message);
    }
};

/**
 * Fan-out a notification to ALL admin users.
 * @param {Object} params - same as createNotification, minus userId/role
 */
export const notifyAdmins = async ({ type, title, message, metadata = {} }) => {
    try {
        const admins = await User.find({ role: 'admin' }).select('_id').lean();
        if (!admins.length) return;

        const docs = admins.map(admin => ({
            userId: admin._id,
            role: 'admin',
            type,
            title,
            message,
            metadata
        }));

        await Notification.insertMany(docs);
    } catch (err) {
        console.error('[Notification] Failed to notify admins:', err.message);
    }
};
