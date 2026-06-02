# Quick Test Guide - 5 Minutes

## 🚀 Fast Verification (5 steps)

### Step 1: Restart App (30 seconds)
```bash
# The app should auto-reload
# If not, press 'r' in the terminal to reload
```
**Expected**: App reloads without errors ✅

---

### Step 2: Test Agreement from My Applications (1 minute)
```
1. Login as Influencer (dattiganesh341@gmail.com)
2. Tap Profile tab (bottom right)
3. Tap "My Applications"
4. Find "Summer Campaign" (should be Accepted)
5. Tap "Agreement" button
```
**Expected**: 
- ✅ Navigates to Agreements screen
- ✅ No error in terminal
- ✅ No "Property 'navigation' doesn't exist" error

---

### Step 3: Test Agreement Detail (1 minute)
```
1. From Agreements screen
2. Tap on "Summer Campaign" agreement
```
**Expected**:
- ✅ Navigates to Agreement Detail screen
- ✅ Shows all 11 sections
- ✅ Brand name: "Ganesh Datti" (no extra spaces)
- ✅ Campaign: "Summer Campaign"
- ✅ Budget: ₹50,000
- ✅ "Sign Agreement" button visible

---

### Step 4: Test Chat Navigation (1 minute)
```
1. Go back to My Applications
2. Tap "Chat with Brand" button
```
**Expected**:
- ✅ Navigates to Chat screen
- ✅ Header shows brand name correctly
- ✅ No navigation error
- ✅ Can send messages

---

### Step 5: Test Agreement Signing (1.5 minutes)
```
1. Go back to Agreement Detail
2. Tap "Sign Agreement"
3. Tap "I Agree" in dialog
4. Wait for response
```
**Expected**:
- ✅ Loading indicator shows
- ✅ Success message appears
- ✅ Button changes to "Already Signed"
- ✅ Button is disabled
- ✅ Checkmark-done icon shows

---

## ✅ Success Checklist

Quick checklist - mark each as you test:

- [ ] App reloads without errors
- [ ] "Agreement" button works from My Applications
- [ ] Agreement Detail screen displays
- [ ] Brand name shows correctly (no extra spaces)
- [ ] All 11 sections visible
- [ ] "Chat with Brand" button works
- [ ] Chat screen shows brand name
- [ ] Agreement signing works
- [ ] Button changes to "Already Signed"

**If all checked**: 🎉 Everything is working!

---

## 🐛 If Something Fails

### Error: "Property 'navigation' doesn't exist"
**Solution**: 
1. Stop the app (Ctrl+C)
2. Clear cache: `npm start -- --reset-cache`
3. Restart app

### Error: "AgreementDetail not found"
**Solution**:
1. Check `AppNavigator.js` has the route
2. Restart app
3. Clear cache if needed

### Brand name has extra spaces
**Solution**:
1. Restart backend server
2. Clear app data
3. Re-login

---

## 📱 Quick Terminal Commands

### Restart with cache clear:
```bash
cd spreadb_mobile
npm start -- --reset-cache
```

### Restart backend:
```bash
cd spreadb_project
npm start
```

### Check for errors:
```bash
# Watch terminal for:
# ✅ "Bundled successfully"
# ❌ Any ERROR messages
```

---

## 🎯 Expected Results Summary

### All Working:
- ✅ No navigation errors
- ✅ Agreement button works
- ✅ Chat button works
- ✅ Brand names display correctly
- ✅ Agreement signing works
- ✅ All screens navigate properly

### Terminal Should Show:
```
✅ Bundled 5208ms
✅ No ERROR messages
✅ No navigation warnings
```

---

## 📞 Quick Help

**If all tests pass**: You're good to go! 🚀

**If any test fails**: 
1. Check the error message in terminal
2. Try restarting with cache clear
3. Check the specific fix document:
   - Navigation errors → NAVIGATION_FIX.md
   - My Applications → MY_APPLICATIONS_FIX.md
   - Brand names → FINAL_IMPLEMENTATION_SUMMARY.md

---

**Time Required**: ~5 minutes
**Difficulty**: Easy
**Status**: All should pass ✅
