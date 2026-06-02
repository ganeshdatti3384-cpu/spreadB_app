import { InfluencerProfile, BrandOwnerProfile } from "../model/profile.js";
import { Notification } from "../model/notification_model.js";
import User from "../model/users.js";
// =========================================
// Create Influencer Profile
// =========================================

const createInfluencer = async (req, res) => {
  try {
    const userId = req.user._id;
    const email = req.user.email;

    // Handle category — can come as JSON string OR as array from multipart form (category[])
    let category = [];
    if (req.body.category) {
      if (typeof req.body.category === 'string') {
        try { category = JSON.parse(req.body.category); } catch { category = [req.body.category]; }
      } else {
        category = Array.isArray(req.body.category) ? req.body.category : [req.body.category];
      }
    }

    // Handle locations — same dual-format handling
    let locations = [];
    if (req.body.locations) {
      if (typeof req.body.locations === 'string') {
        try { locations = JSON.parse(req.body.locations); } catch { locations = [req.body.locations]; }
      } else {
        locations = Array.isArray(req.body.locations) ? req.body.locations : [req.body.locations];
      }
    }

    // Handle portfolioLinks
    let portfolioLinks = [];
    if (req.body.portfolioLinks) {
      if (typeof req.body.portfolioLinks === 'string') {
        try { portfolioLinks = JSON.parse(req.body.portfolioLinks); } catch { portfolioLinks = [req.body.portfolioLinks]; }
      } else {
        portfolioLinks = Array.isArray(req.body.portfolioLinks) ? req.body.portfolioLinks : [req.body.portfolioLinks];
      }
    }

    // Handle socialMedia — comes as JSON string from mobile
    let parsedSocialMedia = {};
    if (req.body.socialMedia) {
      try {
        parsedSocialMedia = typeof req.body.socialMedia === 'string'
          ? JSON.parse(req.body.socialMedia)
          : req.body.socialMedia;
      } catch (e) {
        console.error('socialMedia parse error:', e.message);
      }
    }

    let profilePhoto = "";
    if (req.file) {
      profilePhoto = `uploads/profilePhoto/${req.file.filename}`;
    }

    const socialMediaData = {
      instagram: {
        link: parsedSocialMedia?.instagram?.url || parsedSocialMedia?.instagram?.link || "",
        followers: parsedSocialMedia?.instagram?.followers || 0,
        views: parsedSocialMedia?.instagram?.views || 0,
      },
      youtube: {
        link: parsedSocialMedia?.youtube?.url || parsedSocialMedia?.youtube?.link || "",
        followers: parsedSocialMedia?.youtube?.subscribers || parsedSocialMedia?.youtube?.followers || 0,
        views: parsedSocialMedia?.youtube?.views || 0,
      },
      twitter: {
        link: parsedSocialMedia?.twitter?.url || parsedSocialMedia?.twitter?.link || "",
        followers: parsedSocialMedia?.twitter?.followers || 0,
        views: parsedSocialMedia?.twitter?.views || 0,
      },
    };

    // Initialize sticks with 100 free sticks
    const initialSticks = {
      free: 100,
      purchased: 0,
      total: 100,
      spent: 0,
      transactions: [{
        type: 'earned',
        amount: 100,
        description: 'Welcome bonus - Free sticks for new influencer',
        date: new Date()
      }]
    };

    const profile = await InfluencerProfile.create({
      userId,
      email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      userName: req.body.userName,
      phoneNumber: req.body.phoneNumber || req.body.phone,
      about: req.body.about,
      category,
      locations,
      portfolioLinks,
      socialMedia: socialMediaData,
      profilePhoto,
      sticks: initialSticks,
    });

    await Notification.create({
      userId,
      message: "🎉 Your influencer profile is live! You've received 100 free sticks! Start applying to promotions.",
      type: "system",
    });

    res.status(201).json({
      message: "Influencer profile created successfully! You've received 100 free sticks!",
      profile,
      sticksGranted: 100
    });
  } catch (error) {
    console.error("createInfluencer error:", error);
    res.status(500).json({ message: error.message });
  }
};


