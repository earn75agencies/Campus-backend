const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Get user's orders
router.get('/my-orders', authMiddleware.authenticate, orderController.getUserOrders);

// Get order by ID
router.get('/:id', authMiddleware.authenticate, orderController.getOrderById);

// Create new order
router.post('/', [
  authMiddleware.authenticate,
  body('items').isArray().withMessage('Items must be an array'),
  body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
  body('shippingAddress.street').notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Zip code is required')
], orderController.createOrder);

// Update order status (admin only)
router.put('/:id/status', [
  authMiddleware.authenticate,
  adminMiddleware.requireAdmin
], orderController.updateOrderStatus);

// Cancel order
router.put('/:id/cancel', authMiddleware.authenticate, orderController.cancelOrder);

// Get all orders (admin only)
router.get('/', [
  authMiddleware.authenticate,
  adminMiddleware.requireAdmin
], orderController.getAllOrders);

module.exports = router;
