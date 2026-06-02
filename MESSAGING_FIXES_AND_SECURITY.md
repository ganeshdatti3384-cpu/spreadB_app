# Messaging System Fixes and Security Enhancements

## Issues Found

### 1. Messages Appearing on One Side (CRITICAL BUG)
**Problem**: The `isMine` check is comparing IDs incorrectly, causing all messages to appear on one side.

**Root Cause**:
```javascript
// Line 119 in ChatScreen.js
const isMine = item.sender === user?._id || item.senderId === user?._id;
```

This comparison fails when:
- `item.sender` is a string like `"6a181360ccefc039350bb817"`
- `user._id` is an ObjectId or different string format
- The comparison uses `===` which doesn't handle type differences

**Solution**: Convert both to strings for comparison:
```javascript
const isMine = String(item.sender || item.senderId) === String(user?._id);
```

### 2. Security Issues

#### Current Security Gaps:
1. **No message ownership validation** - Anyone can delete any message
2. **No conversation access control** - Weak verification of conversation participants
3. **No message encryption** - Messages stored in plain text
4. **No rate limiting** - Can spam messages
5. **No input sanitization** - XSS vulnerability
6. **No file upload validation** - Security risk

## Comprehensive Fixes

### Frontend Fixes

#### Fix 1: Message Side Display (ChatScreen.js)

**File**: `spreadb_mobile/src/screens/messages/ChatScreen.js`

**Line 119** - Fix the isMine check:
```javascript
// Before:
const isMine = item.sender === user?._id || item.senderId === user?._id;

// After:
const currentUserId = String(user?._id || '');
const messageSenderId = String(item.sender || item.senderId || '');
const isMine = currentUserId && messageSenderId && currentUserId === messageSenderId;

console.log('Message rendering:', {
  messageId: item._id,
  currentUserId,
  messageSenderId,
  isMine
});
```

#### Fix 2: Add Message Validation

**Add before sending**:
```javascript
const handleSend = async () => {
  const text = inputText.trim();
  
  // Validation
  if (!text || sending) return;
  if (text.length < 1) {
    Alert.alert('Error', 'Message cannot be empty');
    return;
  }
  if (text.length > 1000) {
    Alert.alert('Error', 'Message is too long (max 1000 characters)');
    return;
  }
  
  // Sanitize input - remove potential XSS
  const sanitized = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  if (sanitized !== text) {
    Alert.alert('Error', 'Invalid characters in message');
    return;
  }
  
  // ... rest of send logic
};
```

### Backend Fixes

#### Fix 1: Enhanced Message Security

**File**: `spreadb_project/controller/message_controller.js`

**Update getConversationMessages**:
```javascript
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100
    const skip = (page - 1) * limit;
    
    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }
    
    // SECURITY: Strict participant verification
    const isParticipant = conversation.participants.some(
      p => String(p.userId) === String(userId)
    );
    
    if (!isParticipant) {
      console.warn(`Unauthorized access attempt to conversation ${conversationId} by user ${userId}`);
      return res.status(403).json({
        success: false,
        message: "Access denied to this conversation"
      });
    }
    
    // Get messages with pagination
    const messages = await Message.find({
      conversationId: conversationId,
      isDeleted: false
    })
    .select('-__v') // Exclude version key
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean(); // Performance optimization
    
    // SECURITY: Ensure sender IDs are strings for consistent comparison
    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      sender: String(msg.senderId),
      senderId: String(msg.senderId),
      receiverId: String(msg.receiverId)
    }));
    
    // Mark messages as read for the current user
    await Message.updateMany(
      {
        conversationId: conversationId,
        receiverId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.status(200).json({
      success: true,
      messages: sanitizedMessages.reverse(), // Oldest first
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages"
    });
  }
};
```

#### Fix 2: Message Sending Security

