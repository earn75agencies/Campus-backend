const orderController = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = require('express').Router();

// Get all orders (admin only)
router.get('/', authMiddleware.authenticate, authMiddleware.requireAdmin, orderController.getAllOrders);

// Update order status (admin only)
router.put('/:id/status', authMiddleware.authenticate, authMiddleware.requireAdmin, orderController.updateOrderStatus);

module.exports = router;
