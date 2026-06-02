# 💬 Chat Feature Guide

## New Chat Functionality in SpreadB App

---

## 📍 Where to Find Chat Buttons

### 1. **Campaign Detail Screen**
When viewing a campaign as an influencer:

```
┌─────────────────────────────────────┐
│  Campaign Title                     │
│  Brand Name                         │
│  Budget • Duration • Openings       │
│                                     │
│  [Your Sticks Balance: 100]        │
│                                     │
│  ┌─ Bottom Bar ──────────────────┐ │
│  │  [💬]  [Apply Now (10 Sticks)]│ │
│  │  Chat   Apply Button           │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Features:**
- 💬 Chat button always visible (left side)
- 📤 Apply button (right side, takes most space)
- ✅ Can chat before applying
- ✅ Can chat after applying
- ✅ Auto-sends introduction message

**Default Message:**
> "Hi! I'm interested in your campaign '[Campaign Title]'"

---

### 2. **My Applications Screen**
Each application card now has action buttons:

```
┌─────────────────────────────────────┐
│  Campaign Title          [Pending]  │
│  🏢 Brand Name                      │
│  💰 ₹50,000  📅 Applied Jan 15     │
│  ─────────────────────────────────  │
│  [📄 Agreement]  [💬 Chat with Brand]│
│  (if accepted)    (always visible)  │
└─────────────────────────────────────┘
```

**Features:**
- 💬 "Chat with Brand" button on every application
- 📄 "Agreement" button (only for accepted applications)
- ✅ Works for pending, accepted, and rejected applications
- ✅ Allows discussion about application status

**Default Message:**
> "Hi! I'd like to discuss my application for '[Campaign Title]'"

---

## 🔄 Chat Flow

### Starting a Conversation

1. **User clicks chat button**
   - Loading indicator shows
   - Backend creates/finds conversation
   - Auto-sends introduction message

2. **Navigation**
   - If conversation exists → Opens ChatScreen directly
   - If new conversation → Opens MessagesScreen
   - Shows success message

3. **Error Handling**
   - Missing brand owner ID → Shows error alert
   - Network error → Shows retry message
   - Profile not found → Auto-creates profile

---

## 🎯 Use Cases

### For Influencers:

#### **Before Applying:**
- Ask questions about campaign requirements
- Clarify deliverables and timeline
- Negotiate terms
- Understand brand expectations

#### **After Applying:**
- Follow up on application status
- Provide additional information
- Discuss collaboration details
- Negotiate final terms

#### **After Acceptance:**
- Coordinate campaign execution
- Share content drafts
- Get feedback
- Discuss payment and deliverables

---

## 🛠️ Technical Implementation

### Frontend (React Native)

#### Campaign Detail Screen:
```javascript
const handleStartChat = async () => {
  setChatLoading(true);
  try {
    const res = await startConversation({
      receiverId: brandOwnerId,
      content: `Hi! I'm interested in your campaign "${promotion?.title}"`
    });
    
    const conversationId = res.data?.conversationId;
    if (conversationId) {
      navigation.navigate('Chat', { conversationId });
    }
  } catch (e) {
    Alert.alert('Error', e.response?.data?.message);
  } finally {
    setChatLoading(false);
  }
};
```

#### Applications Screen:
```javascript
const handleStartChat = async (application) => {
  const brandOwnerId = application.promotion?.brandOwnerId;
  
  const res = await startConversation({
    receiverId: brandOwnerId,
    content: `Hi! I'd like to discuss my application for "${application.promotion?.title}"`
  });
  
  navigation.navigate('Chat', { conversationId: res.data?.conversationId });
};
```

### Backend (Node.js/Express)

#### Message Controller:
```javascript
// Auto-create conversation if doesn't exist
let conversation = await Conversation.findBetweenUsers(senderId, receiverId);

if (!conversation) {
  conversation = new Conversation({
    participants: [
      { userId: senderId, role: sender.role },
      { userId: receiverId, role: receiver.role }
    ],
    isActive: true  // Allow direct messaging
  });
  await conversation.save();
}

