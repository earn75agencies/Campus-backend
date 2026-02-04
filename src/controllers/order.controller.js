const Order = require('../models/Order');
const Product = require('../models/Product');
const SellerBalance = require('../models/SellerBalance');

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.productId', 'name price images');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('items.productId', 'name price images');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns the order
    if (order.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress, notes } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain items' });
    }

    // Create order
    const order = new Order({
      userId: req.user._id,
      items,
      totalAmount,
      shippingAddress,
      notes
    });

    await order.save();

    // Update product stock and create seller balance record
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        await product.save();

        // Update seller balance
        const sellerBalance = await SellerBalance.findOne({ sellerId: product.sellerId });
        if (sellerBalance) {
          sellerBalance.totalEarnings += item.priceAtPurchase * item.quantity;
          sellerBalance.totalOrders += item.quantity;
          sellerBalance.currentBalance += item.priceAtPurchase * item.quantity;
          await sellerBalance.save();
        }
      }
    }

    await order.populate('userId', 'name email');
    await order.populate('items.productId', 'name price images');

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus, trackingNumber, estimatedDelivery, note } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update fields
    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber || null;
    if (estimatedDelivery !== undefined) order.estimatedDelivery = estimatedDelivery || null;

    // Add to status history with note and updater
    if (orderStatus) {
      order.updatedBy = req.user._id;
      const lastHistoryEntry = order.statusHistory[order.statusHistory.length - 1];
      if (lastHistoryEntry) {
        lastHistoryEntry.note = note || '';
        lastHistoryEntry.updatedBy = req.user._id;
      }
    }

    await order.save();
    await order.populate('userId', 'name email');
    await order.populate('items.productId', 'name price images');

    res.json({
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get order tracking information
exports.getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('items.productId', 'name images');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns the order or is admin/seller
    const isOwner = order.userId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isSeller = req.user.role === 'seller';

    if (!isOwner && !isAdmin && !isSeller) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      orderId: order._id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      statusHistory: order.statusHistory,
      items: order.items,
      shippingAddress: order.shippingAddress,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    });
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns the order
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    order.orderStatus = 'cancelled';
    await order.save();

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .populate('items.productId', 'name price images');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
