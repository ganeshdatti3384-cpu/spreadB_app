import express from "express";
import {
  submitCampaignWork,
  reviewSubmission,
  getMySubmissions,
  getCampaignSubmissions,
  getBrandPendingSubmissions,
} from "../controller/submission_controller.js";
import uploadSubmissionProofs from "../middleware/uploadSubmissionProofs.js";
import { protect } from "../middleware/auth_middleware.js";

const submission_router = express.Router();

// Influencer submits work
submission_router.post(
  "/submit",
  protect,
  uploadSubmissionProofs.array("mediaProofs", 5),
  submitCampaignWork
);

// Brand reviews
submission_router.post("/review", protect, reviewSubmission);

// Influencer views submissions + feedback
submission_router.get("/my", protect, getMySubmissions);

// Brand views all pending submissions (for dashboard)
submission_router.get("/brand/pending", protect, getBrandPendingSubmissions);

// Brand views campaign submissions
submission_router.get(
  "/campaign/:campaignId",
  protect,
  getCampaignSubmissions
);



export default submission_router;
