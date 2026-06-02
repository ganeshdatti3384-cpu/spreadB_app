# Testing Chat and Agreement Features

## Quick Test Checklist

### 1. Chat with Brand Owner - Name Display

#### Test Case 1: Brand Owner with Profile
```bash
# Expected: Brand name from BrandOwnerProfile displays in chat
✓ Login as Influencer
✓ Navigate to Messages screen
✓ Find conversation with brand owner
✓ Verify brand name shows (e.g., "Awesome Brand Co.")
✓ NOT showing "John Doe" or email
```

#### Test Case 2: Brand Owner without Profile
```bash
# Expected: Falls back to firstName + lastName
✓ Create brand owner without BrandOwnerProfile
✓ Start conversation
✓ Verify shows "FirstName LastName"
```

#### Test Case 3: Chat Screen Header
```bash
# Expected: Brand name in chat header
✓ Open a conversation
✓ Verify header shows brand name
✓ Verify avatar shows brand initials
✓ Verify "Online" status or campaign name displays
```

### 2. Agreement System

#### Test Case 1: View Agreement
```bash
# Expected: Agreement displays with all sections
✓ Login as Influencer
✓ Navigate to Agreements screen
✓ Tap on an agreement
✓ Verify 11 sections display:
  1. PARTIES
  2. CAMPAIGN DETAILS
  3. COMPENSATION
  4. DELIVERABLES
  5. CONTENT RIGHTS
  6. DISCLOSURE REQUIREMENTS
  7. CONFIDENTIALITY
  8. TERMINATION
  9. LIMITATION OF LIABILITY
  10. GOVERNING LAW
  11. ACCEPTANCE
✓ Verify brand name shows correctly
✓ Verify campaign title shows
✓ Verify budget shows in ₹
```

#### Test Case 2: Sign Agreement
```bash
# Expected: Agreement can be signed
✓ View unsigned agreement
✓ Verify "Sign Agreement" button is enabled
✓ Tap "Sign Agreement"
✓ Verify confirmation dialog appears
✓ Tap "I Agree"
✓ Verify loading indicator shows
✓ Verify success message
✓ Verify button changes to "Already Signed"
✓ Verify button is disabled
```

#### Test Case 3: Already Signed Agreement
```bash
# Expected: Cannot sign twice
✓ View already-signed agreement
✓ Verify button shows "Already Signed"
✓ Verify button is disabled
✓ Verify checkmark-done icon shows
```

#### Test Case 4: Brand Owner Notification
```bash
# Expected: Brand owner receives notification
✓ Login as Brand Owner
✓ Navigate to Notifications
✓ Verify notification: "📑 Influencer signed agreement for campaign."
```

## API Testing with Postman/cURL

### 1. Get Conversations (with Brand Names)
```bash
GET http://localhost:5000/api/messages/conversations
Authorization: Bearer <token>

# Expected Response:
{
  "success": true,
  "conversations": [
    {
      "_id": "...",
      "participants": [
        {
          "userId": {
            "_id": "...",
            "firstName": "John",
            "lastName": "Doe",
            "role": "Brand Owner",
            "brandName": "Awesome Brand Co.", // ⭐ This should be present
            "brandLogo": "..."
          }
        }
      ],
      "lastMessage": {...},
      "campaignTitle": "Summer Campaign"
    }
  ]
}
```

### 2. Get Agreements (with Enhanced Data)
```bash
GET http://localhost:5000/api/actions/agreements
Authorization: Bearer <token>

# Expected Response:
{
  "message": "Agreements fetched successfully",
  "agreements": [
    {
      "_id": "...",
      "brandName": "Awesome Brand Co.", // ⭐ From BrandOwnerProfile
      "influencerName": "Jane Smith", // ⭐ From InfluencerProfile
      "campaignTitle": "Summer Campaign", // ⭐ From Promotion
      "budget": 50000, // ⭐ From Promotion
      "status": "pending", // ⭐ Computed
      "influencerSigned": false,
      "signedAt": null
    }
  ]
}
```

### 3. Sign Agreement
```bash
POST http://localhost:5000/api/actions/sign-agreement
Authorization: Bearer <token>
Content-Type: application/json

{
  "agreementId": "agreement_id_here"
}

# Expected Response:
{
  "success": true,
  "message": "Agreement signed successfully",
  "agreement": {
    "_id": "...",
    "influencerSigned": true,
    "signedAt": "2026-06-01T10:30:00.000Z"
  }
}
```

## Database Verification

### 1. Check BrandOwnerProfile Collection
```javascript
db.brandownerprofiles.find({}).pretty()

// Expected:
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "brandName": "Awesome Brand Co.", // ⭐ Must exist
  "email": "brand@test.com",
  "industry": "Technology",
  "brandLogo": "...",
  "description": "..."
}
```

### 2. Check Agreement Collection
```javascript
db.agreements.find({}).pretty()

// Expected:
{
  "_id": ObjectId("..."),
  "applicationId": ObjectId("..."),
  "campaignId": ObjectId("..."),
  "brandOwnerId": ObjectId("..."),
  "influencerId": ObjectId("..."),
  "agreementText": "...",
  "influencerSigned": false, // Changes to true after signing
  "signedAt": null, // Gets timestamp after signing
  "version": 1
}
```

