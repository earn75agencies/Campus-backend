const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Product = require('../models/Product');

// Get all conversations for current user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'name email role')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    // Get unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          read: false,
          sender: { $ne: userId }
        });

        return {
          ...conv.toObject(),
          unreadCount
        };
      })
    );

    res.json(conversationsWithUnread);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// Get conversation by ID
exports.getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(id)
      .populate('participants', 'name email role');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is a participant
    if (!conversation.participants.some(p => p._id.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
};

// Get messages for a conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Mark messages as read if recipient is current user
    await Message.updateMany(
      {
        conversation: conversationId,
        read: false,
        sender: { $ne: userId }
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({
      messages: messages.reverse(),
      pagination: {
        currentPage: pageNum,
        hasMore: messages.length === limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    } else if (req.body.recipientId) {
      conversation = await Conversation.findOrCreate(senderId, req.body.recipientId);
    } else {
      return res.status(400).json({ error: 'Conversation ID or recipient ID is required' });
    }

    // Verify user is a participant
    if (!conversation.participants.includes(senderId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create message
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      content: content.trim()
    });

    await message.populate('sender', 'name email');

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Start a conversation (from product page)
exports.startConversation = async (req, res) => {
  try {
    const { productId, recipientId, initialMessage } = req.body;
    const senderId = req.user._id;

    if (!recipientId || recipientId === senderId.toString()) {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    // Verify product exists and belongs to recipient
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.sellerId.toString() !== recipientId) {
      return res.status(400).json({ error: 'Recipient does not own this product' });
    }

    // Find or create conversation
    const conversation = await Conversation.findOrCreate(senderId, recipientId);

    // Send initial message if provided
    let message;
    if (initialMessage && initialMessage.trim()) {
      message = await Message.create({
        conversation: conversation._id,
        sender: senderId,
        content: initialMessage.trim()
      });

      // Add product reference to message content
      message.content = `Regarding: ${product.name}\n\n${initialMessage.trim()}`;
      await message.save();

      await message.populate('sender', 'name email');
    }

    res.status(201).json({
      conversation,
      message
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Verify user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        read: false,
        sender: { $ne: userId }
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all conversations for user
    const conversations = await Conversation.find({
      participants: userId
    }).distinct('_id');

    // Count unread messages
    const unreadCount = await Message.countDocuments({
      conversation: { $in: conversations },
      read: false,
      sender: { $ne: userId }
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

// Delete conversation
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify user is a participant
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete all messages in conversation
    await Message.deleteMany({ conversation: id });

    // Delete conversation
    await conversation.deleteOne();

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};
