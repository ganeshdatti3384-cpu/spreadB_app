# Debug Guide: Proposals Influencer Names

## Issue
Proposals screen still showing "Influencer" instead of actual names after fix.

## Debug Steps

### Step 1: Restart Backend Server (CRITICAL!)

**You MUST restart the backend server for changes to take effect!**

```bash
# Stop the current server
# Press Ctrl+C in the terminal running the backend

# Navigate to backend directory
cd spreadb_project

# Start the server again
npm start

# Wait for:
# ✅ "Server running on port 5000"
# ✅ "MongoDB connected"
```

**Why this is critical**: Node.js caches the old code. Without restarting, the old `getProposalsReceived` function is still running!

---

### Step 2: Restart Mobile App

```bash
# The app should auto-reload
# If not, press 'r' in the terminal

# Or restart completely:
cd spreadb_mobile
npm start
```

---

### Step 3: Test and Check Logs

1. **Login as Brand Owner**
2. **Navigate to Proposals**:
   - Profile → My Campaigns → View Applications
   - OR Profile → Proposals

3. **Check Backend Console** for these logs:
```
=== Get Proposals Received ===
Brand Owner ID: 6a18122fccefc039350bb803
Found promotions: 1
Found applications: 2
Processing application: {
  id: '...',
  influencerId: '6a181360ccefc039350bb817',
  influencerFirstName: 'Shannu',
  influencerLastName: 'Vanga'
}
Influencer profile found: {
  firstName: 'Shannu',
  lastName: 'Vanga',
  userName: 'shannu_v'
}
Final influencer data: {
  firstName: 'Shannu',
  lastName: 'Vanga'
}
Returning 2 enhanced applications
```

4. **Check Mobile Console** for these logs:
```
=== Loading Proposals ===
Proposals response: {
  "success": true,
  "proposals": [
    {
      "influencer": {
        "firstName": "Shannu",
        "lastName": "Vanga",
        "userName": "shannu_v",
        ...
      }
    }
  ]
}
```

---

### Step 4: Verify Data in Database

If logs show issues, check the database:

```javascript
// 1. Check if influencer user exists
db.users.find({ 
  role: "Influencer" 
}).pretty()

// Expected:
{
  "_id": ObjectId("6a181360ccefc039350bb817"),
  "firstName": "Shannu",  // ✅ Should exist
  "lastName": "Vanga",    // ✅ Should exist
  "email": "dattiganesh341@gmail.com",
  "role": "Influencer"
}

// 2. Check if influencer profile exists
db.influencerprofiles.find({
  userId: ObjectId("6a181360ccefc039350bb817")
}).pretty()

// Expected:
{
  "_id": ObjectId("..."),
  "userId": ObjectId("6a181360ccefc039350bb817"),
  "firstName": "Shannu",
  "lastName": "Vanga",
  "userName": "shannu_v",
  "email": "dattiganesh341@gmail.com"
}

// 3. Check applications
db.promotions_applieds.find({}).pretty()

// Expected:
{
  "_id": ObjectId("..."),
  "influencerId": ObjectId("6a181360ccefc039350bb817"),
  "campaignId": ObjectId("..."),
  "status": "pending"
}
```

---

## Common Issues & Solutions

### Issue 1: Backend Not Restarted
**Symptom**: No new logs in backend console

**Solution**:
1. Stop backend (Ctrl+C)
2. Start again: `npm start`
3. Verify you see "Server running on port 5000"

---

### Issue 2: Old Code Still Running
**Symptom**: Backend logs don't show "=== Get Proposals Received ==="

**Solution**:
1. Check you're editing the correct file
2. Save the file (Ctrl+S)
3. Restart backend server
4. Check file was actually saved

---

### Issue 3: User Has No firstName/lastName
**Symptom**: Backend logs show:
```
influencerFirstName: undefined
influencerLastName: undefined
```

**Solution**: Update user in database:
```javascript
db.users.updateOne(
  { email: "dattiganesh341@gmail.com" },
  { 
    $set: { 
      firstName: "Shannu", 
      lastName: "Vanga" 
    } 
  }
)
```

---

### Issue 4: No Influencer Profile
**Symptom**: Backend logs show:
```
Influencer profile found: NOT FOUND
Using fallback user data
```

