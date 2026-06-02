# 🔄 System Flow Diagrams

## SpreadB App - Fixed Flows

---

## 1. 📊 Sticks Balance Flow (FIXED)

### Before Fix:
```
User Opens App
    ↓
Home Screen loads
    ↓
Calls /api/counting/counts
    ↓
❌ Returns sticks: 0 (not fetching from profile)
    ↓
User sees: "0 Sticks" 😞
```

### After Fix:
```
User Opens App
    ↓
Home Screen loads
    ↓
Calls /api/counting/counts
    ↓
✅ Fetches from InfluencerProfile
    ↓
✅ Auto-creates profile if missing (100 sticks)
    ↓
✅ Backfills sticks if profile exists but no sticks
    ↓
Returns sticks: 100
    ↓
User sees: "100 Sticks" 😊
```

---

## 2. 📝 Application Flow (FIXED)

### Before Fix:
```
User clicks "Apply Now"
    ↓
Calls /api/campaigns/apply
    ↓
❌ Profile not found
    ↓
❌ Error: "Profile not found" 😞
```

### After Fix:
```
User clicks "Apply Now"
    ↓
Calls /api/campaigns/apply
    ↓
✅ Checks if profile exists
    ↓
✅ Auto-creates profile if missing
    ↓
✅ Initializes 100 free sticks
    ↓
✅ Validates sticks balance
    ↓
✅ Deducts sticks
    ↓
✅ Creates application
    ↓
Success! 😊
```

---

## 3. 💬 Chat Flow (NEW FEATURE)

### From Campaign Detail:
```
User views campaign
    ↓
Clicks chat button (💬)
    ↓
Calls /api/messages/send
    ↓
✅ Validates brand owner ID
    ↓
✅ Finds or creates conversation
    ↓
✅ Reactivates if closed
    ↓
✅ Sends introduction message
    ↓
✅ Returns conversation ID
    ↓
Navigates to ChatScreen
    ↓
User can chat! 😊
```

### From Applications:
```
User views applications
    ↓
Clicks "Chat with Brand"
    ↓
Calls /api/messages/send
    ↓
✅ Gets brand owner ID from application
    ↓
✅ Finds or creates conversation
    ↓
✅ Sends application reference message
    ↓
✅ Returns conversation ID
    ↓
Navigates to ChatScreen
    ↓
User can discuss application! 😊
```

---

## 4. 👤 Profile Auto-Creation Flow (NEW)

### Trigger Points:
```
User Action
    ↓
┌─────────────────────────────────────┐
│ Trigger 1: Signup & Email Verify   │
│ Trigger 2: First Application       │
│ Trigger 3: First Message           │
│ Trigger 4: Home Page Load          │
└─────────────────────────────────────┘
    ↓
Check if profile exists
    ↓
    ├─ YES → Use existing profile
    │
    └─ NO → Auto-create profile
              ↓
              ├─ Set firstName, lastName, email
              ├─ Generate userName from email
              ├─ Initialize sticks: { free: 100, total: 100 }
              ├─ Add welcome transaction
              └─ Save to database
              ↓
              ✅ Profile ready!
```

---

## 5. 🔄 Complete User Journey

### New User Experience:
```
1. SIGNUP
   User signs up
       ↓
   Verifies email
       ↓
   ✅ Profile auto-created with 100 sticks

2. BROWSE
   Opens app
       ↓
   Home screen shows: "100 Sticks"
       ↓
   Browses campaigns

3. CHAT (NEW!)
   Clicks campaign
       ↓
   Clicks chat button
       ↓
   ✅ Starts conversation with brand
       ↓
   Discusses campaign details

4. APPLY
   Clicks "Apply Now"
       ↓
   ✅ Sticks validated (100 available)
       ↓
   ✅ Application submitted
       ↓
   Sticks deducted (e.g., 90 remaining)

5. FOLLOW UP (NEW!)
   Goes to "My Applications"
       ↓
   Clicks "Chat with Brand"
       ↓
   ✅ Continues conversation
       ↓
   Discusses application status

6. COLLABORATION
   Application accepted
       ↓
   ✅ Can still chat
       ↓
   Coordinates campaign execution
       ↓
   Success! 🎉
```

---

## 6. 🔐 Security & Validation Flow

### Message Creation:
```
User clicks chat button
    ↓
Frontend validates:
    ├─ Brand owner ID exists?
    ├─ User is logged in?
    └─ Network available?
    ↓
Sends to backend
    ↓
Backend validates:
    ├─ Receiver ID format (24-char hex)
    ├─ Receiver exists in database
    ├─ Sender exists in database
    ├─ Different roles (Influencer ↔ Brand)
    └─ Content or file provided
    ↓
✅ All checks pass
    ↓
Creates/finds conversation
    ↓
Saves message
    ↓
Returns conversation ID
    ↓
✅ Success!
```

