const express = require('express');
const router = express.Router();

// Get payment callback from Flutterwave
router.post('/callback', async (req, res) => {
  try {
    console.log('Flutterwave Callback:', req.body);
    const { transaction_id, status, transaction_reference } = req.body;

    if (!transaction_id || !status) {
      return res.status(400).json({ error: 'Invalid callback data' });
    }

    const Payment = require('../models/Payment');
    const FlutterwaveConfig = require('../config/flutterwave');

    // Find payment by transaction ID or reference
    const payment = await Payment.findOne({
      $or: [
        { transactionId: transaction_id },
        { reference: transaction_reference }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (status === 'successful') {
      // Verify transaction with Flutterwave
      const response = await axios.get(
        `${FlutterwaveConfig.FLUTTERWAVE_TRANSACTION_URL}/transactions/${transaction_id}/verify`,
        {
          headers: {
            Authorization: `Bearer ${FlutterwaveConfig.FLUTTERWAVE_SECRET_KEY}`
          }
        }
      );

      if (response.data.status === 'success' && response.data.data.status === 'successful') {
        payment.status = 'completed';
        payment.transactionId = response.data.data.flw_ref;
        payment.paymentMethod = response.data.data.payment_method;
        await payment.save();

        // Update order payment status
        const Order = require('../models/Order');
        const order = await Order.findById(payment.orderId);
        if (order) {
          order.paymentStatus = 'paid';
          await order.save();
        }

        res.json({ message: 'Payment callback received successfully' });
      } else {
        payment.status = 'failed';
        await payment.save();

        // Update order payment status
        const Order = require('../models/Order');
        const order = await Order.findById(payment.orderId);
        if (order) {
          order.paymentStatus = 'failed';
          await order.save();
        }

        res.json({ message: 'Payment callback received with failure' });
      }
    } else {
      payment.status = 'failed';
      await payment.save();

      // Update order payment status
      const Order = require('../models/Order');
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'failed';
        await order.save();
      }

      res.json({ message: 'Payment callback received with failure' });
    }
  } catch (error) {
    console.error('Flutterwave callback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify payment status directly
router.get('/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const FlutterwaveConfig = require('../config/flutterwave');
    const Payment = require('../models/Payment');

    // Find payment by transaction ID or reference
    const payment = await Payment.findOne({
      $or: [
        { transactionId: transactionId },
        { reference: transactionId }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify with Flutterwave API
    const response = await axios.get(
      `${FlutterwaveConfig.FLUTTERWAVE_TRANSACTION_URL}/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FlutterwaveConfig.FLUTTERWAVE_SECRET_KEY}`
        }
      }
    );

    if (response.data.status === 'success') {
      res.json({
        status: response.data.data.status,
        transactionId: transactionId,
        amount: response.data.data.amount,
        currency: response.data.data.currency,
        paymentMethod: response.data.data.payment_method
      });
    } else {
      res.json({
        status: 'failed',
        transactionId: transactionId
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
