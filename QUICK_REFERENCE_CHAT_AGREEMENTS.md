# Quick Reference: Chat & Agreements

## 🎯 What Was Implemented

### 1. Chat with Brand Owners ✅
- Brand owner's **brand name** (not personal name) displays in chat
- Proper fallback if brand profile doesn't exist
- Works in both conversation list and chat screen

### 2. Default Agreement Template ✅
- Comprehensive 11-section agreement
- Auto-populated with brand name, influencer name, campaign details, and budget
- Digital signature functionality
- Prevents double-signing

---

## 📁 Files Changed

### Frontend (Mobile App)
```
spreadb_mobile/
├── src/
│   ├── utils/
│   │   └── nameExtractor.js                    ✏️ Enhanced brand name extraction
│   ├── screens/
│   │   ├── agreements/
│   │   │   └── AgreementDetailScreen.js        ✏️ Added signing functionality
│   │   └── messages/
│   │       ├── ChatScreen.js                   ✓ Already using utility
│   │       └── MessagesScreen.js               ✓ Already using utility
│   └── api/
│       └── applications.js                     ✏️ Added signAgreement()
```

### Backend (API Server)
```
spreadb_project/
├── controller/
│   ├── applications_controller.js              ✏️ Enhanced getAgreements() & signAgreement()
│   └── message_controller.js                   ✓ Already populates profiles
├── route/
│   └── applications_router.js                  ✏️ Added POST /sign-agreement
└── model/
    ├── profile.js                              ✓ Has brandName field
    └── agreement_model.js                      ✓ Has proper schema
```

---

## 🔑 Key Code Snippets

### Brand Name Extraction (Frontend)
```javascript
// spreadb_mobile/src/utils/nameExtractor.js
export const extractParticipantName = (participant, currentUserId) => {
  const userData = participant.userId || participant;
  const role = userData.role;
  
  if (role === 'Brand Owner') {
    // ⭐ Priority: brandName from profile
    return userData.brandName || 
           `${userData.firstName} ${userData.lastName}`.trim() || 
           'Brand Owner';
  }
  // ... influencer logic
};
```

### Agreement Data Population (Backend)
```javascript
// spreadb_project/controller/applications_controller.js
export const getAgreements = async (req, res) => {
  const agreements = await Agreement.find({...})
    .populate("campaignId")
    .populate("influencerId")
    .populate("brandOwnerId");

  const enhancedAgreements = await Promise.all(
    agreements.map(async (agreement) => {
      // Get brand profile
      const brandProfile = await BrandOwnerProfile.findOne({ 
        userId: agreement.brandOwnerId._id 
      });
      
      // ⭐ Add brandName to response
      agreement.brandName = brandProfile?.brandName || 
        `${agreement.brandOwnerId.firstName} ${agreement.brandOwnerId.lastName}`;
      
      // ... similar for influencer and campaign
      return agreement;
    })
  );
  
  res.json({ agreements: enhancedAgreements });
};
```

### Agreement Signing (Backend)
```javascript
// spreadb_project/controller/applications_controller.js
export const signAgreement = async (req, res) => {
  const userId = req.user._id;
  const { agreementId } = req.body;

  const agreement = await Agreement.findById(agreementId);
  
  // Verify user is influencer
  if (agreement.influencerId.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  
  // ⭐ Sign agreement
  agreement.influencerSigned = true;
  agreement.signedAt = new Date();
  await agreement.save();
  
  // Notify brand owner
  await Notification.create({
    userId: agreement.brandOwnerId,
    message: `📑 Influencer signed agreement for campaign.`,
    type: "agreement",
  });
  
  res.json({ success: true });
};
```

---

## 🔗 API Endpoints

### Chat
```
GET  /api/messages/conversations          → Get all conversations (with brand names)
GET  /api/messages/conversations/:id      → Get messages
POST /api/messages/send                   → Send message
```

