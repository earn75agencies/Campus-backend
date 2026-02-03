const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Get all products
router.get('/', productController.getAllProducts);

// Get product by ID
router.get('/:id', productController.getProductById);

// Create new product (seller only)
router.post('/', [
  authMiddleware.authenticate,
  adminMiddleware.requireAdmin
], productController.createProduct);

// Update product (seller only)
router.put('/:id', [
  authMiddleware.authenticate,
  adminMiddleware.requireAdmin
], productController.updateProduct);

// Delete product (seller only)
router.delete('/:id', [
  authMiddleware.authenticate,
  adminMiddleware.requireAdmin
], productController.deleteProduct);

// Search products
router.get('/search/:query', productController.searchProducts);

module.exports = router;
