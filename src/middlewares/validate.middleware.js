import { validationResult } from 'express-validator';

/**
 * Middleware to check for validation errors
 * If errors exist, return 400 with the first error message
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0].msg;
        res.status(400);
        return next(new Error(firstError));
    }
    next();
};