### Agreements
```
GET  /api/actions/agreements              → Get agreements (with enhanced data)
POST /api/actions/sign-agreement          → Sign agreement (app)
PATCH /api/actions/agreement/sign         → Sign agreement (email token)
```

---

## 🧪 Quick Test

### Test Chat
1. Login as Influencer
2. Go to Messages
3. **Expected**: See brand name (e.g., "Awesome Brand Co.") not "John Doe"

### Test Agreement
1. Login as Influencer
2. Go to Agreements
3. Tap an agreement
4. **Expected**: See 11 sections with brand name, campaign, budget
5. Tap "Sign Agreement" → "I Agree"
6. **Expected**: Success message, button changes to "Already Signed"

---

## 🐛 Troubleshooting

### Brand Name Not Showing?
```javascript
// Check if BrandOwnerProfile exists
db.brandownerprofiles.findOne({ userId: ObjectId("user_id") })

// If missing, create it
db.brandownerprofiles.insertOne({
  userId: ObjectId("user_id"),
  email: "brand@test.com",
  brandName: "Your Brand Name", // ⭐ This is what shows in chat
  industry: "Technology"
})
```

### Agreement Not Loading?
```javascript
// Check if agreement exists
db.agreements.find({ influencerId: ObjectId("user_id") })

// If missing, accept an application first
// Brand Owner → Applications → Accept
```

### Signing Fails?
- Check user is logged in (has valid token)
- Check user is the influencer on the agreement
- Check agreement not already signed
- Check backend logs for errors

---

## 📊 Data Flow

### Chat Name Display
```
Backend:
1. getUserConversations() fetches conversations
2. Populates participants.userId with User data
3. Queries BrandOwnerProfile for brandName
4. Merges brandName into userId object

Frontend:
1. Receives conversation with populated data
2. extractParticipantName() reads userData.brandName
3. Falls back to firstName + lastName if needed
4. Displays in UI
```

### Agreement Signing
```
Frontend:
1. User taps "Sign Agreement"
2. Confirmation dialog
3. POST /api/actions/sign-agreement { agreementId }

Backend:
1. Verify user is influencer
2. Check not already signed
3. Update: influencerSigned = true, signedAt = now
4. Create notification for brand owner
5. Return success

Frontend:
1. Show success message
2. Update UI to "Already Signed"
3. Disable button
```

---

## 📋 Agreement Template Sections

1. **PARTIES** - Brand and Influencer details
2. **CAMPAIGN DETAILS** - Campaign name and description
3. **COMPENSATION** - ₹ budget, 7-14 day payment
4. **DELIVERABLES** - Content requirements
5. **CONTENT RIGHTS** - Non-exclusive license
6. **DISCLOSURE** - #ad, #sponsored tags
7. **CONFIDENTIALITY** - NDA terms
8. **TERMINATION** - Exit conditions
9. **LIABILITY** - Damage caps
10. **GOVERNING LAW** - Indian jurisdiction
11. **ACCEPTANCE** - Digital signature

---

## ✅ Success Checklist

- [x] Brand name shows in chat (not personal name)
- [x] Agreement has 11 comprehensive sections
- [x] Agreement auto-populates brand name
- [x] Agreement auto-populates campaign details
- [x] Agreement auto-populates budget
- [x] Digital signature works
- [x] Cannot sign twice
- [x] Brand owner gets notification
- [x] Proper error handling
- [x] Loading states
- [x] Fallback values

---

## 🚀 Next Steps (Future Enhancements)

### Chat
- [ ] Real-time updates (WebSockets)
- [ ] File attachments
- [ ] Push notifications

### Agreements
- [ ] PDF generation
- [ ] Custom templates per campaign
- [ ] Brand owner signature
- [ ] E-signature with OTP

---

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review TEST_CHAT_AND_AGREEMENTS.md
3. Check CHAT_AND_AGREEMENT_IMPLEMENTATION.md for details
4. Check backend logs
5. Verify database has required data

---

**Last Updated**: June 1, 2026
**Version**: 1.0
**Status**: ✅ Production Ready
