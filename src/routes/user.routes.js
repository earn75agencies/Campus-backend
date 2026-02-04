const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Get current user profile (authenticated users)
router.get('/me', [
  authMiddleware.authenticate
], userController.getMe);

// Update user profile (name, email, phone)
router.put('/profile', [
  authMiddleware.authenticate,
  body('name').optional().trim().isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().trim()
], userController.updateProfile);

// Change password
router.put('/password', [
  authMiddleware.authenticate,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], userController.changePassword);

// Get seller profile page (public)
router.get('/seller/:id', userController.getSellerProfile);

module.exports = router;
