# 🧪 Complete Testing Guide - SpreadB App

## Comprehensive Test Scenarios

---

## 🎯 Test Suite 1: User Registration & Onboarding

### Test 1.1: New Influencer Signup
**Steps:**
1. Open app → Click "Sign Up"
2. Select "Influencer" role
3. Enter: firstName, lastName, email, password
4. Click "Sign Up"
5. Check email for OTP
6. **Copy OTP from email**
7. Return to app
8. **OTP should auto-paste** ✅
9. Wait 500ms → **Auto-verify** ✅
10. See "Congratulations" screen ✅
11. Click "Get Started"
12. See profile setup intro
13. Click "Get Started" again
14. Fill profile form
15. Click "Upload Photo"
16. **Permission dialog appears** ✅
17. Grant permission
18. Select photo
19. Submit profile
20. Navigate to home screen
21. **See 100 sticks balance** ✅

**Expected Results:**
- ✅ OTP auto-pastes from clipboard
- ✅ Auto-verifies after 500ms
- ✅ Congratulations screen shows
- ✅ Photo permission handled properly
- ✅ Profile created with 100 sticks
- ✅ Home screen shows correct balance

---

### Test 1.2: New Brand Owner Signup
**Steps:**
1. Sign up as "Brand Owner"
2. Follow same OTP flow
3. See congratulations screen
4. Complete brand profile
5. Upload brand logo (test permissions)
6. Submit profile
7. Navigate to home screen