**Update sendMessage**:
```javascript
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType = "text", conversationId: bodyConversationId } = req.body;
    const senderId = req.user.id;
    
    // SECURITY: Input validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Message content is required"
      });
    }
    
    // SECURITY: Length validation
    if (content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty"
      });
    }
    
    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long (max 1000 characters)"
      });
    }
    
    // SECURITY: Sanitize content
    const sanitizedContent = content
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<\s*\/?\s*script\s*>/gi, '');
    
    if (sanitizedContent !== content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message contains invalid content"
      });
    }
    
    let conversation, actualReceiverId;
    
    if (bodyConversationId) {
      conversation = await Conversation.findById(bodyConversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found"
        });
      }
      
      // SECURITY: Verify user is part of the conversation
      const isParticipant = conversation.participants.some(
        p => String(p.userId) === String(senderId)
      );
      if (!isParticipant) {
        console.warn(`Unauthorized message send attempt by user ${senderId}`);
        return res.status(403).json({
          success: false,
          message: "Access denied to this conversation"
        });
      }
      
      // Get receiver ID from conversation
      const otherParticipant = conversation.participants.find(
        p => String(p.userId) !== String(senderId)
      );
      actualReceiverId = otherParticipant?.userId;
      
    } else {
      // Original flow with receiverId
      if (!receiverId) {
        return res.status(400).json({
          success: false,
          message: "Receiver ID is required"
        });
      }
      
      actualReceiverId = receiverId;
      
      // Validate receiver exists
      const receiver = await User.findById(receiverId);
      const sender = await User.findById(senderId);
      
      if (!receiver || !sender) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      // SECURITY: Can only message users with different roles
      if (receiver.role === sender.role) {
        return res.status(400).json({
          success: false,
          message: "Can only message users with different roles"
        });
      }
      
      // Find or create conversation
      conversation = await Conversation.findBetweenUsers(senderId, receiverId);
      
      if (!conversation) {
        conversation = new Conversation({
          participants: [
            { userId: senderId, role: sender.role },
            { userId: receiverId, role: receiver.role }
          ],
          isActive: true
        });
        await conversation.save();
      }
    }
    
    // Create message
    const message = new Message({
      conversationId: conversation._id,
      senderId,
      receiverId: actualReceiverId,
      messageType,
      content: sanitizedContent,
      isRead: false
    });
    
    await message.save();
    
    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    conversation.metadata.totalMessages += 1;
    
    // Update unread count for receiver
    const receiver = await User.findById(actualReceiverId);
    const receiverRole = receiver.role === "Brand Owner" ? "brand" : "influencer";
    conversation.metadata.unreadCount[receiverRole] += 1;
    
    await conversation.save();
    
    res.status(201).json({
      success: true,
      message: {
        ...message.toObject(),
        sender: String(message.senderId),
        senderId: String(message.senderId),
        receiverId: String(message.receiverId)
      },
      conversationId: conversation._id
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message"
    });
  }
};
```

#### Fix 3: Delete Message Security

**Update deleteMessage**:
```javascript
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }
    
    // SECURITY: Only sender can delete their message
    if (String(message.senderId) !== String(userId)) {
      console.warn(`Unauthorized delete attempt: user ${userId} tried to delete message ${messageId} from ${message.senderId}`);
      return res.status(403).json({
        success: false,
        message: "Can only delete your own messages"
      });
    }
    
    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
    
    res.status(200).json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message"
    });
  }
};
```

### Rate Limiting

**Create middleware**: `spreadb_project/middleware/rate_limit.js`

```javascript
import rateLimit from 'express-rate-limit';

// Rate limiter for message sending
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: {
    success: false,
    message: "Too many messages. Please wait a moment before sending more."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for API requests
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});
```

**Apply to routes**: `spreadb_project/route/message_router.js`

```javascript
import { messageRateLimiter } from '../middleware/rate_limit.js';

// Apply rate limiter to message sending
message_router.post("/send", protect, messageRateLimiter, sendMessage);
```

### Additional Security Features

#### 1. Message Encryption (Optional - Advanced)

For end-to-end encryption, you would need:
```javascript
// Before sending
const encrypted = encrypt(message, sharedSecret);

// After receiving
const decrypted = decrypt(encrypted, sharedSecret);
```

#### 2. Audit Logging

**Create**: `spreadb_project/utils/auditLogger.js`

```javascript
export const logMessageAction = async (action, userId, details) => {
  console.log('AUDIT:', {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details
  });
  
  // Optionally save to database
  // await AuditLog.create({ action, userId, details });
};
```

#### 3. Content Moderation

```javascript
const containsProfanity = (text) => {
  const profanityList = ['badword1', 'badword2']; // Maintain your list
  return profanityList.some(word => text.toLowerCase().includes(word));
};

if (containsProfanity(content)) {
  return res.status(400).json({
    success: false,
    message: "Message contains inappropriate content"
  });
}
```

## Implementation Checklist

### Frontend:
- [ ] Fix isMine comparison (convert to strings)
- [ ] Add message length validation
- [ ] Add input sanitization
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test message alignment

### Backend:
- [ ] Enhance conversation access control
- [ ] Add input validation
- [ ] Add content sanitization
- [ ] Add rate limiting
- [ ] Ensure consistent ID format (strings)
- [ ] Add audit logging
- [ ] Test security measures

### Testing:
- [ ] Test messages appear on correct sides
- [ ] Test two users chatting
- [ ] Test message sending/receiving
- [ ] Test unauthorized access attempts
- [ ] Test rate limiting
- [ ] Test XSS prevention
- [ ] Test message deletion
- [ ] Test conversation privacy

## Security Best Practices

1. **Never trust client input** - Always validate and sanitize
2. **Use string comparison for IDs** - Avoid type mismatch issues
3. **Implement rate limiting** - Prevent spam and DoS
4. **Log security events** - Monitor unauthorized attempts
5. **Soft delete messages** - Maintain audit trail
6. **Verify conversation participants** - Strict access control
7. **Sanitize all content** - Prevent XSS attacks
8. **Use HTTPS** - Encrypt data in transit
9. **Implement file validation** - If adding file uploads
10. **Regular security audits** - Keep system secure

---

**Status**: Ready to implement
**Priority**: HIGH (Critical bug fix + Security)
**Estimated Time**: 2-3 hours
