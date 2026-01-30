import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Protect routes
export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        console.log('Raw Auth Header:', req.headers.authorization);
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        res.status(401);
        return next(new Error('Not authorized to access this route'));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id);

        if (!req.user) {
            res.status(401);
            return next(new Error('User not found with this id'));
        }

        next();
    } catch (err) {
        console.error('Auth Error:', err.message);
        res.status(401);
        return next(new Error(`Not authorized: ${err.message}`));
    }
};

// Grant access to specific roles
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            res.status(403);
            return next(
                new Error(`User role ${req.user.role} is not authorized to access this route`)
            );
        }
        next();
    };
};
