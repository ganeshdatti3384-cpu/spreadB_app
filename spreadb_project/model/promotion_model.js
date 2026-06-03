import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    brandOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: { type: String, required: true },
    description: { type: String },
    about: { type: String }, // New field
    website: { type: String },
    instagram: { type: String },
    facebook: { type: String },
    otherLinks: [{ type: String }], // New field

    categories: [{ type: String, required: true }],
    locations: [{ type: String, required: true }],
    locationDetails: [{
      name: String,
      lat: String,
      lon: String,
      type: String,
      fullName: String
    }],
    skills: [{ type: String }],

    budget: { type: Number, required: true },
    budgetType: {
      type: String,
      enum: ["fixed", "hourly"],
      default: "fixed"
    },
    duration: { type: String, required: true },
    applicationDeadline: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },

    requiredSticks: { type: Number, required: true, default: 0 },

    // Image support
    images: [{
      url: { type: String },
      filename: { type: String },
      originalName: { type: String },
      size: { type: Number },
      mimetype: { type: String }
    }],

    applicationStatus: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },

    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
    // Promotion
    openings: {
      type: Number,
      required: true,
    },

    filledPositions: {
      type: Number,
      default: 0,
    },


    // Analytics fields
    views: { type: Number, default: 0 },
    applicationsCount: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },

    // Public identifier for URL
    publicId: { type: String, unique: true },
  },
  { timestamps: true }
);

// Generate public ID before saving
promotionSchema.pre('save', function(next) {
  if (!this.publicId) {
    this.publicId = 'promo_' + Math.random().toString(36).substr(2, 9);
  }
  next();
});

const Promotion = mongoose.model("Promotion", promotionSchema);

// Application schema (if needed separately)
const applicationSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
    },

    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "withdrawn", "accepted", "rejected", "completed"],
      default: "pending",
    },

    notes: { type: String },
    sticksSpent: { type: Number, default: 0 },
    boostSticks: { type: Number, default: 0 },

    // Application details
    proposal: { type: String },
    estimatedDelivery: { type: Date },
    bidAmount: { type: Number },
  },
  { timestamps: true }
);

const Application = mongoose.model("Application", applicationSchema);

export { Promotion, Application };