// Create Brand Owner Profile
const createBrandOwner = async (req, res) => {
  try {
    const userId = req.user._id;
    const email = req.user.email;

    // Check if profile already exists — prevent duplicate key error
    const existing = await BrandOwnerProfile.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: "Brand Owner profile already exists. Use update instead." });
    }

    // Handle locations — can come as JSON string OR as array from multipart form (locations[])
    let locations = [];
    if (req.body.locations) {
      if (typeof req.body.locations === 'string') {
        try { locations = JSON.parse(req.body.locations); } catch { locations = [req.body.locations]; }
      } else {
        locations = Array.isArray(req.body.locations) ? req.body.locations : [req.body.locations];
      }
    }

    // Handle socialMedia — comes as JSON string from mobile
    let socialMedia = { instagram: '', twitter: '', youtube: '' };
    if (req.body.socialMedia) {
      try {
        const parsed = typeof req.body.socialMedia === 'string'
          ? JSON.parse(req.body.socialMedia)
          : req.body.socialMedia;
        // Normalize: mobile sends { instagram: { url }, facebook: { url } }
        socialMedia = {
          instagram: parsed?.instagram?.url || parsed?.instagram || '',
          twitter: parsed?.twitter?.url || parsed?.twitter || '',
          youtube: parsed?.youtube?.url || parsed?.youtube || '',
        };
      } catch (e) {
        console.error('socialMedia parse error:', e.message);
      }
    }

    // Handle verificationStatus
    let verificationStatus = { email: false, phone: false, ownerName: false };
    if (req.body.verificationStatus) {
      try {
        verificationStatus = typeof req.body.verificationStatus === 'string'
          ? JSON.parse(req.body.verificationStatus)
          : req.body.verificationStatus;
      } catch (e) { /* use default */ }
    }

    // Handle brand logo upload
    let brandLogo = "";
    if (req.file) {
      brandLogo = `uploads/profilePhoto/${req.file.filename}`;
    }

    const profile = await BrandOwnerProfile.create({
      userId,
      email,
      brandName: req.body.brandName,
      industry: req.body.industry,
      description: req.body.description,
      website: req.body.website,
      locations,
      socialMedia,
      brandLogo,
      promotionsPosted: 0,
      rating: 0,
      verificationStatus,
      wallet: 0,
    });

    await Notification.create({
      userId,
      message: "🏢 Your brand profile is created. Start posting promotions.",
      type: "system",
    });

    res.status(201).json({ message: "Brand Owner profile created", profile });
  } catch (error) {
    console.error("createBrandOwner error:", error);
    res.status(500).json({ message: error.message });
  }
};


