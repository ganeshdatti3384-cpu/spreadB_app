import { Application } from "../model/promotion_model.js";
import { Agreement } from "../model/agreement_model.js";
import { Notification } from "../model/notification_model.js";
import User from "../model/users.js";
import { InfluencerProfile, BrandOwnerProfile } from "../model/profile.js";
import { CampaignSubmission } from "../model/campaignsubmission_model.js";
import {Promotion} from "../model/promotion_model.js";
import { feedbackEmailTemplate } from "../utils/submissionfb_Template.js";
import { sendEmail } from "../utils/sendEmail.js";
import Wallet from "../model/wallet_model.js";
import { closeConversationOnCompletion } from "../utils/conversationHelper.js";
//influencer
export const submitCampaignWork = async (req, res) => {
  try {
    const influencerId = req.user._id;
    const { campaignId, applicationId, description, proofUrls } = req.body;

    console.log('📝 Submission request:', {
      influencerId,
      campaignId,
      applicationId,
      description: description?.substring(0, 50),
      proofUrls,
      filesCount: req.files?.length || 0
    });

    // Validate required fields
    if (!campaignId) {
      return res.status(400).json({ message: "Campaign ID is required" });
    }

    if (!applicationId) {
      return res.status(400).json({ message: "Application ID is required" });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }

    const promotion = await Promotion.findById(campaignId);
    if (!promotion) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Parse proofUrls safely
    let parsedProofUrls = [];
    try {
      parsedProofUrls = proofUrls ? JSON.parse(proofUrls) : [];
    } catch (parseErr) {
      console.error('Error parsing proofUrls:', parseErr);
      // If it's already an array, use it directly
      parsedProofUrls = Array.isArray(proofUrls) ? proofUrls : [];
    }

    const mediaProofs = (req.files || []).map(file => ({
      url: file.location || `uploads/submissionProofs/${file.filename}`,
      filename: file.filename || file.key,
      mimetype: file.mimetype,
      size: file.size,
    }));

    console.log('📤 Creating submission with:', {
      campaignId,
      applicationId,
      influencerId,
      brandOwnerId: promotion.brandOwnerId,
      proofUrlsCount: parsedProofUrls.length,
      mediaProofsCount: mediaProofs.length
    });

    const submission = await CampaignSubmission.create({
      campaignId,
      applicationId,
      influencerId,
      brandOwnerId: promotion.brandOwnerId,
      description: description.trim(),
      proofUrls: parsedProofUrls,
      mediaProofs,
      status: "submitted"
    });

    console.log('✅ Submission created:', submission._id);

    await Notification.create({
      userId: promotion.brandOwnerId,
      title: "New Submission",
      message: `📩 Influencer submitted campaign work for "${promotion.title}"`,
      type: "submission",
      entityId: submission._id,
      entityType: "CampaignSubmission"
    });

    res.status(201).json({ 
      message: "Work submitted successfully", 
      submission 
    });
  } catch (err) {
    console.error('❌ Submission error:', err);
    res.status(500).json({ 
      message: err.message || "Failed to submit work",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

//brandowner
export const reviewSubmission = async (req, res) => {
  try {
    const brandUserId = req.user._id;
    const { submissionId, status, feedback, rating } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const submission = await CampaignSubmission.findById(submissionId);
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });

    // Ownership check
    if (submission.brandOwnerId.toString() !== brandUserId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    submission.status = status;
    submission.brandFeedback = {
      text: feedback || "",
      rating: rating || 0,
      givenAt: new Date(),
    };
    submission.reviewedAt = new Date();
    await submission.save();

    // 🆕 UPDATE APPLICATION STATUS TO COMPLETED when approved
    if (status === "approved") {
      try {
        const application = await Application.findById(submission.applicationId);
        if (application) {
          application.status = "completed";
          await application.save();
          console.log(`✅ Application ${submission.applicationId} marked as completed`);
        }
      } catch (appErr) {
        console.error("Failed to update application status:", appErr.message);
        // Don't fail the whole request if this fails
      }
    }

    const influencer = await InfluencerProfile.findOne({
      userId: submission.influencerId,
    });

    const promotion = await Promotion.findById(submission.campaignId);

    // Update influencer rating ONLY if approved
    if (status === "approved" && rating) {
      const totalRating =
        influencer.rating * (influencer.ratingCount || 0) + rating;

      influencer.ratingCount = (influencer.ratingCount || 0) + 1;
      influencer.rating = totalRating / influencer.ratingCount;

      influencer.reports.promotionsAccepted.push(
        submission.campaignId.toString()
      );

      await influencer.save();

      // WALLET TRANSFER: Transfer money from brand owner to influencer
      try {
        const brandWallet = await Wallet.findOne({ userId: brandUserId });
        const influencerWallet = await Wallet.findOne({ userId: submission.influencerId });

        if (brandWallet && influencerWallet && promotion.budget) {
          // Deduct money from brand owner's held balance
          await brandWallet.deductMoney(
            promotion.budget,
            submission.campaignId,
            `Payment for campaign: ${promotion.title}`
          );

          // Add money to influencer's wallet
          await influencerWallet.receiveMoney(
            promotion.budget,
            submission.campaignId,
            brandUserId,
            `Payment received for campaign: ${promotion.title}`
          );

          console.log(`✅ Transferred ₹${promotion.budget} from brand owner to influencer ${submission.influencerId}`);
        }
      } catch (walletErr) {
        console.error("Wallet transfer failed:", walletErr.message);
        // Don't fail the approval if wallet transfer fails
      }
    }

    // If rejected, release the held money back to brand owner
    if (status === "rejected") {
      try {
        const brandWallet = await Wallet.findOne({ userId: brandUserId });
        
        if (brandWallet && promotion.budget) {
          await brandWallet.releaseMoney(
            promotion.budget,
            submission.campaignId,
            `Submission rejected for campaign: ${promotion.title}`
          );

          console.log(`✅ Released ₹${promotion.budget} back to brand owner`);
        }
      } catch (walletErr) {
        console.error("Wallet release failed:", walletErr.message);
      }
    }

    // Notification (in-app)
    await Notification.create({
      userId: submission.influencerId,
      type: "feedback",
      message:
        status === "approved"
          ? `⭐ Your submission for "${promotion.title}" was approved`
          : `❌ Your submission for "${promotion.title}" was rejected`,
    });

    // 🆕 CLOSE CONVERSATION when work is approved/completed
    if (status === "approved") {
      try {
        await closeConversationOnCompletion(
          brandUserId, // Brand owner user ID
          submission.influencerId // Influencer user ID
        );
        console.log('✅ Conversation closed after campaign completion');
      } catch (convError) {
        console.error('⚠️ Failed to close conversation, but submission was approved:', convError);
        // Don't fail the whole request if conversation closing fails
      }
    }

    // Email (short notification only)
    try {
      await sendEmail(
        influencer.email,
        "Campaign feedback received",
        feedbackEmailTemplate({
          influencerName: influencer.firstName,
          campaignTitle: promotion.title,
          rating: rating || "N/A",
        })
      );
    } catch (emailErr) {
      console.error("Email failed:", emailErr.message);
    }

    return res.status(200).json({
      message: "Submission reviewed successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

// Influencer – “My Submissions + Feedback” page
export const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user._id;

    const submissions = await CampaignSubmission.find({
      influencerId: userId,
    })
      .populate("campaignId")
      .sort({ createdAt: -1 });

    res.status(200).json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Brand Owner – “Submissions for a Campaign”
export const getCampaignSubmissions = async (req, res) => {
  try {
    const brandUserId = req.user._id;
    const { campaignId } = req.params;

    console.log('📋 Fetching submissions for campaign:', campaignId);
    console.log('👤 Brand owner ID:', brandUserId);

    const promotion = await Promotion.findById(campaignId);
    if (!promotion) {
      console.log('❌ Campaign not found');
      return res.status(404).json({ message: "Campaign not found" });
    }

    if (promotion.brandOwnerId.toString() !== brandUserId.toString()) {
      console.log('❌ Unauthorized access attempt');
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Populate influencerId with User data (email, role)
    const submissions = await CampaignSubmission.find({ campaignId })
      .populate("influencerId", "email role")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${submissions.length} submissions`);

    // Enrich with influencer profile data
    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission) => {
        const submissionObj = submission.toObject();
        
        // Get influencer profile for additional details
        if (submission.influencerId) {
          const influencerProfile = await InfluencerProfile.findOne({
            userId: submission.influencerId._id
          }).select('firstName lastName userName profilePhoto');
          
          if (influencerProfile) {
            submissionObj.influencerId = {
              ...submissionObj.influencerId,
              firstName: influencerProfile.firstName,
              lastName: influencerProfile.lastName,
              userName: influencerProfile.userName,
              profilePhoto: influencerProfile.profilePhoto
            };
          }
        }
        
        return submissionObj;
      })
    );

    res.status(200).json({ submissions: enrichedSubmissions });
  } catch (err) {
    console.error('❌ Error fetching submissions:', err);
    res.status(500).json({ message: err.message });
  }
};

// Brand Owner – "All Pending Submissions"
export const getBrandPendingSubmissions = async (req, res) => {
  try {
    const brandUserId = req.user._id;

    const submissions = await CampaignSubmission.find({
      brandOwnerId: brandUserId,
      status: "pending"
    })
      .populate("campaignId", "title")
      .populate("influencerId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
