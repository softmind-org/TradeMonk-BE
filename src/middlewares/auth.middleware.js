import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Protect routes
export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
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

        // Check if token matches the one in DB (Single Session / Logout support)
        // explicitly select +accessToken because it is excluded by default
        const user = await User.findById(decoded.id).select('+accessToken');

        if (!user) {
            res.status(401);
            return next(new Error('User not found with this id'));
        }

        if (user.status === 'suspended') {
            res.status(401);
            return next(new Error('Account suspended. Please contact support.'));
        }

        if (token !== user.accessToken) {
            res.status(401);
            return next(new Error('Not authorized to access this route (Invalid Token)'));
        }

        // Remove accessToken from user object before attaching to req
        // so we don't accidentally expose it in controllers
        user.accessToken = undefined;
        req.user = user;

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
