const axios = require('axios');

const FlutterwaveConfig = require('../config/flutterwave');

// Create a payment record first
const createPaymentRecord = async (userId, orderId, amount, customerEmail, customerPhone = '') => {
  const Payment = require('../models/Payment');
  
  const payment = new Payment({
    userId,
    orderId,
    amount,
    status: 'pending',
    customerEmail,
    customerPhone
  });

  await payment.save();
  return payment;
};

// Initialize Flutterwave payment
exports.initializePayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get user email from database
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user || !user.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Create payment record
    const payment = await createPaymentRecord(userId, orderId, amount, user.email);

    // Initialize Flutterwave transaction
    const response = await axios.post(
      `${FlutterwaveConfig.FLUTTERWAVE_TRANSACTION_URL}/charges/initialize`,
      {
        tx_ref: `${FlutterwaveConfig.FLUTTERWAVE_PREFIX}-${payment._id}`,
        amount: amount,
        currency: 'KES',
        payment_method: 'card',
        customer: {
          email: user.email,
          phone_number: user.phone || '',
          name: user.name || ''
        },
        redirect_url: `${process.env.API_URL || 'http://localhost:3001'}/payment/success?paymentId=${payment._id}`,
        customizations: {
          title: 'Campus Market Payment',
          description: `Order payment - ${orderId}`,
          logo: 'https://yourdomain.com/logo.png'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${FlutterwaveConfig.FLUTTERWAVE_SECRET_KEY}`
        }
      }
    );

    if (response.data.status === 'success') {
      payment.status = 'processing';
      payment.reference = response.data.data.tx_ref;
      await payment.save();

      res.json({
        message: 'Payment initialized successfully',
        paymentUrl: response.data.data.link,
        transactionId: response.data.data.tx_ref,
        paymentId: payment._id
      });
    } else {
      payment.status = 'failed';
      await payment.save();
      res.status(400).json({ error: 'Failed to initialize payment', response: response.data });
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
};

// Get payment status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const Payment = require('../models/Payment');
    
    const payment = await Payment.findOne({ 
      $or: [
        { transactionId: transactionId },
        { reference: transactionId }
      ]
    }).populate('orderId', 'totalAmount');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      status: payment.status,
      transactionId: payment.transactionId,
      reference: payment.reference,
      amount: payment.amount,
      orderAmount: payment.orderId?.totalAmount || payment.amount
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
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

    if (payment.status === 'completed') {
      return res.json({
        message: 'Payment already verified',
        status: payment.status,
        transactionId: payment.transactionId,
        reference: payment.reference
      });
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

    if (response.data.status === 'success' && response.data.data.status === 'successful') {
      const flutterwaveTxnId = response.data.data.flw_ref;
      const amount = response.data.data.amount;
      const currency = response.data.data.currency;

      // Update payment status
      payment.status = 'completed';
      payment.transactionId = flutterwaveTxnId;
      payment.paymentMethod = response.data.data.payment_method;
      await payment.save();

      // Update order payment status
      const Order = require('../models/Order');
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        await order.save();
      }

      res.json({
        message: 'Payment verified successfully',
        status: 'completed',
        transactionId: flutterwaveTxnId,
        amount: amount,
        currency: currency
      });
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

      res.status(400).json({
        message: 'Payment verification failed',
        status: response.data.data?.status || 'failed'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Handle Flutterwave callback
exports.handleCallback = async (req, res) => {
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
};

// Get payment methods
exports.getPaymentMethods = async (req, res) => {
  try {
    const FlutterwaveConfig = require('../config/flutterwave');

    res.json({
      methods: ['card', 'account', 'ussd'],
      defaultMethod: 'card',
      environment: FlutterwaveConfig.FLUTTERWAVE_ENVIRONMENT
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
