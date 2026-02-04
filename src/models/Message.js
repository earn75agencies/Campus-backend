const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Post-save hook to update conversation's updatedAt
messageSchema.post('save', async function() {
  await this.model('Conversation').findByIdAndUpdate(this.conversation, {
    lastMessage: this._id,
    updatedAt: new Date()
  });
});

module.exports = mongoose.model('Message', messageSchema);
