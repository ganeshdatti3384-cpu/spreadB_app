import mongoose from "mongoose";

// Message Schema for individual messages
const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  messageType: {
    type: String,
    enum: ["text", "image", "file", "document", "video", "audio", "location"],
    default: "text"
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === "text";
    }
  },
  fileUrl: {
    type: String,
    required: function() {
      return ["image", "file", "document", "video", "audio"].includes(this.messageType);
    }
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  duration: {
    type: Number  // Duration in seconds for audio/video
  },
  thumbnail: {
    type: String  // Thumbnail URL for video messages
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Conversation Schema for managing conversations between users
const conversationSchema = new mongoose.Schema({
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: ["Brand Owner", "Influencer"],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message"
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Optional: Link to promotion/campaign if conversation started from a collaboration
  relatedPromotion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Promotion"
  },
  // Metadata for conversation
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    },
    unreadCount: {
      brand: { type: Number, default: 0 },
      influencer: { type: Number, default: 0 }
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ receiverId: 1 });
messageSchema.index({ isRead: 1 });

conversationSchema.index({ "participants.userId": 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ isActive: 1 });

// Virtual to get other participant in conversation
conversationSchema.virtual('otherParticipant').get(function() {
  // This would be used in frontend logic
  return null;
});

// Method to mark messages as read
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to add participant to conversation
conversationSchema.methods.addParticipant = function(userId, role) {
  const existingParticipant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (!existingParticipant) {
    this.participants.push({ userId, role });
  }
  return this.save();
};

// Static method to find conversation between two users
conversationSchema.statics.findBetweenUsers = function(userId1, userId2) {
  return this.findOne({
    "participants.userId": { $all: [userId1, userId2] },
    isActive: true
  }).populate('participants.userId', 'firstName lastName email role')
    .populate('lastMessage');
};

// Static method to get user conversations
conversationSchema.statics.getUserConversations = function(userId) {
  return this.find({
    "participants.userId": userId,
    isActive: true
  }).populate('participants.userId', 'firstName lastName email role')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });
};

const Message = mongoose.model("Message", messageSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);

export { Message, Conversation };