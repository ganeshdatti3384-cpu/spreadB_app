import {Promotion,Application} from "../model/promotion_model.js";
import { InfluencerProfile, BrandOwnerProfile } from "../model/profile.js";
import { Notification } from "../model/notification_model.js";
import User from "../model/users.js";

export const applyForPromotion = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;   // ← fix: support both token shapes
    const { campaignId, proposal, estimatedDelivery, boostSticks } = req.body;

    let influencer = await InfluencerProfile.findOne({ userId });
    if (!influencer) {
      // Auto-create profile if it doesn't exist
      const user = await User.findById(userId);
      if (!user || user.role !== 'Influencer') {
        return res.status(404).json({ message: "Influencer profile not found. Please complete your profile first." });
      }
      influencer = await InfluencerProfile.create({
        userId,
        email: user.email,
        firstName: user.firstName || 'User',
        lastName: user.lastName || '',
        userName: user.email.split('@')[0],
        sticks: { 
          free: 100, 
          purchased: 0, 
          total: 100, 
          spent: 0, 
          transactions: [{ type: "earned", amount: 100, description: "Welcome bonus — 100 free sticks", date: new Date() }] 
        }
      });
    }

    const campaign = await Promotion.findById(campaignId);
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });

    // prevent duplicate
    const alreadyApplied = await Application.findOne({
      influencerId: userId,
      campaignId,
      status: { $ne: "withdrawn" },
    });

    if (alreadyApplied)
      return res.status(400).json({ message: "Already applied" });

    // Calculate total sticks: required sticks + boost sticks
    const requiredSticks = campaign.requiredSticks || 0;
    const additionalBoostSticks = boostSticks || 0;
    const totalSticksRequired = requiredSticks + additionalBoostSticks;

    // Ensure sticks object exists (backfill for old profiles)
    if (!influencer.sticks || influencer.sticks.total === undefined || (influencer.sticks.total === 0 && influencer.sticks.free === 0 && influencer.sticks.purchased === 0)) {
      influencer.sticks = { 
        free: 100, 
        purchased: 0, 
        total: 100, 
        spent: 0, 
        transactions: [{ type: "earned", amount: 100, description: "Welcome bonus — 100 free sticks", date: new Date() }] 
      };
      await influencer.save();
    }

    // Check if influencer has enough sticks
    const availableSticks = influencer.sticks.total ?? 0;
    if (availableSticks < totalSticksRequired) {
      return res.status(400).json({ 
        message: `Not enough sticks. You have ${availableSticks} sticks but need ${totalSticksRequired}.`,
        required: totalSticksRequired,
        available: availableSticks
      });
    }

    // Deduct sticks — prioritise free sticks first
    let remaining = totalSticksRequired;
    let freeSticksSpent = 0;
    let purchasedSticksSpent = 0;

    if (influencer.sticks.free >= remaining) {
      influencer.sticks.free -= remaining;
      freeSticksSpent = remaining;
    } else {
      freeSticksSpent = influencer.sticks.free;
      remaining -= influencer.sticks.free;
      influencer.sticks.free = 0;
      purchasedSticksSpent = remaining;
      influencer.sticks.purchased = Math.max(0, influencer.sticks.purchased - remaining);
    }
    influencer.sticks.total -= totalSticksRequired;
    influencer.sticks.spent = (influencer.sticks.spent || 0) + totalSticksRequired;
    
    // Add transaction record
    influencer.sticks.transactions.push({
      type: "spent",
      amount: totalSticksRequired,
      description: `Applied to promotion: ${campaign.title}${additionalBoostSticks > 0 ? ` (Boosted with ${additionalBoostSticks} sticks)` : ''}`,
      freeSticksSpent,
      purchasedSticksSpent,
      date: new Date(),
    });

    // Also update old system for backward compatibility
    if (influencer.reports) {
      influencer.reports.availableSticks = Math.max(0, (influencer.reports.availableSticks || 0) - totalSticksRequired);
      influencer.reports.sticksHistory.push({ action: "Spent on application", amount: totalSticksRequired, date: new Date() });
      influencer.reports.promotionsApplied.push(campaignId);
    }

    await influencer.save();

    const application = await Application.create({
      campaignId,
      influencerId: userId,
      sticksSpent: totalSticksRequired,
      boostSticks: additionalBoostSticks,
      proposal: proposal || '',
      estimatedDelivery: estimatedDelivery || null
    });

    campaign.applicationsCount = (campaign.applicationsCount || 0) + 1;
    await campaign.save();

    await Notification.create({
      userId: campaign.brandOwnerId,
      title: "New Application",
      message: `An influencer applied to your promotion "${campaign.title}"${additionalBoostSticks > 0 ? ` with ${additionalBoostSticks} boost sticks` : ''}`,
      type: "application",
      entityId: application._id,
      entityType: "Application",
    });

    return res.status(201).json({ 
      message: "Application submitted", 
      application,
      sticksSpent: totalSticksRequired,
      boostSticks: additionalBoostSticks,
      remainingSticks: influencer.sticks.total
    });
  } catch (err) {
    console.error("Error applying for promotion:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const withdrawApplication = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { applicationId } = req.body;

    const application = await Application.findById(applicationId);
    if (!application)
      return res.status(404).json({ message: "Application not found" });

    if (application.influencerId.toString() !== userId.toString())
      return res.status(403).json({ message: "Unauthorized" });

    if (application.status !== "pending")
      return res.status(400).json({ message: "Cannot withdraw now" });

    const influencer = await InfluencerProfile.findOne({ userId });

    // ✅ Refund sticks to new system
    influencer.sticks.total += application.sticksSpent;
    influencer.sticks.spent -= application.sticksSpent;
    
    // Add refund transaction
    influencer.sticks.transactions.push({
      type: "earned",
      amount: application.sticksSpent,
      description: "Refund: Application withdrawn",
      date: new Date(),
    });

    // Also update old system for backward compatibility
    influencer.reports.availableSticks += application.sticksSpent;
    influencer.reports.sticksHistory.push({
      action: "Refund: Withdraw Application",
      amount: application.sticksSpent,
      date: new Date(),
    });

    application.status = "withdrawn";

    await influencer.save();
    await application.save();
    
    const campaign = await Promotion.findById(application.campaignId);
    await Notification.create({
      userId: campaign.brandOwnerId,
      title: "Application Withdrawn",
      message: `An influencer withdrew their application`,
      type: "application",
      entityId: application._id,
      entityType: "Application",
    });

    return res.status(200).json({ 
      message: "Application withdrawn",
      sticksRefunded: application.sticksSpent,
      remainingSticks: influencer.sticks.total
    });
  } catch (err) {
    console.error("Error withdrawing application:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
// my applications
export const getMyApplications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const applications = await Application.find({ influencerId: userId })
      .populate({
        path: "campaignId",
        populate: {
          path: "brandOwnerId",
          select: "firstName lastName email"
        }
      })
      .sort({ createdAt: -1 });

    // Enhance applications with brand owner profile data
    const enhancedApplications = await Promise.all(
      applications.map(async (app) => {
        const appObj = app.toObject();
        
        // Rename campaignId to promotion for frontend compatibility
        if (appObj.campaignId) {
          appObj.promotion = appObj.campaignId;
          
          // Get brand owner profile for brand name
          if (appObj.promotion.brandOwnerId) {
            const brandProfile = await BrandOwnerProfile.findOne({ 
              userId: appObj.promotion.brandOwnerId._id 
            }).select('brandName');
            
            if (brandProfile) {
              appObj.promotion.brandName = brandProfile.brandName;
              appObj.promotion.brandOwnerName = brandProfile.brandName;
            } else {
              // Fallback to user's name
              const firstName = appObj.promotion.brandOwnerId.firstName?.trim() || '';
              const lastName = appObj.promotion.brandOwnerId.lastName?.trim() || '';
              const fullName = `${firstName} ${lastName}`.trim() || 'Brand Owner';
              appObj.promotion.brandOwnerName = fullName;
              appObj.promotion.brandName = fullName;
            }
            
            // Add email for contact info
            appObj.promotion.brandOwnerEmail = appObj.promotion.brandOwnerId.email;
            
            // Keep the brandOwnerId for chat functionality
            appObj.promotion.brandOwner = appObj.promotion.brandOwnerId._id;
          }
        }
        
        return appObj;
      })
    );

    res.status(200).json({ 
      success: true,
      applications: enhancedApplications 
    });
  } catch (err) {
    console.error('Get my applications error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

 
//  Stick Top-up / Refill

 
export const topUpSticks = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { amount } = req.body;
 
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
 
    const influencer = await InfluencerProfile.findOne({ userId });
    if (!influencer)
      return res.status(404).json({ message: "Influencer profile not found" });
 
    influencer.reports.availableSticks += amount;
 
    influencer.reports.sticksHistory.push({
      action: "Top-up",
      amount: amount,
      date: new Date(),
    });
 
    await influencer.save();
 
    return res.status(200).json({
      message: "Sticks added successfully",
      availableSticks: influencer.reports.availableSticks,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
};
 

//  Stick Usage & History

 
export const getStickHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
 
    const influencer = await InfluencerProfile.findOne({ userId });
    if (!influencer)
      return res.status(404).json({ message: "Influencer profile not found" });
 
    // ✅ Return new sticks system transactions
    return res.status(200).json({
      availableSticks: influencer.sticks?.total || 0,
      freeSticks: influencer.sticks?.free || 0,
      purchasedSticks: influencer.sticks?.purchased || 0,
      spentSticks: influencer.sticks?.spent || 0,
      transactions: influencer.sticks?.transactions?.slice().reverse() || [], // newest first
      // Also include old system for backward compatibility
      legacy: {
        availableSticks: influencer.reports?.availableSticks || 0,
        history: influencer.reports?.sticksHistory?.slice().reverse() || []
      }
    });
  } catch (err) {
    console.error("Error getting stick history:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
 

// Stick Balance Only

 
export const getStickBalance = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
 
    const influencer = await InfluencerProfile.findOne({ userId });
    if (!influencer)
      return res.status(404).json({ message: "Influencer profile not found" });
 
    // ✅ Return new sticks system data
    return res.status(200).json({
      availableSticks: influencer.sticks?.total || 0,
      freeSticks: influencer.sticks?.free || 0,
      purchasedSticks: influencer.sticks?.purchased || 0,
      spentSticks: influencer.sticks?.spent || 0,
      // Also include old system for backward compatibility
      legacy: {
        availableSticks: influencer.reports?.availableSticks || 0
      }
    });
  } catch (err) {
    console.error("Error getting stick balance:", err);
    return res.status(500).json({ message: "Server error" });
  }
};