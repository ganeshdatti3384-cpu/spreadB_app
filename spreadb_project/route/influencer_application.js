import express from "express";
import { protect,checkRole } from "../middleware/auth_middleware.js";


import {
  applyForPromotion,
  withdrawApplication,topUpSticks,getStickBalance,getStickHistory,getMyApplications
} from "../controller/influencer_applications.js";

const influencer_router = express.Router();



influencer_router.post(
  "/apply",
  protect,
  checkRole("Influencer"),
  applyForPromotion
);

influencer_router.post(
  "/withdraw",
  protect,
  checkRole("Influencer"),
  withdrawApplication
);
influencer_router.get(
  "/applications/my",
  protect,
  getMyApplications
);
 
influencer_router.post(
  "/sticks/refill",
  protect,
  checkRole("Influencer"),
  topUpSticks
);
 
influencer_router.get(
  "/sticks/history",
  protect,
  checkRole("Influencer"),
  getStickHistory
);
 
influencer_router.get(
  "/sticks/balance",
  protect,
  checkRole("Influencer"),
  getStickBalance
);
 

export default influencer_router;
