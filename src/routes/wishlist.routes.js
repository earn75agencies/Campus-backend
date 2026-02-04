const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlist.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All wishlist routes require authentication

// Get user's wishlist
router.get('/', [
  authMiddleware.authenticate
], wishlistController.getWishlist);

// Add product to wishlist
router.post('/add/:productId', [
  authMiddleware.authenticate
], wishlistController.addToWishlist);

// Remove product from wishlist
router.delete('/remove/:productId', [
  authMiddleware.authenticate
], wishlistController.removeFromWishlist);

// Check if product is in wishlist
router.get('/check/:productId', [
  authMiddleware.authenticate
], wishlistController.checkWishlist);

// Clear entire wishlist
router.delete('/clear', [
  authMiddleware.authenticate
], wishlistController.clearWishlist);

module.exports = router;
