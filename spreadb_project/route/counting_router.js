import express from "express";
import {
  getNotificationCounts,
  getNotifications,
  markNotificationAsRead
} from "../controller/counting_controller.js";
import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

// GET /api/counting/counts - Get notification counts for navbar
router.get("/counts", protect, getNotificationCounts);

// GET /api/counting - Get detailed notifications
router.get("/", protect, getNotifications);

// PUT /api/counting/read - Mark notification as read
router.put("/read", protect, markNotificationAsRead);

// Test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Counting routes are working!",
    timestamp: new Date().toISOString()
  });
});

export default router;