// Reactivate closed conversations
if (!conversation.isActive) {
  conversation.isActive = true;
  await conversation.save();
}
```

---

## 🎨 UI/UX Details

### Chat Button Styling

#### Campaign Detail (Bottom Bar):
- **Icon:** 💬 chatbubble-outline
- **Size:** 52x52 px
- **Style:** Light background with primary border
- **Position:** Left side of bottom bar
- **Color:** Primary color (#1A8A00)

#### Applications (Action Button):
- **Icon:** 💬 chatbubble-outline
- **Text:** "Chat with Brand"
- **Style:** Light background with primary border
- **Position:** Below application details
- **Flex:** Takes more space than Agreement button

### Loading States:
- ⏳ Shows ActivityIndicator while creating conversation
- 🔒 Button disabled during loading
- ✅ Success feedback on navigation

### Error States:
- ❌ Alert dialog with error message
- 🔄 Allows retry
- 📝 Clear error descriptions

---

## 🔐 Security & Permissions

### Access Control:
- ✅ Only verified users can message
- ✅ Only opposite roles can chat (Influencer ↔ Brand Owner)
- ✅ Profile auto-created if missing
- ✅ Conversation auto-created if needed

### Data Validation:
- ✅ Receiver ID validated (24-char hex)
- ✅ User existence checked
- ✅ Role compatibility verified
- ✅ Content or file required

---

## 📱 User Experience

### Advantages:
1. **Early Communication** - Chat before applying
2. **Better Collaboration** - Discuss details anytime
3. **Transparency** - Direct line to brand owner
4. **Flexibility** - No restrictions on when to chat
5. **Context-Aware** - Default messages reference campaign/application

### User Feedback:
- ✅ Loading indicators during operations
- ✅ Success messages on completion
- ✅ Error alerts with clear descriptions
- ✅ Smooth navigation to chat screen

---

## 🧪 Testing Checklist

### Campaign Detail Screen:
- [ ] Chat button visible for influencers
- [ ] Chat button hidden for brand owners
- [ ] Loading state shows during conversation creation
- [ ] Navigates to chat screen on success
- [ ] Shows error alert on failure
- [ ] Works before applying
- [ ] Works after applying

### Applications Screen:
- [ ] Chat button visible on all applications
- [ ] Works for pending applications
- [ ] Works for accepted applications
- [ ] Works for rejected applications
- [ ] Loading state per application
- [ ] Navigates to correct conversation
- [ ] Shows error alert on failure

### Backend:
- [ ] Creates conversation if doesn't exist
- [ ] Reactivates closed conversations
- [ ] Validates user roles
- [ ] Sends default message
- [ ] Returns conversation ID
- [ ] Handles missing profiles

---

## 🚀 Future Enhancements

### Potential Improvements:
1. **Real-time Messaging** - WebSocket integration
2. **Typing Indicators** - Show when other user is typing
3. **Read Receipts** - Show when messages are read
4. **Rich Media** - Send images, videos, documents
5. **Message Reactions** - Like, love, etc.
6. **Voice Messages** - Audio recording
7. **Video Calls** - In-app video chat
8. **Message Templates** - Quick replies
9. **Chat History** - Search and filter
10. **Notifications** - Push notifications for new messages

---

## 📞 Support

If you encounter any issues with the chat feature:
1. Check internet connection
2. Verify user is logged in
3. Ensure profile exists (auto-created if missing)
4. Check brand owner ID is available
5. Review error messages in alerts

**Common Issues:**
- "Brand owner information not available" → Campaign data incomplete
- "Failed to start conversation" → Network or server error
- "Profile not found" → Auto-creation failed (rare)

---

## ✨ Summary

The new chat feature enables seamless communication between influencers and brand owners:
- 💬 Chat from campaign details
- 💬 Chat from applications
- 💬 No restrictions on timing
- 💬 Auto-created conversations
- 💬 Context-aware messages

**Result:** Better collaboration, clearer communication, and more successful campaigns!
