import mongoose from "mongoose";

const campaignSubmissionSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
    },

    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },

    brandOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Influencer submission
    description: { type: String },
    proofUrls: [{ type: String }], // reels, posts, yt links etc

    mediaProofs: [
      {
        url: String,
        filename: String,
        mimetype: String,
        size: Number,
      },
    ],

    submittedAt: { type: Date, default: Date.now },

    // Brand review
    status: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
      default: "submitted",
    },

  brandFeedback: {
    text: { type: String },
    rating: { type: Number },
    givenAt: { type: Date },
  },
    rating: { type: Number, min: 1, max: 5 },

    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const CampaignSubmission = mongoose.model(
  "CampaignSubmission",
  campaignSubmissionSchema
);
