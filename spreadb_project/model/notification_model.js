import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    title: { type: String },   // Short heading
    message: { type: String, required: true },

    type: {
      type: String,
      enum: [
        "application",
        "promotion",
        "agreement",
        "status",
        "submission",
        "feedback",
        "system"
      ],
      default: "system",
    },

    entityId: { type: mongoose.Schema.Types.ObjectId }, // promotionId / applicationId
    entityType: { type: String }, // Promotion | Application | Agreement

    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);





// import mongoose from "mongoose";

// const notificationSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   message: { type: String, required: true },
//   type: { type: String, enum: ["application", "agreement", "system"], default: "system" },
//   read: { type: Boolean, default: false },
// }, { timestamps: true });

// export const Notification = mongoose.model("Notification", notificationSchema);
