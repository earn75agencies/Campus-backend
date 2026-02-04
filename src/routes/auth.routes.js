const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authLimiter, passwordResetLimiter } = require('../middlewares/security.middleware');
const PasswordValidator = require('../utils/passwordValidator');

// Register user with stricter rate limiting
router.post('/register', authLimiter, [
  body('email').isEmail().withMessage('Invalid email format').trim().toLowerCase(),
  body('password').custom((value) => {
    const validation = PasswordValidator.validate(value);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    return true;
  }),
  body('name').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('role').optional().isIn(['student', 'seller', 'admin']).withMessage('Invalid role')
], authController.register);

// Login user with rate limiting
router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Invalid email format').trim().toLowerCase(),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

// Get current user
router.get('/me', authMiddleware.authenticate, authController.getMe);

// Forgot password with strict rate limiting
router.post('/forgot-password', passwordResetLimiter, [
  body('email').isEmail().withMessage('Invalid email format').trim().toLowerCase()
], authController.forgotPassword);

// Reset password
router.post('/reset-password/:token', [
  body('password').custom((value) => {
    const validation = PasswordValidator.validate(value);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    return true;
  })
], authController.resetPassword);

module.exports = router;
