import express from "express";
import { protect, checkRole } from "../middleware/auth_middleware.js";

import {
  browsePromotions,
  searchPromotions,
  getPromotionFilters,
  getPromotionById,
  getCompletedCampaigns,
  getActiveCollaborations,
  getProposalsReceived,
  getApplicantsForCampaign,
  getMyPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  deletePromotionImage,
} from "../controller/promotion_controller.js";

const promotion_router = express.Router();

//STATIC ROUTES (FIRST)

// Search + filters
promotion_router.get(
  "/search",
  protect,
  checkRole("Influencer"),
  searchPromotions
);

promotion_router.get(
  "/filters",
  protect,
  getPromotionFilters
);

// Browse promotions
promotion_router.get(
  "/browse",
  protect,
  checkRole("Influencer"),
  browsePromotions
);

// Brand owner promotions
promotion_router.get(
  "/my-promotions",
  protect,
  checkRole("Brand Owner"),
  getMyPromotions
);
//Proposals Received
promotion_router.get(
  "/proposals",
  protect,
  checkRole("Brand Owner"),
  getProposalsReceived
);
//Active Collaborations
promotion_router.get(
  "/active-collaborations",
  protect,
  checkRole("Brand Owner"),
  getActiveCollaborations
);
//Completed Campaigns
promotion_router.get(
  "/completed-campaigns",
  protect,
  checkRole("Brand Owner"),
  getCompletedCampaigns
);


// Create promotion
promotion_router.post(
  "/create",
  protect,
  checkRole("Brand Owner"),
  createPromotion
);

// Campaign applicants
promotion_router.get(
  "/campaign/:campaignId/applicants",
  protect,
  getApplicantsForCampaign
);

//FULLY DYNAMIC ROUTES (LAST)

// Get promotion by ID
promotion_router.get(
  "/:id",
  protect,
  getPromotionById
);

// Update promotion
promotion_router.put(
  "/:id",
  protect,
  checkRole("Brand Owner"),
  updatePromotion
);

// Delete promotion image
promotion_router.delete(
  "/:id/image/:imageId",
  protect,
  checkRole("Brand Owner"),
  deletePromotionImage
);

// Delete promotion
promotion_router.delete(
  "/:id",
  protect,
  checkRole("Brand Owner"),
  deletePromotion
);

export default promotion_router;






// import express from "express";
// import { protect,checkRole } from "../middleware/auth_middleware.js";

// import {
//     browsePromotions,
//   searchPromotions,
//    getPromotionFilters,
//   getApplicantsForCampaign,
//   getMyPromotions,
//     createPromotion,
//   getAllPromotions,
//   getPromotionById,
//   getPromotionByPublicId,
//   updatePromotion,
//   deletePromotion,
//   deletePromotionImage,
//   getSimilarPromotions
// } from "../controller/promotion_controller.js";

// const promotion_router = express.Router();

// promotion_router.get(
//   "/my-promotions",
//   protect,
//   checkRole("Brand Owner"),
//   getMyPromotions
// );
// promotion_router.get(
//   "/browse",
//   protect,
//   checkRole("Influencer"),
//   browsePromotions
// );
// // Public routes (no authentication required)
// //promotion_router.post("/create", createPromotion, createPromotion);
// promotion_router.get("/all", getAllPromotions);
// promotion_router.get("/:id", getPromotionById);
// promotion_router.get("/public/:publicId", getPromotionByPublicId);
// promotion_router.get("/:id/similar", getSimilarPromotions); // New route for similar promotions
// promotion_router.post(
//   "/create",
//   protect,
//   checkRole("Brand Owner"),
//   createPromotion
// );



// // Update and delete routes
// promotion_router.put("/:id", createPromotion, updatePromotion);
// promotion_router.delete("/:id/image/:imageId", deletePromotionImage);
// promotion_router.delete("/:id", deletePromotion);


// // promotion_router.get(
// //   "/browse",
// //   protect,
// //   checkRole("Influencer"),
// //   browsePromotions
// // );

// promotion_router.get("/campaign/:campaignId/applicants", protect,getApplicantsForCampaign);
// //  Search + filters
// promotion_router.get(
//   "/search",
//   protect,
//   checkRole("Influencer"),
//   searchPromotions
// );

// //  Filter metadata
// promotion_router.get(
//   "/filters",
//   protect,
//   getPromotionFilters
// );
// export default promotion_router;



// import { protect,checkRole } from "../middleware/auth_middleware.js";

// import {
//     browsePromotions,
//   createPromotion,
//   getApplicantsForCampaign,
//   getMyPromotions,
// } from "../controller/promotion_controller.js";

// const promotion_router = express.Router();

// promotion_router.post(
//   "/create",
//   protect,
//   checkRole("Brand Owner"),
//   createPromotion
// );

// promotion_router.get(
//   "/my-promotions",
//   protect,
//   checkRole("Brand Owner"),
//   getMyPromotions
// );

// promotion_router.get(
//   "/browse",
//   protect,
//   checkRole("Influencer"),
//   browsePromotions
// );

// promotion_router.get("/campaign/:campaignId/applicants", protect,getApplicantsForCampaign);


// export default promotion_router;