### 3. Check Conversation Collection
```javascript
db.conversations.find({}).populate('participants.userId').pretty()

// Expected:
{
  "_id": ObjectId("..."),
  "participants": [
    {
      "userId": {
        "_id": ObjectId("..."),
        "firstName": "John",
        "lastName": "Doe",
        "role": "Brand Owner"
      },
      "role": "Brand Owner"
    },
    {
      "userId": {
        "_id": ObjectId("..."),
        "firstName": "Jane",
        "lastName": "Smith",
        "role": "Influencer"
      },
      "role": "Influencer"
    }
  ]
}
```

## Common Issues and Solutions

### Issue 1: Brand Name Not Showing
**Symptom**: Chat shows "John Doe" instead of "Awesome Brand Co."

**Solution**:
1. Check if BrandOwnerProfile exists:
   ```javascript
   db.brandownerprofiles.findOne({ userId: ObjectId("brand_user_id") })
   ```
2. If missing, create profile:
   ```javascript
   db.brandownerprofiles.insertOne({
     userId: ObjectId("brand_user_id"),
     email: "brand@test.com",
     brandName: "Awesome Brand Co.",
     industry: "Technology",
     description: "A great brand",
     locations: ["Global"]
   })
   ```
3. Restart backend server
4. Refresh app

### Issue 2: Agreement Not Loading
**Symptom**: Empty agreements screen or error

**Solution**:
1. Check if agreements exist:
   ```javascript
   db.agreements.find({ influencerId: ObjectId("user_id") })
   ```
2. Check if application was accepted:
   ```javascript
   db.promotions_applieds.find({ 
     influencerId: ObjectId("user_id"),
     status: "accepted"
   })
   ```
3. If no agreement, accept an application first

### Issue 3: Signing Fails
**Symptom**: Error when clicking "Sign Agreement"

**Solution**:
1. Check authentication token is valid
2. Check user is the influencer on the agreement
3. Check agreement is not already signed
4. Check backend logs for errors
5. Verify route is accessible: `POST /api/actions/sign-agreement`

## Manual Testing Steps

### Complete Flow Test

1. **Setup**:
   ```bash
   # Start backend
   cd spreadb_project
   npm start
   
   # Start mobile app
   cd spreadb_mobile
   npm start
   ```

2. **Create Test Data**:
   - Create Brand Owner account
   - Create BrandOwnerProfile with brandName
   - Create Influencer account
   - Create InfluencerProfile
   - Create Campaign
   - Apply to campaign as influencer
   - Accept application as brand owner

3. **Test Chat**:
   - Login as influencer
   - Go to Messages
   - Find conversation with brand owner
   - ✓ Verify brand name shows
   - Send a message
   - Login as brand owner
   - ✓ Verify message received
   - Reply to message
   - Login as influencer
   - ✓ Verify reply received

4. **Test Agreement**:
   - Login as influencer
   - Go to Agreements
   - ✓ Verify agreement appears
   - Tap agreement
   - ✓ Verify all 11 sections display
   - ✓ Verify brand name correct
   - ✓ Verify campaign details correct
   - ✓ Verify budget shows
   - Tap "Sign Agreement"
   - Tap "I Agree"
   - ✓ Verify success message
   - ✓ Verify button changes to "Already Signed"
   - Go back and re-enter
   - ✓ Verify still shows as signed
   - Login as brand owner
   - Go to Notifications
   - ✓ Verify notification received

## Success Criteria

### Chat Feature
- [x] Brand owner name displays from BrandOwnerProfile.brandName
- [x] Falls back to firstName + lastName if no profile
- [x] Name shows in conversation list
- [x] Name shows in chat header
- [x] Avatar shows correct initials
- [x] Messages send and receive correctly

### Agreement Feature
- [x] Agreement displays with all 11 sections
- [x] Brand name populates correctly
- [x] Influencer name populates correctly
- [x] Campaign title populates correctly
- [x] Budget populates correctly in ₹
- [x] Sign button works
- [x] Loading state shows during signing
- [x] Success message displays
- [x] Button changes to "Already Signed"
- [x] Cannot sign twice
- [x] Brand owner receives notification

---

## Test Results Template

```
Date: ___________
Tester: ___________

Chat Features:
[ ] Brand name displays correctly
[ ] Fallback to user name works
[ ] Chat header shows brand name
[ ] Messages send successfully
[ ] Messages receive successfully
[ ] Real-time updates work

Agreement Features:
[ ] Agreement list loads
[ ] Agreement detail shows all sections
[ ] Brand name correct
[ ] Campaign details correct
[ ] Budget displays correctly
[ ] Sign button works
[ ] Loading state shows
[ ] Success message displays
[ ] Already-signed state works
[ ] Cannot sign twice
[ ] Notification sent to brand owner

Issues Found:
_________________________________
_________________________________
_________________________________

Notes:
_________________________________
_________________________________
_________________________________
```
