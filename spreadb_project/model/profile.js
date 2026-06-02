import mongoose from "mongoose";

// ================= Influencer Profile =================
const influencerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },

    firstName: { type: String, required: true },
    lastName: { type: String },
    userName: { type: String, required: true },

    profilePhoto: { type: String }, // stored filepath

    phoneNumber: { type: String },
    about: { type: String },

    category: [{ type: String }], // multiple
    locations: [{ type: String }], // multiple

    portfolioLinks: [{ type: String }],

    // socialMedia: {
    //   instagram: { type: String },
    //   youtube: { type: String },
    //   twitter: { type: String },
    // },

    // audience: {
    //   followers: { type: Number, default: 0 },
    //   views: { type: Number, default: 0 },
    // },

    socialMedia: {
  instagram: {
    link: { type: String },
    followers: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
  youtube: {
    link: { type: String },
    followers: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
  twitter: {
    link: { type: String },
    followers: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
},


    rating: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },

    wallet: { type: Number, default: 100 }, // starting sticks (deprecated)

    // New sticks system
    sticks: {
      free: { type: Number, default: 100 },      // Free sticks (initial 100)
      purchased: { type: Number, default: 0 },   // Purchased sticks
      total: { type: Number, default: 100 },     // Total available
      spent: { type: Number, default: 0 },       // Total spent
      transactions: [{
        type: { type: String, enum: ['earned', 'spent', 'purchased'] },
        amount: { type: Number },
        description: { type: String },
        paymentId: { type: String },
        orderId: { type: String },
        date: { type: Date, default: Date.now }
      }]
    },

    reports: {
      availableSticks: { type: Number, default: 100 },
      sticksHistory: [{ action: String, amount: Number, date: Date }],
      promotionsApplied: [{ type: String }],
      promotionsAccepted: [{ type: String }],
    },
  },
  { timestamps: true }
);

 const InfluencerProfile = mongoose.model(
  "InfluencerProfile",
  influencerSchema
);

// ================= Brand Owner Profile =================
const brandOwnerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },

    brandName: { type: String, required: true },
    industry: { type: String },

    brandLogo: { type: String }, // stored file path

    description: { type: String },
    website: { type: String },

    locations: [{ type: String }],

    socialMedia: {
      instagram: { type: String },
      twitter: { type: String },
      youtube: { type: String },
    },

    promotionsPosted: { type: Number, default: 0 },

    rating: { type: Number, default: 0 },

    verificationStatus: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      ownerName: { type: Boolean, default: false },
    },

    wallet: { type: Number, default: 0 },
  },
  { timestamps: true }
);

 const BrandOwnerProfile = mongoose.model(
  "BrandOwnerProfile",
  brandOwnerSchema
);
export {
    InfluencerProfile, BrandOwnerProfile
}