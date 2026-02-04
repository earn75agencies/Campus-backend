const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All message routes require authentication

// Get all conversations for current user
router.get('/conversations', [
  authMiddleware.authenticate
], messageController.getConversations);

// Get unread message count
router.get('/unread', [
  authMiddleware.authenticate
], messageController.getUnreadCount);

// Get specific conversation
router.get('/conversations/:id', [
  authMiddleware.authenticate
], messageController.getConversationById);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', [
  authMiddleware.authenticate
], messageController.getMessages);

// Send a message
router.post('/send', [
  authMiddleware.authenticate,
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters')
], messageController.sendMessage);

// Start a new conversation (from product page)
router.post('/start', [
  authMiddleware.authenticate
], messageController.startConversation);

// Mark messages as read
router.put('/conversations/:conversationId/read', [
  authMiddleware.authenticate
], messageController.markAsRead);

// Delete a conversation
router.delete('/conversations/:id', [
  authMiddleware.authenticate
], messageController.deleteConversation);

module.exports = router;
