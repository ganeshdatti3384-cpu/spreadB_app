import {Promotion} from "../model/promotion_model.js";
import { InfluencerProfile, BrandOwnerProfile } from "../model/profile.js";
import { Notification } from "../model/notification_model.js";
import User from "../model/users.js";
import{CampaignSubmission} from "../model/campaignsubmission_model.js"
import { Application } from "../model/promotion_model.js";
import{Agreement} from "../model/agreement_model.js"
import Wallet from "../model/wallet_model.js";

export const createPromotion = async (req, res) => {
  try {
    const userId = req.user._id; // from token

    // Check Brand Owner profile — auto-create minimal one if missing
    let brandOwner = await BrandOwnerProfile.findOne({ userId });
    if (!brandOwner) {
      // Create a minimal profile so campaign creation doesn't fail
      const user = await User.findById(userId);
      brandOwner = await BrandOwnerProfile.create({
        userId,
        email: user?.email || req.user.email || '',
        brandName: user?.firstName ? `${user.firstName}'s Brand` : 'My Brand',
        promotionsPosted: 0,
      });
      console.log(`Auto-created brand profile for userId: ${userId}`);
    }

    const {
      title,
      description,
      categories,
      locations,
      budget,
      duration,
      applicationDeadline,
      startDate,
      endDate,
      requiredSticks,
      openings,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    if (!openings || openings <= 0) {
      return res.status(400).json({
        message: "Openings must be greater than 0",
      });
    }

    const budgetPerOpening = Number(budget) || 0;
    if (budgetPerOpening < 499) {
      return res.status(400).json({
        message: "Budget must be at least ₹499",
      });
    }

    const numOpenings = Number(openings);
    const totalCost = budgetPerOpening * numOpenings;

    // Verify wallet balance
    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.availableBalance < totalCost) {
      return res.status(400).json({ 
        message: "Insufficient wallet balance. Please add funds before creating a campaign." 
      });
    }

    const promotion = await Promotion.create({
      brandOwnerId: userId,
      title,
      description,
      categories: categories || [],
      locations: locations || [],
      budget: budgetPerOpening,
      duration,
      applicationDeadline,
      startDate,
      endDate,
      requiredSticks: Number(requiredSticks) || 0,
      openings: numOpenings,
      filledPositions: 0,
    });

    // Hold the required funds
    if (totalCost > 0) {
      await wallet.holdMoney(totalCost, promotion._id, `Campaign creation hold for "${title}"`);
    }

    // Increment promotions count if profile exists
    if (brandOwner) {
      brandOwner.promotionsPosted = (brandOwner.promotionsPosted || 0) + 1;
      await brandOwner.save();
    }

    // Notify influencers in matching locations
    if (locations && locations.length > 0) {
      const influencers = await InfluencerProfile.find({
        locations: { $in: locations },
      }).select("userId");

      if (influencers.length > 0) {
        const notifications = influencers.map((inf) => ({
          userId: inf.userId,
          title: "New Promotion",
          message: `New promotion "${title}" available in your location`,
          type: "promotion",
          entityId: promotion._id,
          entityType: "Promotion",
        }));
        await Notification.insertMany(notifications);
      }
    }

    return res.status(201).json({
      message: "Promotion created successfully",
      promotion,
    });
  } catch (err) {
    console.error("Error creating promotion:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};


export const browsePromotions = async (req, res) => {
  try {
    // Fetch ALL active promotions — no profile required
    const promotions = await Promotion.find({
      status: "active",
      applicationStatus: "open",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Promotions fetched successfully",
      promotions,
      count: promotions.length,
    });
  } catch (err) {
    console.error("Error fetching promotions:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const searchPromotions = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await InfluencerProfile.findOne({ userId });

    const {
      search,
      location,
      category,
      minBudget,
      maxBudget,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    let query = {
      status: status || "active",
      applicationStatus: "open",
    };

    // 🔍 Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 📍 Location
    if (location) {
      query.locations = {
        $in: [new RegExp(`^${location}$`, "i")],
      };
    } else if (profile?.locations?.length) {
      query.locations = {
        $in: profile.locations.map(
          (loc) => new RegExp(`^${loc}$`, "i")
        ),
      };
    }

    // 🏷️ Category
    if (category) {
      query.categories = {
        $in: [new RegExp(`^${category}$`, "i")],
      };
    }

    // 💰 Budget
    if (minBudget || maxBudget) {
      query.budget = {};
      if (minBudget) query.budget.$gte = Number(minBudget);
      if (maxBudget) query.budget.$lte = Number(maxBudget);
    }

    const skip = (page - 1) * limit;

    const [promotions, total] = await Promise.all([
      Promotion.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Promotion.countDocuments(query),
    ]);

    return res.status(200).json({
      message: "Promotions fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      promotions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
export const getPromotionFilters = async (req, res) => {
  try {
    const locations = await Promotion.distinct("locations");
    const categories = await Promotion.distinct("categories");
    const budgetRange = await Promotion.aggregate([
      {
        $group: {
          _id: null,
          minBudget: { $min: "$budget" },
          maxBudget: { $max: "$budget" },
        },
      },
    ]);

    return res.status(200).json({
      locations,
      categories,
      budget: budgetRange[0] || { minBudget: 0, maxBudget: 0 },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get single promotion by ID
export const getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    // Get brand profile separately
    let brandProfile = null;
    if (promotion.brandOwnerId) {
      brandProfile = await BrandOwnerProfile.findOne({ 
        userId: promotion.brandOwnerId 
      }).select('brandName companyName');
    }

    return res.status(200).json({
      message: "Promotion fetched successfully",
      promotion: {
        ...promotion.toObject(),
        brandProfile
      }
    });
  } catch (err) {
    console.error("Error fetching promotion:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

//manage work
//my promotions
export const getMyPromotions = async (req, res) => {
  try {
    const userId = req.user._id;

    const promotions = await Promotion.find({ brandOwnerId: userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Promotions fetched successfully",
      promotions,
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

//proposals received
export const getProposalsReceived = async (req, res) => {
  try {
    const brandOwnerId = req.user._id;
    console.log('=== Get Proposals Received ===');
    console.log('Brand Owner ID:', brandOwnerId);

    // Step 1: get my promotions
    const promotions = await Promotion.find(
      { brandOwnerId },
      "_id title"
    );

    const promotionIds = promotions.map(p => p._id);
    console.log('Found promotions:', promotionIds.length);

    // Step 2: get applications for those promotions
    const applications = await Application.find({
      campaignId: { $in: promotionIds },
    })
      .populate("campaignId", "title budget")
      .populate("influencerId", "firstName lastName email")
      .sort({ boostSticks: -1, createdAt: -1 });

    console.log('Found applications:', applications.length);

    // Step 3: Enhance with influencer profile data
    const enhancedApplications = await Promise.all(
      applications.map(async (app) => {
        const appObj = app.toObject();
        
        console.log('Processing application:', {
          id: appObj._id,
          influencerId: appObj.influencerId?._id,
          influencerFirstName: appObj.influencerId?.firstName,
          influencerLastName: appObj.influencerId?.lastName
        });
        
        // Rename for frontend compatibility
        appObj.promotion = appObj.campaignId;
        
        // Get influencer profile
        if (appObj.influencerId) {
          const influencerProfile = await InfluencerProfile.findOne({ 
            userId: appObj.influencerId._id 
          }).select('firstName lastName userName profilePhoto socialMedia');
          
          console.log('Influencer profile found:', influencerProfile ? {
            firstName: influencerProfile.firstName,
            lastName: influencerProfile.lastName,
            userName: influencerProfile.userName
          } : 'NOT FOUND');
          
          if (influencerProfile) {
            // Merge profile data with user data
            appObj.influencer = {
              _id: appObj.influencerId._id,
              firstName: influencerProfile.firstName || appObj.influencerId.firstName,
              lastName: influencerProfile.lastName || appObj.influencerId.lastName,
              userName: influencerProfile.userName,
              email: appObj.influencerId.email,
              profilePhoto: influencerProfile.profilePhoto,
              // Calculate total followers from social media
              followersCount: (
                (influencerProfile.socialMedia?.instagram?.followers || 0) +
                (influencerProfile.socialMedia?.youtube?.followers || 0) +
                (influencerProfile.socialMedia?.twitter?.followers || 0)
              ),
              username: influencerProfile.userName
            };
          } else {
            // Fallback to user data
            console.log('Using fallback user data');
            appObj.influencer = {
              _id: appObj.influencerId._id,
              firstName: appObj.influencerId.firstName,
              lastName: appObj.influencerId.lastName,
              email: appObj.influencerId.email,
              followersCount: 0
            };
          }
          
          console.log('Final influencer data:', {
            firstName: appObj.influencer.firstName,
            lastName: appObj.influencer.lastName
          });
        }
        
        return appObj;
      })
    );

    console.log('Returning', enhancedApplications.length, 'enhanced applications');

    res.status(200).json({ 
      success: true,
      proposals: enhancedApplications,
      applications: enhancedApplications // Keep both for compatibility
    });
  } catch (err) {
    console.error('Get proposals error:', err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

//active collaborations
export const getActiveCollaborations = async (req, res) => {
  try {
    const brandOwnerId = req.user._id;

    const collaborations = await Agreement.find({
      brandOwnerId,
      influencerSigned: true,
    })
      .populate("campaignId", "title")
      .populate("influencerId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ collaborations });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

//Completed Campaigns
export const getCompletedCampaigns = async (req, res) => {
  try {
    const brandOwnerId = req.user._id;

    const completed = await CampaignSubmission.find({
      brandOwnerId,
      status: "approved",
    })
      .populate("campaignId", "title")
      // .populate("influencerId", "name")
      .select("campaignId createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({ completed });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
//extra apis


// export const browsePromotions = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const profile = await InfluencerProfile.findOne({ userId });
//     if (!profile)
//       return res.status(404).json({ message: "Influencer profile not found" });

//     const interests = profile.category || [];
//     const locations = profile.locations || [];

//     // Base query
//     let query = {
//       applicationStatus: "open",
//       status: "active",
//     };

//     // Build dynamic OR conditions only if influencer has categories/locations
//     const orConditions = [];

//     if (interests.length > 0) {
//       orConditions.push({ categories: { $in: interests } });
//     }

//     if (locations.length > 0) {
//       orConditions.push({ locations: { $in: locations } });
//     }

//     // If influencer has any matching fields → add $or
//     if (orConditions.length > 0) {
//       query.$or = orConditions;
//     }

//     const promotions = await Promotion.find(query).sort({ createdAt: -1 });

//     return res.status(200).json({
//       message: "Promotions fetched successfully",
//       promotions,
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };



// Update promotion
export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    // Handle image uploads for updates
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/api/uploads/promotions/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));
      
      // Add new images to existing ones
      updateData.images = [...(promotion.images || []), ...newImages];
    }

    // Update only allowed fields
    const allowedUpdates = [
      'title', 'description', 'about', 'website', 'instagram', 'facebook', 'otherLinks',
      'categories', 'locations', 'skills', 'budget', 'budgetType', 'duration', 
      'requiredSticks', 'images', 'status', 'applicationStatus'
    ];
    
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        promotion[field] = updateData[field];
      }
    });

    await promotion.save();

    return res.status(200).json({
      message: "Promotion updated successfully",
      promotion,
    });
  } catch (err) {
    console.error("Error updating promotion:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete promotion image
export const deletePromotionImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    // Find the image to remove
    const imageIndex = promotion.images.findIndex(img => 
      img._id.toString() === imageId || img.filename === imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({ message: "Image not found" });
    }

    const imageToRemove = promotion.images[imageIndex];
    
    // Remove image from array
    promotion.images.splice(imageIndex, 1);
    await promotion.save();

    // Delete physical file
    try {
      const filePath = `uploads/promotions/${imageToRemove.filename}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting image file:', fileError);
    }

    return res.status(200).json({
      message: "Image deleted successfully",
      promotion,
    });
  } catch (err) {
    console.error("Error deleting promotion image:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete promotion
export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    // Delete associated image files
    if (promotion.images && promotion.images.length > 0) {
      promotion.images.forEach(image => {
        try {
          const filePath = `uploads/promotions/${image.filename}`;
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileError) {
          console.error('Error deleting image file:', fileError);
        }
      });
    }

    await Promotion.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Promotion deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting promotion:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
// export const getMyPromotions = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const promotions = await Promotion.find({ brandOwnerId: userId })
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       message: "Promotions fetched successfully",
//       promotions,
//     });
//   } catch (err) {
//     console.error("Error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// export const browsePromotions = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const profile = await InfluencerProfile.findOne({ userId });
//     if (!profile)
//       return res.status(404).json({ message: "Influencer profile not found" });

//     const interests = profile.category || [];
//     const locations = profile.locations || [];

//     // Base query
//     let query = {
//       applicationStatus: "open",
//       status: "active",
//     };

//     // Build dynamic OR conditions only if influencer has categories/locations
//     const orConditions = [];

//     if (interests.length > 0) {
//       orConditions.push({ categories: { $in: interests } });
//     }

//     if (locations.length > 0) {
//       orConditions.push({ locations: { $in: locations } });
//     }

//     // If influencer has any matching fields → add $or
//     if (orConditions.length > 0) {
//       query.$or = orConditions;
//     }

//     const promotions = await Promotion.find(query).sort({ createdAt: -1 });

//     return res.status(200).json({
//       message: "Promotions fetched successfully",
//       promotions,
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };


export const getApplicantsForCampaign = async (req, res) => {
  try {
    const userId = req.user._id;
    const { campaignId } = req.params;

    console.log('=== Get Applicants For Campaign ===');
    console.log('Campaign ID:', campaignId);
    console.log('Brand Owner ID:', userId);

    // Validate campaign exists and belongs to brand owner
    const campaign = await Promotion.findOne({
      _id: campaignId,
      brandOwnerId: userId,
    });

    if (!campaign) {
      return res.status(404).json({
        message: "Campaign not found or unauthorized access",
      });
    }

    // Fetch applications + influencer data
    const applicants = await Application.find({ campaignId })
      .populate("influencerId", "firstName lastName email role")
      .sort({ boostSticks: -1, createdAt: -1 });

    console.log('Found applicants:', applicants.length);

    if (applicants.length === 0) {
      return res.status(200).json({
        message: "No applicants yet",
        applicants: [],
      });
    }

    // Fetch Influencer profile (experience, reach, category)
    const response = [];

    for (const app of applicants) {
      const profile = await InfluencerProfile.findOne({
        userId: app.influencerId._id,
      });

      const firstName = profile?.firstName || app.influencerId.firstName || '';
      const lastName = profile?.lastName || app.influencerId.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Influencer';
      const userName = profile?.userName || app.influencerId.email?.split('@')[0] || '';

      console.log('Processing applicant:', {
        id: app.influencerId._id,
        firstName,
        lastName,
        fullName,
        userName
      });

      response.push({
        applicationId: app._id,
        status: app.status,
        appliedOn: app.createdAt,
        notes: app.notes || null,
        boostSticks: app.boostSticks || 0,

        // Add these fields for compatibility with frontend
        firstName: firstName,
        lastName: lastName,
        name: fullName,
        email: app.influencerId.email,
        userName: userName,

        influencer: {
          id: app.influencerId._id,
          firstName: firstName,
          lastName: lastName,
          name: fullName,
          userName: userName,
          email: app.influencerId.email,
          experience: profile?.experience || "Not Provided",
          reach: profile?.followers || "Not Provided",
          category: profile?.category || [],
          location: profile?.location || [],
          followersCount: (
            (profile?.socialMedia?.instagram?.followers || 0) +
            (profile?.socialMedia?.youtube?.followers || 0) +
            (profile?.socialMedia?.twitter?.followers || 0)
          ),
        },
      });
    }

    console.log('Returning', response.length, 'applicants');

    return res.status(200).json({
      success: true,
      message: "Applicants fetched successfully",
      applicants: response,
    });
  } catch (error) {
    console.error('Get applicants error:', error);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

