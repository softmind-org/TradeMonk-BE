import { body } from 'express-validator';

// Email Regex (Shared)
// Matches frontend rule: ends with valid TLD
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.(com|org|net|io|edu|gov|co|uk|de|fr|jp|cn|us|ca|au|int|mil|biz|info|name|pro|aero|coop|museum|[a-z]{2,})$/i;

// Password Regex (Shared)
// At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=(?:[^ ]* ){0,1}[^ ]*$)(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/;

// Shared Validations
const emailValidation = body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .matches(EMAIL_REGEX).withMessage('Email must end with a valid TLD (e.g., .com, .org, .net, .io)');

const passwordValidation = body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(PASSWORD_REGEX).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, one special character, and at most one space');

// Auth Validation Schemas

export const registerValidation = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
        .isLength({ max: 50 }).withMessage('Name must not exceed 50 characters')
        .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
    emailValidation,
    passwordValidation,
    body('role')
        .optional()
        .isIn(['buyer', 'seller']).withMessage('Invalid role'),
];

export const loginValidation = [
    emailValidation,
    passwordValidation,
];

export const forgotPasswordValidation = [
    emailValidation,
];

export const verifyOtpValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

export const resetPasswordValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').notEmpty().withMessage('OTP is required'),
    body('newPassword')
        .custom((value, { req }) => {
            // Validate against the regex manually since we renamed field in body
            if (!PASSWORD_REGEX.test(value)) {
                throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, one special character, and at most one space');
            }
            return true;
        }),
    body('confirmPassword')
        .notEmpty().withMessage('Confirm Password is Required')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords must match');
            }
            return true;
        }),
];
