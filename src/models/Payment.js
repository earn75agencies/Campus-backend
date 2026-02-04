const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    required: false,
    unique: true
  },
  flutterwaveTransactionId: {
    type: String,
    required: false
  },
  reference: {
    type: String,
    required: false,
    unique: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'account', 'ussd', 'mpesa'],
    default: 'card'
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: false
  },
  // M-Pesa specific fields
  mpesaReceiptNumber: {
    type: String,
    required: false
  },
  transactionDate: {
    type: String,
    required: false
  },
  failureReason: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ reference: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
