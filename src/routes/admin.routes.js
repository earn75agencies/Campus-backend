const orderController = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const router = require('express').Router();

// Get all orders (admin only)
router.get('/', authMiddleware.authenticate, adminMiddleware.requireAdmin, orderController.getAllOrders);

// Update order status (admin only)
router.put('/:id/status', authMiddleware.authenticate, adminMiddleware.requireAdmin, orderController.updateOrderStatus);

module.exports = router;
