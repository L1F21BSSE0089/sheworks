const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'sender.model'
    },
    model: {
      type: String,
      required: true,
      enum: ['User', 'Vendor']
    },
    type: {
      type: String,
      required: true,
      enum: ['customer', 'vendor']
    }
  },
  recipient: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipient.model'
    },
    model: {
      type: String,
      required: true,
      enum: ['User', 'Vendor']
    },
    type: {
      type: String,
      required: true,
      enum: ['customer', 'vendor']
    }
  },
  content: {
    text: {
      type: String,
      required: true,
      maxlength: 2000
    },
    language: {
      type: String,
      required: true,
      enum: ['en', 'ur', 'ar', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'hi', 'bn', 'tr', 'nl'],
      default: 'en'
    },
    translatedText: {
      type: String,
      maxlength: 2000
    },
    originalLanguage: {
      type: String,
      enum: ['en', 'ur', 'ar', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'hi', 'bn', 'tr', 'nl']
    }
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'product']
    },
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  productReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  orderReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readAt: {
    type: Date
  },
  isSystemMessage: {
    type: Boolean,
    default: false
  },
  systemMessageType: {
    type: String,
    enum: ['order_update', 'payment_confirmation', 'shipping_update', 'welcome', 'other']
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet']
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
messageSchema.index({ 'sender.id': 1, 'recipient.id': 1, createdAt: -1 });
messageSchema.index({ 'recipient.id': 1, status: 1 });

// Virtual for conversation ID (unique between two users)
messageSchema.virtual('conversationId').get(function() {
  const senderId = this.sender.id.toString();
  const recipientId = this.recipient.id.toString();
  return [senderId, recipientId].sort().join('_');
});

// Method to mark message as read
messageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Method to mark message as delivered
messageSchema.methods.markAsDelivered = function() {
  if (this.status === 'sent') {
    this.status = 'delivered';
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get conversation between two users
messageSchema.statics.getConversation = function(user1Id, user2Id, limit = 50, skip = 0) {
  return this.find({
    $or: [
      { 'sender.id': user1Id, 'recipient.id': user2Id },
      { 'sender.id': user2Id, 'recipient.id': user1Id }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .populate('sender.id', 'firstName lastName username businessName')
  .populate('recipient.id', 'firstName lastName username businessName')
  .populate('productReference', 'name images price')
  .populate('orderReference', 'orderNumber totalAmount status');
};

// Static method to get unread message count
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    'recipient.id': userId,
    status: { $in: ['sent', 'delivered'] }
  });
};

module.exports = mongoose.model('Message', messageSchema); 