const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middlewares/auth.middleware');

// Simple in-memory cart storage (in production, use a database or Redis)
const cartStorage = new Map();

// Get user's cart
router.get('/', [
  authMiddleware.authenticate
], (req, res) => {
  try {
    const userId = req.user._id.toString();
    const cart = cartStorage.get(userId) || [];
    res.json({ cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Save cart to server
router.post('/save', [
  authMiddleware.authenticate,
  body('cart').isArray().withMessage('Cart must be an array')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user._id.toString();
    const { cart } = req.body;

    cartStorage.set(userId, cart);

    res.json({ message: 'Cart saved successfully', cart });
  } catch (error) {
    console.error('Error saving cart:', error);
    res.status(500).json({ error: 'Failed to save cart' });
  }
});

// Merge local cart with server cart
router.post('/merge', [
  authMiddleware.authenticate,
  body('localCart').isArray().withMessage('Local cart must be an array')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user._id.toString();
    const { localCart } = req.body;

    // Get existing server cart
    const serverCart = cartStorage.get(userId) || [];

    // Merge carts (server cart takes precedence for existing items)
    const mergedCart = [...serverCart];

    for (const localItem of localCart) {
      const existingIndex = mergedCart.findIndex(
        item => item.productId === localItem.productId
      );

      if (existingIndex >= 0) {
        // Item exists, add quantities
        mergedCart[existingIndex].quantity += localItem.quantity;
      } else {
        // New item, add to cart
        mergedCart.push(localItem);
      }
    }

    // Save merged cart
    cartStorage.set(userId, mergedCart);

    res.json({
      message: 'Cart merged successfully',
      cart: mergedCart
    });
  } catch (error) {
    console.error('Error merging cart:', error);
    res.status(500).json({ error: 'Failed to merge cart' });
  }
});

// Clear cart
router.delete('/', [
  authMiddleware.authenticate
], (req, res) => {
  try {
    const userId = req.user._id.toString();
    cartStorage.delete(userId);

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
