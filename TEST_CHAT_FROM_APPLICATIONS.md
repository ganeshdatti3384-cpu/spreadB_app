# Test: Chat from My Applications

## 🚀 Quick Test (2 minutes)

### Prerequisites
1. Backend server running
2. Mobile app running
3. Logged in as Influencer
4. Have at least one accepted application

---

## Step-by-Step Test

### Step 1: Restart Backend (30 seconds)
```bash
cd spreadb_project
# Stop current server (Ctrl+C)
npm start
```
**Expected**: Server starts without errors ✅

---

### Step 2: Restart Mobile App (30 seconds)
```bash
# App should auto-reload
# If not, press 'r' in terminal
```
**Expected**: App reloads successfully ✅

---

### Step 3: Navigate to My Applications (15 seconds)
```
1. Open app
2. Tap Profile tab (bottom right)
3. Tap "My Applications"
```
**Expected**: Applications list displays ✅

---

### Step 4: Test Chat Button (45 seconds)
```
1. Find an accepted application (green badge)
2. Scroll down to see action buttons
3. Tap "Chat with Brand" button
4. Watch the console logs
```

**Expected Console Logs**:
```
=== Starting Chat ===
Application data: {
  "promotion": {
    "brandOwnerId": { "_id": "...", "firstName": "...", "lastName": "..." },
    "brandOwnerName": "Ganesh Datti",
    "brandOwner": "...",
    "title": "Summer Campaign"
  }
}
Extracted data: {
  "brandOwnerId": "507f1f77bcf86cd799439011",
  "brandOwnerName": "Ganesh Datti",
  "campaignTitle": "Summer Campaign"
}
Sending message to brand owner: 507f1f77bcf86cd799439011
Start conversation response: { "conversationId": "..." }
Navigating to chat with: {
  "conversationId": "...",
  "participantName": "Ganesh Datti",
  "campaignName": "Summer Campaign"
}
```

**Expected UI**:
- ✅ Chat screen opens
- ✅ Header shows brand owner name: "Ganesh Datti"
- ✅ Campaign name shows (if applicable)
- ✅ Can type and send messages
- ✅ No error alerts

---

## ✅ Success Checklist

Mark each as you verify:

- [ ] Backend restarted successfully
- [ ] App reloaded without errors
- [ ] My Applications screen displays
- [ ] Can see accepted applications
- [ ] "Chat with Brand" button visible
- [ ] Console shows "=== Starting Chat ===" log
- [ ] Console shows application data
- [ ] Console shows extracted brand owner ID
- [ ] Console shows "Navigating to chat" log
- [ ] Chat screen opens
- [ ] Brand owner name displays in header
- [ ] Can send messages
- [ ] No error alerts

**If all checked**: 🎉 Chat navigation is working!

---

## 🐛 Troubleshooting

### Issue 1: "Brand owner information not available" Alert

**Symptoms**:
- Alert shows when tapping "Chat with Brand"
- Console shows: "Brand owner ID not found in application data"

**Solution**:
1. Check console log for application data
2. Verify `promotion.brandOwnerId` exists
3. If missing, restart backend server
4. Pull to refresh applications list
5. Try again

**Debug**:
```javascript
// Check what data you're getting
console.log('Application data:', application);
console.log('Promotion:', application.promotion);
console.log('Brand Owner ID:', application.promotion?.brandOwnerId);
```

---

### Issue 2: Chat Opens But Shows Wrong Name

**Symptoms**:
- Chat screen opens
- Header shows "Brand Owner" instead of actual name

**Solution**:
1. Check if BrandOwnerProfile exists for the user
2. Create profile if missing:
```javascript
db.brandownerprofiles.insertOne({
  userId: ObjectId("brand_owner_user_id"),
  email: "brand@example.com",
  brandName: "Actual Brand Name",
  industry: "Technology"
})
```
3. Restart backend
4. Pull to refresh applications
5. Try again

---

### Issue 3: Navigation Error

**Symptoms**:
- Error: "The action 'NAVIGATE' with payload..."
- Chat screen doesn't open

**Solution**:
1. Check AppNavigator.js has Chat route
2. Clear app cache: `npm start -- --reset-cache`
3. Restart app
4. Try again

---

### Issue 4: No Accepted Applications

**Symptoms**:
- Applications list is empty or only shows pending/rejected

**Solution**:
1. Login as Brand Owner
2. Go to Proposals
3. Accept an application
4. Login back as Influencer
5. Pull to refresh My Applications
6. Try again

---

## 📊 Expected Data Structure

### Backend Response:
```json
{
  "success": true,
  "applications": [
    {
      "_id": "application_id",
      "status": "accepted",
      "promotion": {
        "_id": "campaign_id",
        "title": "Summer Campaign",
        "budget": 50000,
        "brandOwnerId": {
          "_id": "brand_owner_user_id",
          "firstName": "Ganesh",
          "lastName": "Datti",
          "email": "brand@example.com"
        },
        "brandOwner": "brand_owner_user_id",
        "brandOwnerName": "Ganesh Datti",
        "brandName": "Ganesh Datti",
        "brandOwnerEmail": "brand@example.com"
      }
    }
  ]
}
```

### Frontend Extraction:
```javascript
brandOwnerId = "brand_owner_user_id"
brandOwnerName = "Ganesh Datti"
campaignTitle = "Summer Campaign"
```

---

## 🔍 Debug Commands

### Check Backend Response:
```bash
# Get your auth token first
TOKEN="your_jwt_token_here"

# Test the API
curl -X GET http://localhost:5000/api/campaigns/applications/my \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Check Database:
```javascript
// Check if application exists
db.promotions_applieds.find({ 
  influencerId: ObjectId("your_user_id"),
  status: "accepted"
}).pretty()

// Check if brand owner profile exists
db.brandownerprofiles.find({}).pretty()

// Check if user exists
db.users.find({ 
  role: "Brand Owner" 
}).pretty()
```

---

## 📱 Alternative Test Path

If direct test doesn't work, try this:

1. **Test Messages Screen First**:
   ```
   1. Go to Messages tab
   2. Check if any conversations exist
   3. If yes, tap one to open chat
   4. Verify chat works
   ```

2. **Test Direct Conversation**:
   ```
   1. Use Postman to create conversation
   2. POST /api/messages/send
   3. Body: { "receiverId": "brand_owner_id", "content": "Test" }
   4. Check if conversation appears in Messages
   ```

3. **Then Test from Applications**:
   ```
   1. Go back to My Applications
   2. Try "Chat with Brand" again
   3. Should work now
   ```

---

## ✅ Final Verification

After successful test:

1. **Verify in Messages Tab**:
   - Go to Messages tab
   - Should see conversation with brand owner
   - Brand name should display correctly

2. **Verify Chat Functionality**:
   - Send a test message
   - Login as brand owner
   - Check if message received
   - Reply to message
   - Login back as influencer
   - Check if reply received

3. **Verify Multiple Chats**:
   - Apply to another campaign
   - Get accepted
   - Start chat from that application
   - Should create separate conversation

---

**Test Duration**: ~2 minutes
**Difficulty**: Easy
**Expected Result**: ✅ Chat opens with correct brand owner name

---

**Status**: Ready to test!
**Last Updated**: June 1, 2026
