import express from "express";
import { protect } from "../middleware/auth_middleware.js";
import { getAgreements, reviewApplication, signAgreement } from "../controller/applications_controller.js";
import { getNotifications, markAsRead } from "../controller/notifications_controller.js";

const applications_router = express.Router();

// APPLICATION REVIEW (Brand Owner)
applications_router.patch("/review", protect, reviewApplication);//DONE
applications_router.get("/agreements", protect, getAgreements);
// AGREEMENT SIGNING (Influencer)
applications_router.patch("/agreement/sign", signAgreement); // Token-based signing (from email)
applications_router.post("/sign-agreement", protect, signAgreement); // Direct signing (from app)

// NOTIFICATIONS
applications_router.get("/notifications", protect, getNotifications);
applications_router.patch("/notifications/mark-read/:id", protect, markAsRead);

export default applications_router;
