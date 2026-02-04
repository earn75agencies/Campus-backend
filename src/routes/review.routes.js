const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const reviewController = require('../controllers/review.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Get all reviews for a product (public)
router.get('/product/:productId', reviewController.getProductReviews);

// Get a specific review by ID (public)
router.get('/:id', reviewController.getReviewById);

// Get current user's reviews (authenticated)
router.get('/user/my-reviews', [
  authMiddleware.authenticate
], reviewController.getUserReviews);

// Create a new review (authenticated)
router.post('/product/:productId', [
  authMiddleware.authenticate,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters')
], reviewController.createReview);

// Update a review (authenticated, owner only)
router.put('/:id', [
  authMiddleware.authenticate,
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters')
], reviewController.updateReview);

// Delete a review (authenticated, owner or admin only)
router.delete('/:id', [
  authMiddleware.authenticate
], reviewController.deleteReview);

module.exports = router;
