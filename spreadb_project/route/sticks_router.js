import express from "express";
import { 
  getSticksBalance, 
  spendSticks, 
  getTransactionHistory,
  createSticksOrder,
  verifyPaymentAndAddSticks,
  getSticksPricing
} from "../controller/sticks_controller.js";
import { protect, checkRole } from "../middleware/auth_middleware.js";

const sticks_router = express.Router();

// Get sticks balance
sticks_router.get(
  "/balance", 
  protect, 
  checkRole("Influencer"), 
  getSticksBalance
);

// Spend sticks
sticks_router.post(
  "/spend", 
  protect, 
  checkRole("Influencer"), 
  spendSticks
);

// Get transaction history
sticks_router.get(
  "/transactions", 
  protect, 
  checkRole("Influencer"), 
  getTransactionHistory
);

// Get pricing plans
sticks_router.get(
  "/pricing", 
  protect, 
  checkRole("Influencer"), 
  getSticksPricing
);

// Create Razorpay order for purchasing sticks
sticks_router.post(
  "/create-order", 
  protect, 
  checkRole("Influencer"), 
  createSticksOrder
);

// Verify payment and add sticks
sticks_router.post(
  "/verify-payment", 
  protect, 
  checkRole("Influencer"), 
  verifyPaymentAndAddSticks
);

export default sticks_router;