const getInfluencerProfile = async (req, res) => {
  try {
    const profile = await InfluencerProfile.findOne({ userId: req.user._id });

    if (!profile)
      return res.status(404).json({ message: "Influencer profile not found" });

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBrandOwnerProfile = async (req, res) => {
  try {
    const profile = await BrandOwnerProfile.findOne({ userId: req.user._id });

    if (!profile)
      return res.status(404).json({ message: "Brand Owner profile not found" });

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const  updateInfluencerProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const existingProfile = await InfluencerProfile.findOne({ userId });
    if (!existingProfile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Handle category — dual-format (JSON string or array)
    let category = existingProfile.category;
    if (req.body.category) {
      if (typeof req.body.category === 'string') {
        try { category = JSON.parse(req.body.category); } catch { category = [req.body.category]; }
      } else {
        category = Array.isArray(req.body.category) ? req.body.category : [req.body.category];
      }
    }

    // Handle locations — dual-format
    let locations = existingProfile.locations;
    if (req.body.locations) {
      if (typeof req.body.locations === 'string') {
        try { locations = JSON.parse(req.body.locations); } catch { locations = [req.body.locations]; }
      } else {
        locations = Array.isArray(req.body.locations) ? req.body.locations : [req.body.locations];
      }
    }

    // Handle portfolioLinks — dual-format
    let portfolioLinks = existingProfile.portfolioLinks;
    if (req.body.portfolioLinks) {
      if (typeof req.body.portfolioLinks === 'string') {
        try { portfolioLinks = JSON.parse(req.body.portfolioLinks); } catch { portfolioLinks = [req.body.portfolioLinks]; }
      } else {
        portfolioLinks = Array.isArray(req.body.portfolioLinks) ? req.body.portfolioLinks : [req.body.portfolioLinks];
      }
    }

    // Handle socialMedia
    let parsedSocialMedia = null;
    if (req.body.socialMedia) {
      try {
        parsedSocialMedia = typeof req.body.socialMedia === 'string'
          ? JSON.parse(req.body.socialMedia)
          : req.body.socialMedia;
      } catch (e) {
        console.error('socialMedia parse error:', e.message);
      }
    }

    // Profile photo update logic
    let profilePhoto = existingProfile.profilePhoto;
    if (req.file) {
      profilePhoto = `uploads/profilePhoto/${req.file.filename}`;
    }

    // Update fields
    existingProfile.firstName = req.body.firstName ?? existingProfile.firstName;
    existingProfile.lastName = req.body.lastName ?? existingProfile.lastName;
    existingProfile.userName = req.body.userName ?? existingProfile.userName;
    existingProfile.phoneNumber = req.body.phoneNumber ?? req.body.phone ?? existingProfile.phoneNumber;
    existingProfile.about = req.body.about ?? existingProfile.about;
    existingProfile.category = category;
    existingProfile.locations = locations;
    existingProfile.portfolioLinks = portfolioLinks;
    existingProfile.profilePhoto = profilePhoto;

    if (parsedSocialMedia) {
      existingProfile.socialMedia.instagram = {
        ...existingProfile.socialMedia.instagram,
        link: parsedSocialMedia?.instagram?.url || parsedSocialMedia?.instagram?.link || existingProfile.socialMedia.instagram?.link,
        followers: parsedSocialMedia?.instagram?.followers ?? existingProfile.socialMedia.instagram?.followers,
      };
      existingProfile.socialMedia.youtube = {
        ...existingProfile.socialMedia.youtube,
        link: parsedSocialMedia?.youtube?.url || parsedSocialMedia?.youtube?.link || existingProfile.socialMedia.youtube?.link,
        followers: parsedSocialMedia?.youtube?.subscribers ?? parsedSocialMedia?.youtube?.followers ?? existingProfile.socialMedia.youtube?.followers,
      };
      existingProfile.socialMedia.twitter = {
        ...existingProfile.socialMedia.twitter,
        link: parsedSocialMedia?.twitter?.url || parsedSocialMedia?.twitter?.link || existingProfile.socialMedia.twitter?.link,
        followers: parsedSocialMedia?.twitter?.followers ?? existingProfile.socialMedia.twitter?.followers,
      };
    }

    await existingProfile.save();

    res.status(200).json({
      message: "Influencer profile updated successfully",
      profile: existingProfile,
    });
  } catch (error) {
    console.error("updateInfluencerProfile error:", error);
    res.status(500).json({ message: error.message });
  }
};


const updateBrandOwnerProfile = async (req, res) => {
  try {
    let data = { ...req.body };

    // Handle locations — can come as JSON string OR as array from multipart form
    if (data.locations) {
      if (typeof data.locations === 'string') {
        try { data.locations = JSON.parse(data.locations); } catch { data.locations = [data.locations]; }
      } else if (!Array.isArray(data.locations)) {
        data.locations = [data.locations];
      }
    }

    // Handle socialMedia — normalize from mobile format
    if (data.socialMedia) {
      try {
        const parsed = typeof data.socialMedia === 'string'
          ? JSON.parse(data.socialMedia)
          : data.socialMedia;
        data.socialMedia = {
          instagram: parsed?.instagram?.url || parsed?.instagram || '',
          twitter: parsed?.twitter?.url || parsed?.twitter || '',
          youtube: parsed?.youtube?.url || parsed?.youtube || '',
        };
      } catch (e) {
        delete data.socialMedia; // don't overwrite with bad data
      }
    }

    // Handle brand logo update
    if (req.file) {
      data.brandLogo = `uploads/profilePhoto/${req.file.filename}`;
    }

    const updated = await BrandOwnerProfile.findOneAndUpdate(
      { userId: req.user._id },
      data,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Brand Owner profile not found" });
    }

    res.json({ message: "Brand Owner updated", updated });
  } catch (err) {
    console.error("updateBrandOwnerProfile error:", err);
    res.status(500).json({ message: err.message });
  }
};

const getInfluencersForBrandOwner = async (req, res) => {
  try {
    // Fetch ALL influencers - let frontend handle filtering
    // This ensures brand owners can discover creators from any location
    const influencers = await InfluencerProfile.find({})
      .select(
        "firstName lastName userName profilePhoto category locations socialMedia rating verified about"
      )
      .sort({ createdAt: -1 }); // Show newest first

    res.status(200).json({
      count: influencers.length,
      influencers,
    });
  } catch (error) {
    console.error("Error fetching influencers:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getInfluencerProfileByUserId = async (req, res) => {
  try {
    const { influencerId } = req.params; // this is USER ID

    const influencer = await InfluencerProfile.findOne({
      userId: influencerId,
    })
      .populate("userId", "email role")
      .select(
        "firstName lastName userName profilePhoto category locations bio socialMedia rating verified"
      );

    if (!influencer) {
      return res.status(404).json({
        message: "Influencer profile not found for this user",
      });
    }

    res.status(200).json({ influencer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


export{
   createInfluencer,
  createBrandOwner,
 getInfluencerProfile,
  getBrandOwnerProfile,
  updateInfluencerProfile,
  updateBrandOwnerProfile,
  getInfluencersForBrandOwner
}


// =========================================
// Get Influencer Filters for Brand Owner
// =========================================
export const getInfluencerFilters = async (req, res) => {
  try {
    // Get unique categories from all influencer profiles
    const categories = await InfluencerProfile.distinct('category');
    
    // Get unique locations from all influencer profiles
    const locations = await InfluencerProfile.distinct('locations');
    
    res.status(200).json({
      success: true,
      categories: categories.filter(Boolean), // Remove null/undefined
      locations: locations.filter(Boolean).flat() // Flatten array and remove null/undefined
    });
  } catch (error) {
    console.error("Error fetching influencer filters:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch filters",
      error: error.message
    });
  }
};
