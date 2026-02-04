const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for finding conversations between users
conversationSchema.index({ participants: 1 });

// Static method to find or create conversation between two users
conversationSchema.statics.findOrCreate = async function(userId1, userId2) {
  let conversation = await this.findOne({
    participants: { $all: [userId1, userId2], $size: 2 }
  });

  if (!conversation) {
    conversation = await this.create({ participants: [userId1, userId2] });
  }

  return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema);
