# 🚀 Deployment Checklist - SpreadB Fixes

## Date: June 1, 2026

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Code Changes Verified
- [x] Sticks balance fix in counting controller
- [x] Profile auto-creation in application controller
- [x] User import added to application controller
- [x] Chat functionality added to campaign detail screen
- [x] Chat functionality added to applications screen
- [x] Message controller updated to allow direct messaging
- [x] All syntax errors resolved

### ✅ Files Modified

#### Backend (Node.js/Express):
1. **spreadb_project/controller/counting_controller.js**
   - Auto-creates influencer profiles with 100 sticks
   - Backfills sticks for existing profiles
   - Returns correct sticks count

2. **spreadb_project/controller/influencer_applications.js**
   - Added missing `User` import
   - Auto-creates profile on application
   - Proper sticks validation and deduction

3. **spreadb_project/controller/message_controller.js**
   - Removed `isActive` restriction
   - Auto-reactivates closed conversations
   - Allows direct messaging

#### Frontend (React Native/Expo):
1. **spreadb_mobile/src/screens/promotions/PromotionDetailScreen.js**
   - Added chat button in bottom bar
   - Implemented `handleStartChat` function
   - Added `brandOwnerId` state tracking

2. **spreadb_mobile/src/screens/applications/MyApplicationsScreen.js**
   - Added chat button to application cards
   - Implemented `handleStartChat` function
   - Updated card layout with action buttons

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Backend Deployment

```bash
# Navigate to backend directory
cd spreadb_project

# Pull latest changes
git pull origin main

# Install dependencies (if any new)
npm install

# Restart server
pm2 restart spreadb-backend
# OR
npm run start
```

### Step 2: Frontend Deployment

```bash
# Navigate to mobile directory
cd spreadb_mobile

# Pull latest changes
git pull origin main

# Install dependencies (if any new)
npm install

# Clear cache and rebuild
npx expo start --clear

# For production build:
eas build --platform android
eas build --platform ios
```

### Step 3: Database Migration (Automatic)

**No manual migration needed!**
- Profiles auto-created on first user action
- Sticks backfilled automatically
- Existing data preserved

---

## 🧪 POST-DEPLOYMENT TESTING

### Test Case 1: Sticks Balance
1. Login as influencer
2. Check home screen → Should show 100 sticks
3. Navigate to wallet → Should show 100 sticks
4. Both should match ✅

### Test Case 2: Application Flow
1. Browse campaigns
2. Click on a campaign
3. Click "Apply Now"
4. Should succeed without "insufficient funds" error ✅

### Test Case 3: Chat from Campaign
1. Open campaign detail as influencer
2. Click chat button (💬)
3. Should open conversation ✅
4. Check default message sent ✅

### Test Case 4: Chat from Application
1. Go to "My Applications"
2. Click "Chat with Brand" on any application
3. Should open conversation ✅
4. Check default message sent ✅

### Test Case 5: Profile Auto-Creation
1. Create new user account
2. Verify email
3. Check home screen → Should show 100 sticks ✅
4. Try to apply → Should work without profile error ✅

---

## 🔍 MONITORING

### Key Metrics to Watch:

#### Application Success Rate:
```sql
-- Check application success rate
SELECT 
  COUNT(*) as total_applications,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
  SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
FROM applications
WHERE createdAt > NOW() - INTERVAL 24 HOUR;
```

#### Profile Creation Rate:
```sql
-- Check auto-created profiles
SELECT 
  COUNT(*) as total_profiles,
  SUM(CASE WHEN sticks.total = 100 THEN 1 ELSE 0 END) as with_welcome_sticks
FROM influencerprofiles
WHERE createdAt > NOW() - INTERVAL 24 HOUR;
```

#### Conversation Creation Rate:
```sql
-- Check new conversations
SELECT 
  COUNT(*) as total_conversations,
  SUM(CASE WHEN isActive = true THEN 1 ELSE 0 END) as active
FROM conversations
WHERE createdAt > NOW() - INTERVAL 24 HOUR;
```

### Error Logs to Monitor:
- "Profile not found" errors (should be 0)
- "Insufficient sticks" errors (should decrease)
- "Conversation closed" errors (should be 0)
- Application failures (should decrease)

---

## 🐛 ROLLBACK PLAN

### If Issues Occur:

#### Backend Rollback:
```bash
cd spreadb_project
git revert HEAD
pm2 restart spreadb-backend
```

#### Frontend Rollback:
```bash
cd spreadb_mobile
git revert HEAD
npx expo start --clear
```

### Critical Issues to Watch:
1. **Sticks not showing** → Check counting controller logs
2. **Applications failing** → Check application controller logs
3. **Chat not working** → Check message controller logs
4. **Profile errors** → Check auto-creation logic

---

## 📊 SUCCESS CRITERIA

### Deployment is successful if:
- ✅ Sticks balance shows correctly on home page
- ✅ Sticks balance shows correctly in wallet
- ✅ Applications succeed without errors
- ✅ Chat buttons visible and functional
- ✅ Conversations created successfully
- ✅ No "profile not found" errors
- ✅ No "insufficient sticks" errors (when user has sticks)

### Performance Targets:
- Application success rate: > 95%
- Profile auto-creation: 100%
- Chat conversation creation: > 98%
- Error rate: < 1%

---

## 📞 SUPPORT CONTACTS

### If Issues Arise:
1. **Backend Issues** → Check server logs
2. **Frontend Issues** → Check Expo logs
3. **Database Issues** → Check MongoDB logs
4. **User Reports** → Check error tracking (Sentry/etc)

### Escalation Path:
1. Check logs and error messages
2. Review recent deployments
3. Test in staging environment
4. Rollback if critical
5. Fix and redeploy

---

## 📝 DOCUMENTATION UPDATES

### Updated Documents:
- ✅ FIXES_SUMMARY.md - Complete list of fixes
- ✅ CHAT_FEATURE_GUIDE.md - Chat feature documentation
- ✅ DEPLOYMENT_CHECKLIST.md - This document

### API Documentation:
Update API docs with:
- `/api/counting/counts` - Now returns sticks balance
- `/api/messages/send` - Now allows direct messaging
- `/api/campaigns/apply` - Now auto-creates profiles

---

## 🎯 NEXT STEPS

### After Successful Deployment:

1. **Monitor for 24 hours**
   - Watch error logs
   - Check user feedback
   - Monitor success rates

2. **Gather User Feedback**
   - Survey influencers about chat feature
   - Check application success rates
   - Monitor sticks usage

3. **Plan Enhancements**
   - Real-time messaging (WebSockets)
   - Push notifications for messages
   - Rich media support in chat
   - Message templates

---

## ✅ FINAL CHECKLIST

Before marking deployment complete:
- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] All test cases passed
- [ ] No critical errors in logs
- [ ] Monitoring dashboards updated
- [ ] Documentation updated
- [ ] Team notified of changes
- [ ] Support team briefed
- [ ] Rollback plan ready
- [ ] Success metrics tracked

---

## 🎉 DEPLOYMENT COMPLETE

Once all checks pass:
1. Mark deployment as successful
2. Notify stakeholders
3. Update release notes
4. Close related tickets
5. Plan next iteration

**Deployed by:** Development Team  
**Date:** June 1, 2026  
**Version:** 2.1.0  
**Status:** ✅ Ready for Production
