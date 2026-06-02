import express from "express";
import {
  createInfluencer,
  createBrandOwner,
 getInfluencerProfile,
  getBrandOwnerProfile,
  updateInfluencerProfile,
  updateBrandOwnerProfile,
  getInfluencersForBrandOwner,
  getInfluencerProfileByUserId,
  getInfluencerFilters
} from "../controller/profiles_controller.js";
import { protect,checkRole } from "../middleware/auth_middleware.js";
import upload from "../middleware/upload.js";

const profile_router = express.Router();

// ─── Original routes (keep for web frontend compatibility) ───
profile_router.post("/add_influencer", protect, checkRole("Influencer"), upload.single("profilePhoto"), createInfluencer);
profile_router.post("/add_brand-owner", protect, checkRole("Brand Owner"), upload.single("brandLogo"), createBrandOwner);
profile_router.get("/get_influencer", protect, checkRole("Influencer"), getInfluencerProfile);
profile_router.get("/brand-owner", protect, checkRole("Brand Owner"), getBrandOwnerProfile);
profile_router.patch("/influencer", protect, checkRole("Influencer"), upload.single("profilePhoto"), updateInfluencerProfile);
profile_router.patch("/brand-owner", protect, checkRole("Brand Owner"), upload.single("brandLogo"), updateBrandOwnerProfile);

// ─── Mobile app routes (clean REST style) ───
profile_router.post("/influencer", protect, checkRole("Influencer"), upload.single("profilePhoto"), createInfluencer);
profile_router.post("/brand", protect, checkRole("Brand Owner"), upload.single("brandLogo"), createBrandOwner);
profile_router.get("/influencer", protect, checkRole("Influencer"), getInfluencerProfile);
profile_router.get("/brand", protect, checkRole("Brand Owner"), getBrandOwnerProfile);
profile_router.put("/influencer", protect, checkRole("Influencer"), upload.single("profilePhoto"), updateInfluencerProfile);
profile_router.put("/brand", protect, checkRole("Brand Owner"), upload.single("brandLogo"), updateBrandOwnerProfile);

// ─── Shared routes ───
profile_router.get("/brand/influencers/filters", protect, checkRole("Brand Owner"), getInfluencerFilters);
profile_router.get("/brand/influencers", protect, checkRole("Brand Owner"), getInfluencersForBrandOwner);
profile_router.get("/influencer/:influencerId", protect, getInfluencerProfileByUserId);

export default profile_router;