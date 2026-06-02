import mongoose from "mongoose";

const agreementSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Promotions_Applied", required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Promotion", required: true },

  brandOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  agreementText: { type: String, required: true },
  pdfUrl: { type: String },

  influencerSigned: { type: Boolean, default: false },
  signedAt: { type: Date },

  version: { type: Number, default: 1 },
}, { timestamps: true });

export const Agreement = mongoose.model("Agreement", agreementSchema);