---

## 7. 💰 Sticks System Flow

### Sticks Lifecycle:
```
NEW USER
    ↓
Profile created
    ↓
✅ 100 FREE STICKS granted
    ↓
┌─────────────────────────────────────┐
│ Sticks Object:                      │
│ {                                   │
│   free: 100,                        │
│   purchased: 0,                     │
│   total: 100,                       │
│   spent: 0,                         │
│   transactions: [...]               │
│ }                                   │
└─────────────────────────────────────┘
    ↓
USER APPLIES TO CAMPAIGN
    ↓
Sticks deducted (e.g., 10 sticks)
    ↓
┌─────────────────────────────────────┐
│ Updated Sticks:                     │
│ {                                   │
│   free: 90,                         │
│   purchased: 0,                     │
│   total: 90,                        │
│   spent: 10,                        │
│   transactions: [                   │
│     { type: "spent", amount: 10 }   │
│   ]                                 │
│ }                                   │
└─────────────────────────────────────┘
    ↓
USER WITHDRAWS APPLICATION
    ↓
Sticks refunded
    ↓
┌─────────────────────────────────────┐
│ Refunded Sticks:                    │
│ {                                   │
│   free: 100,                        │
│   purchased: 0,                     │
│   total: 100,                       │
│   spent: 0,                         │
│   transactions: [                   │
│     { type: "spent", amount: 10 },  │
│     { type: "earned", amount: 10 }  │
│   ]                                 │
│ }                                   │
└─────────────────────────────────────┘
```

---

## 8. 🗨️ Conversation State Management

### Conversation Lifecycle:
```
INITIAL STATE
    ↓
No conversation exists
    ↓
USER CLICKS CHAT
    ↓
✅ Creates new conversation
    ↓
┌─────────────────────────────────────┐
│ Conversation:                       │
│ {                                   │
│   participants: [                   │
│     { userId: influencer, role }    │
│     { userId: brand, role }         │
│   ],                                │
│   isActive: true,                   │
│   lastMessage: null,                │
│   metadata: {                       │
│     totalMessages: 0,               │
│     unreadCount: { ... }            │
│   }                                 │
│ }                                   │
└─────────────────────────────────────┘
    ↓
MESSAGES EXCHANGED
    ↓
Conversation updated
    ↓
CAMPAIGN ENDS
    ↓
Conversation marked inactive
    ↓
USER SENDS NEW MESSAGE
    ↓
✅ Conversation reactivated
    ↓
Messaging continues!
```

---

## 9. 🔄 Error Handling Flow

### Graceful Degradation:
```
User Action
    ↓
Try Operation
    ↓
    ├─ SUCCESS → Continue
    │
    └─ ERROR
        ↓
        ├─ Profile Missing?
        │   └─ ✅ Auto-create profile
        │       └─ Retry operation
        │
        ├─ Sticks Missing?
        │   └─ ✅ Backfill 100 sticks
        │       └─ Retry operation
        │
        ├─ Conversation Closed?
        │   └─ ✅ Reactivate conversation
        │       └─ Retry operation
        │
        └─ Other Error?
            └─ Show error message
                └─ Allow retry
```

---

## 10. 📱 UI State Management

### Loading States:
```
User clicks button
    ↓
┌─────────────────────────────────────┐
│ UI State: LOADING                   │
│ - Show spinner                      │
│ - Disable button                    │
│ - Prevent double-click              │
└─────────────────────────────────────┘
    ↓
API call in progress
    ↓
    ├─ SUCCESS
    │   ↓
    │   ┌─────────────────────────────┐
    │   │ UI State: SUCCESS           │
    │   │ - Hide spinner              │
    │   │ - Navigate to next screen   │
    │   │ - Show success feedback     │
    │   └─────────────────────────────┘
    │
    └─ ERROR
        ↓
        ┌─────────────────────────────┐
        │ UI State: ERROR             │
        │ - Hide spinner              │
        │ - Show error alert          │
        │ - Re-enable button          │
        │ - Allow retry               │
        └─────────────────────────────┘
```

---

## 📊 Summary

### Key Flows Fixed:
1. ✅ Sticks balance - Now fetches correctly
2. ✅ Application - Auto-creates profile
3. ✅ Profile creation - Happens automatically
4. ✅ Chat - New feature added

### Key Improvements:
1. ✅ No more "profile not found" errors
2. ✅ No more "insufficient sticks" errors (when user has sticks)
3. ✅ Seamless communication between users
4. ✅ Better user experience overall

### Result:
**A fully functional app with no blocking errors and enhanced communication features!** 🎉