**Solution**: Create influencer profile:
```javascript
db.influencerprofiles.insertOne({
  userId: ObjectId("6a181360ccefc039350bb817"),
  email: "dattiganesh341@gmail.com",
  firstName: "Shannu",
  lastName: "Vanga",
  userName: "shannu_v",
  about: "Influencer profile",
  category: ["Fashion"],
  locations: ["Mumbai"],
  socialMedia: {
    instagram: {
      link: "https://instagram.com/shannu_v",
      followers: 10000,
      views: 50000
    }
  }
})
```

---

### Issue 5: Frontend Not Receiving Data
**Symptom**: Mobile console shows empty proposals

**Solution**:
1. Check backend is running
2. Check API endpoint is correct: `/api/promotion/proposals`
3. Check authentication token is valid
4. Try logging out and back in

---

## Manual API Test

Test the API directly to see what it returns:

```bash
# Get your auth token first (from mobile app logs or login response)
TOKEN="your_jwt_token_here"

# Test the API
curl -X GET http://localhost:5000/api/promotion/proposals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "proposals": [
    {
      "_id": "application_id",
      "influencer": {
        "_id": "user_id",
        "firstName": "Shannu",
        "lastName": "Vanga",
        "userName": "shannu_v",
        "email": "dattiganesh341@gmail.com",
        "followersCount": 10000
      },
      "promotion": {
        "_id": "campaign_id",
        "title": "Summer Campaign",
        "budget": 50000
      },
      "status": "pending"
    }
  ]
}
```

---

## Checklist

Before reporting still not working, verify:

- [ ] Backend server was restarted (Ctrl+C then npm start)
- [ ] Mobile app was reloaded
- [ ] Backend console shows "=== Get Proposals Received ===" log
- [ ] Backend console shows influencer firstName and lastName
- [ ] Mobile console shows "=== Loading Proposals ===" log
- [ ] Mobile console shows proposals with influencer data
- [ ] Database has users with firstName and lastName
- [ ] Database has influencer profiles (optional but recommended)
- [ ] Logged in as Brand Owner (not Influencer)
- [ ] Brand owner has campaigns with applications

---

## Quick Fix Script

If you want to ensure all data is correct, run this in MongoDB:

```javascript
// 1. Update all users to have proper names
db.users.find({ role: "Influencer" }).forEach(function(user) {
  if (!user.firstName || !user.lastName) {
    // Extract from email if needed
    const emailName = user.email.split('@')[0];
    db.users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          firstName: emailName,
          lastName: "User"
        } 
      }
    );
  }
});

// 2. Create profiles for users without them
db.users.find({ role: "Influencer" }).forEach(function(user) {
  const existingProfile = db.influencerprofiles.findOne({ userId: user._id });
  if (!existingProfile) {
    db.influencerprofiles.insertOne({
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.email.split('@')[0],
      about: "Influencer",
      category: ["General"],
      locations: ["Global"],
      socialMedia: {
        instagram: { followers: 0, views: 0 },
        youtube: { followers: 0, views: 0 },
        twitter: { followers: 0, views: 0 }
      }
    });
  }
});
```

---

## Expected UI After Fix

**Before**:
```
┌─────────────────────────────┐
│ 👤 Influencer               │
│    @undefined               │
│    📅 Applied 1 Jun 2026    │
│    [Reject] [Accept]        │
└─────────────────────────────┘
```

**After**:
```
┌─────────────────────────────┐
│ 👤 Shannu Vanga             │
│    @shannu_v                │
│    📅 Applied 1 Jun 2026    │
│    10K followers            │
│    [Reject] [Accept]        │
└─────────────────────────────┘
```

---

## Still Not Working?

If after all these steps it's still not working:

1. **Share the logs**:
   - Backend console output
   - Mobile console output
   - Any error messages

2. **Share the data**:
   - Result of: `db.users.find({ role: "Influencer" }).pretty()`
   - Result of: `db.influencerprofiles.find({}).pretty()`
   - Result of: `db.promotions_applieds.find({}).pretty()`

3. **Verify the fix was applied**:
   - Open `spreadb_project/controller/promotion_controller.js`
   - Search for "=== Get Proposals Received ==="
   - If not found, the file wasn't saved or you're editing the wrong file

---

**Last Updated**: June 1, 2026
**Status**: Debugging in progress
