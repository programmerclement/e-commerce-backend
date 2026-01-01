import { body, query, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Handle validation errors
export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

    return res.status(400).json({
      success: false,
      errors: extractedErrors
    });
  };
};

// Check if ID is valid MongoDB ObjectId
export const isValidObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

// Auth validations
export const registerValidation = validate([
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{10,15}$/).withMessage('Please enter a valid phone number')
]);

export const loginValidation = validate([
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
]);

export const updateProfileValidation = validate([
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid email'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{10,15}$/).withMessage('Please enter a valid phone number')
]);

// Product validations
export const createProductValidation = validate([
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Product name cannot exceed 200 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Product description is required')
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
  
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .custom(isValidObjectId).withMessage('Invalid category ID'),
  
  body('brand')
    .trim()
    .notEmpty().withMessage('Brand is required'),
  
  body('stock')
    .notEmpty().withMessage('Stock is required')
    .isInt({ min: 0 }).withMessage('Stock must be a positive integer'),
  
  body('sku')
    .trim()
    .notEmpty().withMessage('SKU is required')
    .isUppercase().withMessage('SKU must be uppercase')
]);

// Order validations
export const createOrderValidation = validate([
  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required'),
  
  body('items.*.product')
    .notEmpty().withMessage('Product ID is required')
    .custom(isValidObjectId).withMessage('Invalid product ID'),
  
  body('items.*.quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  
  body('shippingAddress')
    .notEmpty().withMessage('Shipping address is required'),
  
  body('shippingAddress.street')
    .trim()
    .notEmpty().withMessage('Street address is required'),
  
  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('City is required'),
  
  body('shippingAddress.country')
    .trim()
    .notEmpty().withMessage('Country is required'),
  
  body('shippingAddress.postalCode')
    .trim()
    .notEmpty().withMessage('Postal code is required'),
  
  body('shippingAddress.phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Please enter a valid phone number'),
  
  body('paymentMethod')
    .isIn(['stripe', 'momo', 'itecpay', 'cod']).withMessage('Invalid payment method')
]);

// Coupon validations
export const createCouponValidation = validate([
  body('code')
    .trim()
    .notEmpty().withMessage('Coupon code is required')
    .isUppercase().withMessage('Coupon code must be uppercase'),
  
  body('discountType')
    .isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
  
  body('discountValue')
    .notEmpty().withMessage('Discount value is required')
    .isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
  
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date format'),
  
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
]);

// Review validations
export const createReviewValidation = validate([
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .trim()
    .notEmpty().withMessage('Comment is required')
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
  
  body('product')
    .notEmpty().withMessage('Product ID is required')
    .custom(isValidObjectId).withMessage('Invalid product ID')
]);