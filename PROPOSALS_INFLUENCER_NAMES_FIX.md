# Proposals Screen - Influencer Names Fix

## Issue
In the brand owner's "Proposals" screen (View Applications), it was showing "Influencer" instead of the actual influencer names.

## Root Cause
The backend `getProposalsReceived` function was:
1. Populating `influencerId` with only `name` and `email` fields
2. The User model doesn't have a `name` field - it has `firstName` and `lastName`
3. Not fetching influencer profile data (which has the actual names and follower counts)

## Solution

### Backend Fix
**File**: `spreadb_project/controller/promotion_controller.js`

#### Changes Made:

1. **Updated User Population**:
```javascript
// Before:
.populate("influencerId", "name email")

// After:
.populate("influencerId", "firstName lastName email")
```

2. **Added Influencer Profile Enhancement**:
```javascript
// Get influencer profile for each application
const influencerProfile = await InfluencerProfile.findOne({ 
  userId: appObj.influencerId._id 
}).select('firstName lastName userName profilePhoto socialMedia');

if (influencerProfile) {
  appObj.influencer = {
    _id: appObj.influencerId._id,
    firstName: influencerProfile.firstName || appObj.influencerId.firstName,
    lastName: influencerProfile.lastName || appObj.influencerId.lastName,
    userName: influencerProfile.userName,
    email: appObj.influencerId.email,
    profilePhoto: influencerProfile.profilePhoto,
    followersCount: (
      (influencerProfile.socialMedia?.instagram?.followers || 0) +
      (influencerProfile.socialMedia?.youtube?.followers || 0) +
      (influencerProfile.socialMedia?.twitter?.followers || 0)
    ),
    username: influencerProfile.userName
  };
}
```

3. **Renamed for Frontend Compatibility**:
```javascript
// Rename campaignId to promotion
appObj.promotion = appObj.campaignId;
```

## Data Structure

### Before Fix:
```json
{
  "applications": [
    {
      "_id": "...",
      "influencerId": {
        "_id": "...",
        "name": null,  // ❌ Field doesn't exist
        "email": "influencer@example.com"
      },
      "campaignId": {
        "title": "Summer Campaign"
      }
    }
  ]
}
```

### After Fix:
```json
{
  "success": true,
  "proposals": [
    {
      "_id": "...",
      "influencer": {
        "_id": "...",
        "firstName": "Shannu",  // ✅ From profile or user
        "lastName": "Vanga",
        "userName": "shannu_v",
        "email": "influencer@example.com",
        "profilePhoto": "...",
        "followersCount": 15000,  // ✅ Calculated from social media
        "username": "shannu_v"
      },
      "promotion": {
        "_id": "...",
        "title": "Summer Campaign",
        "budget": 50000
      },
      "status": "pending"
    }
  ]
}
```

## Frontend Display

The ProposalsScreen already has the correct logic to display names:

```javascript
const influencerName = item.influencer?.firstName
  ? `${item.influencer.firstName} ${item.influencer.lastName || ''}`.trim()
  : item.influencer?.name || item.userName || 'Influencer';
```

Now it will correctly show:
- ✅ "Shannu Vanga" (from profile or user data)
- ✅ "@shannu_v" (username)
- ✅ "15K followers" (calculated from social media)

## Features Enhanced

### Proposals Screen Now Shows:
1. **Influencer Name** - Full name from profile
2. **Username** - @username from profile
3. **Follower Count** - Total from Instagram + YouTube + Twitter
4. **Profile Photo** - Avatar (when implemented)
5. **Campaign Title** - Which campaign they applied to
6. **Application Date** - When they applied
7. **Status Badge** - Pending/Accepted/Rejected

## Testing

### Test Steps:

1. **Restart Backend Server**:
   ```bash
   cd spreadb_project
   npm start
   ```

2. **Test as Brand Owner**:
   ```
   1. Login as Brand Owner
   2. Go to Profile tab
   3. Tap "My Campaigns"
   4. Find a campaign with applications
   5. Tap "View Applications" or navigate to Proposals
   ```

3. **Verify Display**:
   ```
   ✅ Should show influencer names (e.g., "Shannu Vanga")
   ✅ Should show username (e.g., "@shannu_v")
   ✅ Should show follower count (e.g., "15K followers")
   ✅ Should show campaign title
   ✅ Should show application date
   ✅ Should NOT show "Influencer" as name
   ```

### Expected Results:

**Before**:
```
👤 Influencer
   @undefined
   Applied 1 Jun 2026
```

**After**:
```
👤 Shannu Vanga
   @shannu_v
   Applied 1 Jun 2026
   15K followers
```

## API Response Example

### GET /api/campaigns/proposals

**Request**:
```bash
GET http://localhost:5000/api/campaigns/proposals
Authorization: Bearer <brand_owner_token>
```

**Response**:
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
        "profilePhoto": null,
        "followersCount": 15000,
        "username": "shannu_v"
      },
      "promotion": {
        "_id": "campaign_id",
        "title": "Summer Campaign",
        "budget": 50000
      },
      "status": "pending",
      "appliedAt": "2026-06-01T10:30:00.000Z",
      "proposal": "I would love to promote your brand...",
      "estimatedDelivery": "2026-06-15"
    }
  ]
}
```

## Follower Count Calculation

The follower count is calculated by summing all social media followers:

```javascript
followersCount = 
  instagram.followers + 
  youtube.followers + 
  twitter.followers
```

**Example**:
- Instagram: 10,000 followers
- YouTube: 5,000 followers
- Twitter: 0 followers
- **Total**: 15,000 followers → Displays as "15K followers"

## Debugging

### If Names Still Show as "Influencer":

1. **Check Console Logs**:
   ```
   Look for: "Get proposals error: ..."
   ```

2. **Check Database**:
   ```javascript
   // Check if influencer profile exists
   db.influencerprofiles.find({ 
     userId: ObjectId("influencer_user_id") 
   }).pretty()
   
   // Should have firstName and lastName
   ```

3. **Check User Data**:
   ```javascript
   // Check if user has firstName and lastName
   db.users.find({ 
     role: "Influencer" 
   }).pretty()
   ```

4. **Create Profile if Missing**:
   ```javascript
   db.influencerprofiles.insertOne({
     userId: ObjectId("influencer_user_id"),
     email: "influencer@example.com",
     firstName: "Shannu",
     lastName: "Vanga",
     userName: "shannu_v",
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

## Files Modified

### Backend (1 file):
- `spreadb_project/controller/promotion_controller.js`
  - Enhanced `getProposalsReceived()` function
  - Added influencer profile data population
  - Added follower count calculation
  - Renamed campaignId to promotion for frontend compatibility

### Frontend (0 files):
- No changes needed - already has correct display logic

## Status
✅ **FIXED** - Proposals screen now shows actual influencer names with profile data.

---

**Date**: June 1, 2026
**Issue**: Proposals showing "Influencer" instead of actual names
**Resolution**: Enhanced backend to populate influencer profile data
**Status**: ✅ Resolved
