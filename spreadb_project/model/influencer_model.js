import mongoose from "mongoose";

const stickTransactionSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ["top-up", "spent", "refund", "bonus", "reward"]
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  promotionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Promotion"
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Application"
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["completed", "pending", "failed"],
    default: "completed"
  }
});

const influencerStatsSchema = new mongoose.Schema({
  totalApplications: {
    type: Number,
    default: 0
  },
  acceptedApplications: {
    type: Number,
    default: 0
  },
  completedPromotions: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  }
});

const influencerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  
  // Personal Information
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  profilePicture: {
    type: String
  },
  coverPhoto: {
    type: String
  },
  
  // Contact Information
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  website: {
    type: String
  },
  
  // Social Media Links
  socialLinks: {
    instagram: String,
    youtube: String,
    tiktok: String,
    twitter: String,
    facebook: String,
    linkedin: String
  },
  
  // Skills and Expertise
  skills: [{
    type: String,
    trim: true
  }],
  categories: [{
    type: String,
    trim: true
  }],
  expertiseLevel: {
    type: String,
    enum: ["beginner", "intermediate", "expert", "professional"],
    default: "beginner"
  },
  
  // Location
  location: {
    city: String,
    state: String,
    country: String,
    isRemote: {
      type: Boolean,
      default: false
    }
  },
  
  // Sticks Management
  sticks: {
    available: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEarned: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    }
  },
  
  // Transaction History
  stickTransactions: [stickTransactionSchema],
  
  // Applications
  applications: [{
    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion"
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application"
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn", "completed"],
      default: "pending"
    }
  }],
  
  // Statistics
  stats: influencerStatsSchema,
  
  // Preferences
  preferences: {
    minBudget: {
      type: Number,
      default: 0
    },
    preferredCategories: [String],
    locationPreferences: [String],
    notificationSettings: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      newPromotions: { type: Boolean, default: true },
      applicationUpdates: { type: Boolean, default: true }
    }
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected", "unverified"],
    default: "unverified"
  },
  
  // Account Status
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active"
  },
  
  // Metadata
  lastActive: {
    type: Date,
    default: Date.now
  },
  profileCompletion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Indexes for better performance
influencerSchema.index({ userId: 1 });
influencerSchema.index({ "skills": 1 });
influencerSchema.index({ "categories": 1 });
influencerSchema.index({ "location.city": 1 });
influencerSchema.index({ "location.country": 1 });
influencerSchema.index({ "stats.averageRating": -1 });

// Virtual for total experience (can be calculated based on join date or other factors)
influencerSchema.virtual('experience').get(function() {
  const joinDate = this.createdAt;
  const now = new Date();
  const diffTime = Math.abs(now - joinDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to check if influencer can apply to promotion
influencerSchema.methods.canApply = function(promotion) {
  return this.sticks.available >= promotion.requiredSticks;
};

// Method to add sticks
influencerSchema.methods.addSticks = function(amount, description, type = "top-up") {
  this.sticks.available += amount;
  this.sticks.totalEarned += amount;
  
  this.stickTransactions.push({
    action: type,
    amount: amount,
    description: description,
    date: new Date()
  });
  
  return this.save();
};

// Method to spend sticks
influencerSchema.methods.spendSticks = function(amount, description, promotionId = null, applicationId = null) {
  if (this.sticks.available < amount) {
    throw new Error('Insufficient sticks');
  }
  
  this.sticks.available -= amount;
  this.sticks.totalSpent += amount;
  
  this.stickTransactions.push({
    action: "spent",
    amount: amount,
    description: description,
    promotionId: promotionId,
    applicationId: applicationId,
    date: new Date()
  });
  
  return this.save();
};

// Method to refund sticks
influencerSchema.methods.refundSticks = function(amount, description, promotionId = null, applicationId = null) {
  this.sticks.available += amount;
  this.sticks.totalSpent -= amount;
  
  this.stickTransactions.push({
    action: "refund",
    amount: amount,
    description: description,
    promotionId: promotionId,
    applicationId: applicationId,
    date: new Date()
  });
  
  return this.save();
};

// Static method to find influencers by skills
influencerSchema.statics.findBySkills = function(skills) {
  return this.find({
    skills: { $in: skills }
  });
};

// Static method to find influencers by location
influencerSchema.statics.findByLocation = function(location) {
  return this.find({
    $or: [
      { "location.city": new RegExp(location, 'i') },
      { "location.country": new RegExp(location, 'i') },
      { "location.isRemote": true }
    ]
  });
};

// Update last active timestamp before save
influencerSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

const Influencer = mongoose.model("Influencer", influencerSchema);

export default Influencer;