**Expected Results:**
- ✅ Same smooth OTP experience
- ✅ Brand profile created
- ✅ No sticks (brand owners don't get sticks)

---

## 🎯 Test Suite 2: Sticks System

### Test 2.1: Initial Sticks Balance
**Steps:**
1. Login as influencer
2. Check home screen → **Should show 100 sticks**
3. Navigate to wallet → **Should show 100 sticks**
4. Both should match ✅

**Expected Results:**
- ✅ Home: 100 sticks
- ✅ Wallet: 100 sticks
- ✅ Numbers match

---

### Test 2.2: Sticks Deduction After Application
**Steps:**
1. Browse campaigns
2. Find campaign requiring 10 sticks
3. Click "Apply Now"
4. Confirm application
5. **Wait for success message**
6. **Press back to home screen**
7. **Check sticks balance** → Should show 90 sticks ✅
8. Navigate to wallet → Should show 90 sticks ✅
9. Check "My Applications" → Should show application

**Expected Results:**
- ✅ Application successful
- ✅ Home screen shows 90 sticks (updated!)
- ✅ Wallet shows 90 sticks
- ✅ Application appears in list

---

### Test 2.3: Sticks Refund on Withdrawal
**Steps:**
1. Go to "My Applications"
2. Find pending application
3. Withdraw application
4. Return to home screen
5. Check balance → Should show 100 sticks again ✅

**Expected Results:**
- ✅ Sticks refunded
- ✅ Balance updated on home screen

---

## 🎯 Test Suite 3: Chat & Messaging

### Test 3.1: Chat from Campaign (Before Applying)
**Steps:**
1. Login as influencer
2. Browse campaigns
3. Open campaign detail
4. **Click chat button (💬)** ✅
5. **Message should send** ✅
6. Type: "Hi! I'm interested in this campaign"
7. Click send
8. **Message appears immediately** ✅
9. **Message persists after reload** ✅

**Expected Results:**
- ✅ Chat button visible
- ✅ Conversation created
- ✅ Message sends successfully
- ✅ Message appears in chat
- ✅ Message persists

---

### Test 3.2: Chat from Application
**Steps:**
1. Go to "My Applications"
2. Click "Chat with Brand" on any application
3. **Conversation opens** ✅
4. Send message: "I'd like to discuss my application"
5. **Message sends successfully** ✅
6. Check messages list
7. **Conversation appears** ✅
8. **Brand name shows correctly** ✅

**Expected Results:**
- ✅ Chat opens from application
- ✅ Message sends
- ✅ Appears in messages list
- ✅ Brand name displays properly

---

### Test 3.3: Influencer Name Display
**Steps:**
1. Login as brand owner
2. Accept an application
3. Go to "Messages"
4. **Check conversation list**
5. **Influencer name should show "FirstName LastName"** ✅
6. Open conversation
7. **Name shows in header** ✅

**Expected Results:**
- ✅ Influencer name: "John Doe" (not "User" or "undefined")
- ✅ Name shows in list
- ✅ Name shows in chat header
- ✅ Avatar shows initials

---

### Test 3.4: Message Sending Reliability
**Steps:**
1. Open any conversation
2. Send 5 messages rapidly
3. **All messages should send** ✅
4. **No duplicates** ✅
5. **Correct order** ✅
6. Close and reopen chat
7. **All messages still there** ✅

**Expected Results:**
- ✅ All messages send
- ✅ No errors
- ✅ Correct order
- ✅ Persistent storage

---

## 🎯 Test Suite 4: Application Flow

### Test 4.1: Complete Application Flow
**Steps:**
1. **Influencer: Browse campaigns**
2. **Influencer: Click chat button** ✅
3. **Influencer: Ask questions about campaign**
4. **Influencer: Click "Apply Now"**
5. **Influencer: Confirm (10 sticks deducted)**
6. **Influencer: Check home → 90 sticks** ✅
7. **Brand: Go to "Proposals"**
8. **Brand: See new application**
9. **Brand: Click "Accept"**
10. **Brand: Agreement generated**
11. **Influencer: Receive notification**
12. **Influencer: Go to "My Applications"**
13. **Influencer: See "Accepted" status** ✅
14. **Influencer: Click "Chat with Brand"** ✅
15. **Influencer: Conversation opens** ✅
16. **Both: Can chat freely** ✅

**Expected Results:**
- ✅ Can chat before applying
- ✅ Application successful
- ✅ Sticks deducted and updated
- ✅ Brand can accept
- ✅ Conversation auto-created
- ✅ Both can chat after acceptance
- ✅ Brand info visible to influencer

---

### Test 4.2: Multiple Applications
**Steps:**
1. Apply to 3 different campaigns (30 sticks total)
2. Check home screen → Should show 70 sticks ✅
3. Withdraw 1 application
4. Check home screen → Should show 80 sticks ✅
5. Check "My Applications" → Should show all 3

**Expected Results:**
- ✅ Multiple applications work
- ✅ Sticks deducted correctly
- ✅ Refunds work
- ✅ Balance always accurate

---

## 🎯 Test Suite 5: OTP & Authentication

### Test 5.1: OTP Auto-Paste
**Steps:**
1. Signup/Login to trigger OTP
2. Receive OTP email: "Your code is 123456"
3. **Copy "123456" from email**
4. Return to app
5. **OTP should auto-paste** ✅
6. **Wait 500ms**
7. **Should auto-verify** ✅

**Expected Results:**
- ✅ OTP auto-pastes
- ✅ Auto-verifies
- ✅ Smooth experience

---

### Test 5.2: Manual OTP Paste
**Steps:**
1. Trigger OTP
2. Copy OTP from email
3. Return to app
4. **Click "Tap to paste OTP from clipboard"** ✅
5. **OTP pastes** ✅
6. **Auto-verifies** ✅

**Expected Results:**
- ✅ Manual paste button works
- ✅ OTP pastes correctly
- ✅ Auto-verifies

---

### Test 5.3: Manual OTP Entry
**Steps:**
1. Trigger OTP
2. Don't copy OTP
3. Manually type each digit
4. Click "Verify & Continue"
5. Should verify successfully ✅

**Expected Results:**
- ✅ Manual entry still works
- ✅ Verification successful

---

## 🎯 Test Suite 6: Photo Permissions

### Test 6.1: First Time Permission
**Steps:**
1. Create profile
2. Click "Upload Photo"
3. **Permission dialog appears** ✅
4. Click "Allow"
5. **Image picker opens** ✅
6. Select photo
7. **Photo displays** ✅

**Expected Results:**
- ✅ Permission requested
- ✅ Clear message
- ✅ Image picker works
- ✅ Photo uploads

---

### Test 6.2: Permission Denied
**Steps:**
1. Click "Upload Photo"
2. Permission dialog appears
3. Click "Don't Allow"
4. **Alert shows with "Open Settings" option** ✅
5. Click "Open Settings"
6. **Device settings open** ✅
7. Grant permission
8. Return to app
9. Try upload again
10. **Should work now** ✅

**Expected Results:**
- ✅ Helpful error message
- ✅ Settings link works
- ✅ Can retry after granting

---

## 🎯 Test Suite 7: Edge Cases

### Test 7.1: Network Errors
**Steps:**
1. Turn off WiFi/Data
2. Try to send message
3. **Error alert appears** ✅
4. Turn on network
5. **Retry sending** ✅
6. **Message sends** ✅

**Expected Results:**
- ✅ Graceful error handling
- ✅ Can retry
- ✅ Works after reconnect

---

### Test 7.2: Insufficient Sticks
**Steps:**
1. Apply to campaigns until < 10 sticks remain
2. Try to apply to campaign requiring 10 sticks
3. **Error: "Not enough sticks"** ✅
4. **Shows available vs required** ✅

**Expected Results:**
- ✅ Clear error message
- ✅ Shows balance
- ✅ Application blocked

---

### Test 7.3: Expired OTP
**Steps:**
1. Trigger OTP
2. Wait 6 minutes (OTP expires after 5 min)
3. Try to verify
4. **Error: "OTP expired"** ✅
5. Click "Resend code"
6. **New OTP sent** ✅
7. Verify with new OTP
8. **Success** ✅

**Expected Results:**
- ✅ Expiry handled
- ✅ Resend works
- ✅ New OTP works

---

## 🎯 Test Suite 8: UI/UX

### Test 8.1: Loading States
**Steps:**
1. Perform any action (send message, apply, etc.)
2. **Loading indicator shows** ✅
3. **Button disabled during loading** ✅
4. **Action completes** ✅
5. **Loading indicator hides** ✅

**Expected Results:**
- ✅ Clear loading feedback
- ✅ No double-clicks
- ✅ Smooth transitions

---

### Test 8.2: Empty States
**Steps:**
1. New user with no applications
2. Go to "My Applications"
3. **Empty state shows** ✅
4. **"Browse Campaigns" button visible** ✅
5. Click button
6. **Navigates to campaigns** ✅

**Expected Results:**
- ✅ Helpful empty states
- ✅ Clear call-to-action
- ✅ Easy navigation

---

### Test 8.3: Success Feedback
**Steps:**
1. Apply to campaign
2. **Success alert shows** ✅
3. Send message
4. **Message appears immediately** ✅
5. Upload photo
6. **Photo displays** ✅

**Expected Results:**
- ✅ Clear success feedback
- ✅ Immediate visual confirmation
- ✅ No confusion

---

## 📊 Test Results Template

### Test Session: [Date]
**Tester:** [Name]  
**Device:** [iPhone 14 / Samsung Galaxy S23]  
**OS:** [iOS 17 / Android 14]

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | New Influencer Signup | ✅ Pass | OTP auto-paste worked perfectly |
| 1.2 | New Brand Signup | ✅ Pass | |
| 2.1 | Initial Sticks Balance | ✅ Pass | |
| 2.2 | Sticks Deduction | ✅ Pass | Balance updated on home screen |
| 2.3 | Sticks Refund | ✅ Pass | |
| 3.1 | Chat from Campaign | ✅ Pass | |
| 3.2 | Chat from Application | ✅ Pass | |
| 3.3 | Influencer Name Display | ✅ Pass | Names show correctly |
| 3.4 | Message Reliability | ✅ Pass | |
| 4.1 | Complete Application Flow | ✅ Pass | End-to-end working |
| 4.2 | Multiple Applications | ✅ Pass | |
| 5.1 | OTP Auto-Paste | ✅ Pass | |
| 5.2 | Manual OTP Paste | ✅ Pass | |
| 5.3 | Manual OTP Entry | ✅ Pass | |
| 6.1 | First Time Permission | ✅ Pass | |
| 6.2 | Permission Denied | ✅ Pass | Settings link works |
| 7.1 | Network Errors | ✅ Pass | |
| 7.2 | Insufficient Sticks | ✅ Pass | |
| 7.3 | Expired OTP | ✅ Pass | |
| 8.1 | Loading States | ✅ Pass | |
| 8.2 | Empty States | ✅ Pass | |
| 8.3 | Success Feedback | ✅ Pass | |

**Overall Status:** ✅ All Tests Passed  
**Ready for Production:** Yes

---

## 🚀 Pre-Production Checklist

Before deploying to production:

### Backend:
- [ ] All controllers updated
- [ ] Database migrations (if any)
- [ ] Environment variables set
- [ ] Server restarted
- [ ] Logs monitored

### Frontend:
- [ ] New packages installed (`@react-native-clipboard/clipboard`)
- [ ] Cache cleared
- [ ] Build tested
- [ ] Permissions configured in app.json
- [ ] Deep links tested

### Testing:
- [ ] All 23 test scenarios passed
- [ ] Tested on iOS device
- [ ] Tested on Android device
- [ ] Edge cases covered
- [ ] Performance acceptable

### Documentation:
- [ ] README updated
- [ ] API docs updated
- [ ] User guide updated
- [ ] Support team briefed

### Monitoring:
- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Performance monitoring active
- [ ] User feedback channel ready

---

## ✅ Sign-Off

**Development Team:** ________________  
**QA Team:** ________________  
**Product Owner:** ________________  
**Date:** ________________

**Status:** Ready for Production 🎉
