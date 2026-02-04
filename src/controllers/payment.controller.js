const axios = require('axios');

const FlutterwaveConfig = require('../config/flutterwave');
const MpesaConfig = require('../config/daraja');

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
      methods: ['card', 'account', 'ussd', 'mpesa'],
      defaultMethod: 'card',
      environment: FlutterwaveConfig.FLUTTERWAVE_ENVIRONMENT
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ================== M-PESA FUNCTIONS ==================

// Generate M-Pesa OAuth Token
const getMpesaToken = async () => {
  const auth = Buffer.from(`${MpesaConfig.MPESA_CONSUMER_KEY}:${MpesaConfig.MPESA_CONSUMER_SECRET}`).toString('base64');

  const response = await axios.get(MpesaConfig.MPESA_AUTH_URL, {
    headers: {
      Authorization: `Basic ${auth}`
    }
  });

  return response.data.access_token;
};

// Generate M-Pesa Password
const generateMpesaPassword = () => {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const password = Buffer.from(`${MpesaConfig.MPESA_SHORTCODE}${MpesaConfig.MPESA_PASSKEY}${timestamp}`).toString('base64');
  return { password, timestamp };
};

// Initialize M-Pesa STK Push
exports.initiateMpesaPayment = async (req, res) => {
  try {
    const { orderId, amount, phoneNumber } = req.body;
    const userId = req.user._id;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required for M-Pesa payment' });
    }

    // Validate phone number format (should start with 254...)
    const formattedPhone = phoneNumber.replace(/\s/g, '');
    if (!/^254\d{9}$/.test(formattedPhone)) {
      return res.status(400).json({
        error: 'Invalid phone number format. Use format 254XXXXXXXXX'
      });
    }

    // Get user details
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create payment record
    const payment = await createPaymentRecord(userId, orderId, amount, user.email, formattedPhone);

    // Get M-Pesa token
    const token = await getMpesaToken();

    // Generate password and timestamp
    const { password, timestamp } = generateMpesaPassword();

    // Build callback URL
    const callbackUrl = `${MpesaConfig.MPESA_CALLBACK_URL}/api/payment/mpesa/callback`;

    // STK Push request payload
    const stkPushPayload = {
      BusinessShortCode: MpesaConfig.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: MpesaConfig.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `CMP-${orderId}`,
      TransactionDesc: `Campus Market Order ${orderId}`
    };

    // Initiate STK Push
    const response = await axios.post(MpesaConfig.MPESA_STK_PUSH_URL, stkPushPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.ResponseCode === '0') {
      // Update payment with M-Pesa details
      payment.status = 'processing';
      payment.transactionId = response.data.CheckoutRequestID;
      payment.paymentMethod = 'mpesa';
      payment.reference = response.data.MerchantRequestID;
      await payment.save();

      res.json({
        message: 'M-Pesa payment initiated successfully',
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID,
        customerMessage: response.data.CustomerMessage,
        paymentId: payment._id
      });
    } else {
      payment.status = 'failed';
      await payment.save();

      res.status(400).json({
        error: 'Failed to initiate M-Pesa payment',
        response: response.data
      });
    }
  } catch (error) {
    console.error('M-Pesa STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to initiate M-Pesa payment',
      details: error.response?.data || error.message
    });
  }
};

// Handle M-Pesa Callback
exports.handleMpesaCallback = async (req, res) => {
  try {
    console.log('M-Pesa Callback received:', JSON.stringify(req.body, null, 2));

    const { Body } = req.body;

    if (!Body || !Body.stkCallback) {
      return res.status(400).json({ error: 'Invalid callback format' });
    }

    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
    const MerchantRequestID = stkCallback.MerchantRequestID;

    const Payment = require('../models/Payment');

    // Find payment by CheckoutRequestID or MerchantRequestID
    const payment = await Payment.findOne({
      $or: [
        { transactionId: CheckoutRequestID },
        { reference: MerchantRequestID }
      ]
    });

    if (!payment) {
      console.log('Payment not found for CheckoutRequestID:', CheckoutRequestID);
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (ResultCode === '0') {
      // Payment successful
      payment.status = 'completed';

      // Extract metadata if available
      if (CallbackMetadata && CallbackMetadata.Item) {
        const mpesaReceipt = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
        const transactionDate = CallbackMetadata.Item.find(item => item.Name === 'TransactionDate');
        const phoneNumber = CallbackMetadata.Item.find(item => item.Name === 'PhoneNumber');

        if (mpesaReceipt) {
          payment.mpesaReceiptNumber = mpesaReceipt.Value;
        }
        if (transactionDate) {
          payment.transactionDate = transactionDate.Value;
        }
        if (phoneNumber) {
          payment.customerPhone = phoneNumber.Value;
        }
      }

      await payment.save();

      // Update order payment status
      const Order = require('../models/Order');
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        await order.save();
      }

      console.log('M-Pesa payment completed successfully');
      res.json({ ResultCode: '0', ResultDesc: 'Payment received successfully' });
    } else {
      // Payment failed
      payment.status = 'failed';
      payment.failureReason = ResultDesc;
      await payment.save();

      // Update order payment status
      const Order = require('../models/Order');
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'failed';
        await order.save();
      }

      console.log('M-Pesa payment failed:', ResultDesc);
      res.json({ ResultCode: ResultCode, ResultDesc: 'Payment failed' });
    }
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(500).json({ ResultCode: '1', ResultDesc: 'Server error' });
  }
};

// Check M-Pesa payment status
exports.getMpesaPaymentStatus = async (req, res) => {
  try {
    const { checkoutRequestID } = req.params;

    const Payment = require('../models/Payment');
    const payment = await Payment.findOne({ transactionId: checkoutRequestID });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      status: payment.status,
      checkoutRequestID: payment.transactionId,
      amount: payment.amount,
      failureReason: payment.failureReason,
      mpesaReceiptNumber: payment.mpesaReceiptNumber
    });
  } catch (error) {
    console.error('Get M-Pesa status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
