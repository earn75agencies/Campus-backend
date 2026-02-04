const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All notification routes require authentication

// Get notifications
router.get('/', [
  authMiddleware.authenticate
], notificationController.getNotifications);

// Get unread count
router.get('/unread', [
  authMiddleware.authenticate
], notificationController.getUnreadCount);

// Mark as read
router.put('/:id/read', [
  authMiddleware.authenticate
], notificationController.markAsRead);

// Mark all as read
router.put('/read-all', [
  authMiddleware.authenticate
], notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', [
  authMiddleware.authenticate
], notificationController.deleteNotification);

// Clear read notifications
router.delete('/clear-read', [
  authMiddleware.authenticate
], notificationController.clearReadNotifications);

module.exports = router;
