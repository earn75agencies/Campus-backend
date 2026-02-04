const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// ================== FLUTTERWAVE ROUTES ==================
// Initialize Flutterwave payment
router.post('/initialize', authMiddleware.authenticate, paymentController.initializePayment);

// Verify Flutterwave payment
router.get('/verify/:transactionId', paymentController.verifyPayment);

// Get payment status
router.get('/status/:transactionId', paymentController.getPaymentStatus);

// Get payment methods
router.get('/methods', paymentController.getPaymentMethods);

// Handle Flutterwave callback
router.post('/callback', paymentController.handleCallback);

// ================== M-PESA ROUTES ==================
// Initialize M-Pesa STK Push payment
router.post('/mpesa/initiate', authMiddleware.authenticate, paymentController.initiateMpesaPayment);

// Handle M-Pesa callback (from Safaricom)
router.post('/mpesa/callback', paymentController.handleMpesaCallback);

// Check M-Pesa payment status
router.get('/mpesa/status/:checkoutRequestID', paymentController.getMpesaPaymentStatus);

module.exports = router;
