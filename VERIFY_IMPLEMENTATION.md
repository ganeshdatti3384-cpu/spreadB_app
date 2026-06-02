# Verification Checklist

## Quick Verification Steps

### ✅ Step 1: Check Navigation Route
**What to check**: AgreementDetail route is registered

**How to verify**:
1. Open `spreadb_mobile/src/navigation/AppNavigator.js`
2. Look for: `<Stack.Screen name="AgreementDetail" component={AgreementDetailScreen} />`
3. ✅ Should be present in AppStack function

**Expected**: Route is registered ✓

---

### ✅ Step 2: Test App Launch
**What to check**: App starts without errors

**How to verify**:
1. Restart the app: `npm start` in spreadb_mobile folder
2. Press 'a' for Android or 'i' for iOS
3. Watch for errors in terminal

**Expected**: 
- ✅ App bundles successfully
- ✅ No "Property 'navigation' doesn't exist" error
- ✅ No "AgreementDetail not found" error

---

### ✅ Step 3: Test Agreement Navigation
**What to check**: Can navigate to agreement detail

**How to verify**:
1. Login as Influencer (dattiganesh341@gmail.com)
2. Tap Profile → Agreements
3. Tap on "Summer Campaign" agreement
4. Should navigate to detail screen

**Expected**:
- ✅ No navigation error
- ✅ Agreement detail screen displays
- ✅ All 11 sections visible
- ✅ Brand name shows: "Ganesh Datti" (no extra spaces)
- ✅ Campaign title: "Summer Campaign"
- ✅ Budget: ₹50,000

---

### ✅ Step 4: Test Brand Name in Chat
**What to check**: Brand name displays correctly

**How to verify**:
1. Login as Influencer
2. Go to Messages tab
3. Look at conversation with brand owner

**Expected**:
- ✅ Shows brand name (not "Ganesh  Datti" with extra space)
- ✅ Shows "Ganesh Datti" or brand profile name
- ✅ Avatar shows correct initials

---

### ✅ Step 5: Test Agreement Signing
**What to check**: Can sign agreement

**How to verify**:
1. View an unsigned agreement
2. Tap "Sign Agreement"
3. Tap "I Agree" in confirmation dialog
4. Wait for response

**Expected**:
- ✅ Loading indicator shows
- ✅ Success message appears
- ✅ Button changes to "Already Signed"
- ✅ Button becomes disabled
- ✅ Checkmark-done icon shows

---

### ✅ Step 6: Verify Backend Response
**What to check**: Backend returns correct data

**How to verify**:
```bash
# Test get agreements endpoint
curl -X GET http://localhost:5000/api/actions/agreements \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "message": "Agreements fetched successfully",
  "agreements": [
    {
      "_id": "...",
      "brandName": "Ganesh Datti",        // ✅ No extra spaces
      "influencerName": "Shannu Vanga",   // ✅ No extra spaces
      "campaignTitle": "Summer Campaign",
      "budget": 50000,
      "status": "pending",
      "influencerSigned": false
    }
  ]
}
```

---

## Common Issues & Solutions

### Issue 1: Navigation Error Still Appears
**Symptom**: "AgreementDetail not found" error

**Solution**:
1. Stop the app completely (Ctrl+C)
2. Clear Metro bundler cache: `npm start -- --reset-cache`
3. Restart app
4. If still failing, check AppNavigator.js has the import and route

---

### Issue 2: Brand Name Has Extra Spaces
**Symptom**: Shows "Ganesh  Datti" or "Ganesh 's Brand"

**Solution**:
1. Check backend is updated with trim() fixes
2. Restart backend server
3. Clear app data and re-login
4. If still failing, update the user's firstName in database:
```javascript
db.users.updateOne(
  { email: "ganeshdatti3384@gmail.com" },
  { $set: { firstName: "Ganesh", lastName: "Datti" } }
)
```

---

### Issue 3: Agreement Won't Sign
**Symptom**: Error when clicking "Sign Agreement"

**Solution**:
1. Check backend logs for errors
2. Verify route exists: `POST /api/actions/sign-agreement`
3. Check authentication token is valid
4. Verify user is the influencer on the agreement
5. Check agreement is not already signed

---

### Issue 4: App Won't Load
**Symptom**: White screen or crash on launch

**Solution**:
1. Check for syntax errors in modified files
2. Clear cache: `npm start -- --reset-cache`
3. Reinstall dependencies: `npm install`
4. Check all imports are correct
5. Verify no circular dependencies

---

## Database Verification

### Check User Data
```javascript
// Check if user has trailing spaces
db.users.find({ 
  email: "ganeshdatti3384@gmail.com" 
}).pretty()

// Expected:
{
  firstName: "Ganesh",  // No trailing space
  lastName: "Datti"
}
```

### Check Brand Profile
```javascript
// Check if brand profile exists
db.brandownerprofiles.find({ 
  email: "ganeshdatti3384@gmail.com" 
}).pretty()

// Expected:
{
  brandName: "Ganesh Datti",  // Clean name, no extra spaces
  email: "ganeshdatti3384@gmail.com"
}
```

### Check Agreement Data
```javascript
// Check agreement has correct data
db.agreements.find({}).pretty()

// Expected:
{
  brandOwnerId: ObjectId("..."),
  influencerId: ObjectId("..."),
  campaignId: ObjectId("..."),
  influencerSigned: false,
  signedAt: null
}
```

---

## Success Criteria

### All checks should pass:
- [x] Navigation route registered
- [x] App launches without errors
- [x] Can navigate to agreement detail
- [x] Brand name displays correctly (no extra spaces)
- [x] Agreement shows all 11 sections
- [x] Can sign agreement successfully
- [x] Backend returns clean data
- [x] Notifications work

---

## Final Test Sequence

### Complete End-to-End Test:
1. **Start Backend**: `cd spreadb_project && npm start`
2. **Start Mobile**: `cd spreadb_mobile && npm start`
3. **Login**: Use influencer account
4. **Check Messages**: Verify brand name shows correctly
5. **Open Agreements**: Tap Profile → Agreements
6. **View Agreement**: Tap on an agreement
7. **Verify Data**: Check all sections, brand name, campaign, budget
8. **Sign Agreement**: Tap "Sign Agreement" → "I Agree"
9. **Verify Success**: Check success message and button state
10. **Check Notification**: Login as brand owner, check notifications

### Expected Result:
✅ All steps complete without errors
✅ Data displays correctly
✅ Signing works
✅ Notifications sent

---

## Troubleshooting Commands

### Clear All Caches
```bash
# Mobile app
cd spreadb_mobile
rm -rf node_modules
npm install
npm start -- --reset-cache

# Backend
cd spreadb_project
rm -rf node_modules
npm install
npm start
```

### Check Backend Logs
```bash
cd spreadb_project
npm start

# Watch for:
# ✅ "Server running on port 5000"
# ✅ "MongoDB connected"
# ❌ Any error messages
```

### Check Mobile Logs
```bash
cd spreadb_mobile
npm start

# Watch for:
# ✅ "Bundled successfully"
# ❌ "ERROR" messages
# ❌ Navigation errors
```

---

## Contact & Support

If issues persist after following this guide:
1. Check all files were saved
2. Restart both backend and mobile app
3. Clear all caches
4. Review error logs carefully
5. Check database has correct data

---

**Verification Status**: 
- [ ] Navigation route verified
- [ ] App launches successfully
- [ ] Agreement navigation works
- [ ] Brand names display correctly
- [ ] Agreement signing works
- [ ] Backend returns clean data
- [ ] All tests pass

**Mark each checkbox as you verify!**
