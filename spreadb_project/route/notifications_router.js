import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
   deleteNotification,
   deleteAllNotifications
} from "../controller/notifications_controller.js";
import { protect } from "../middleware/auth_middleware.js";

const notifications_router = express.Router();

notifications_router.get("/all", protect, getNotifications);
notifications_router.patch("/:id/read", protect, markAsRead);
notifications_router.patch("/read-all", protect, markAllAsRead);
notifications_router.delete("/:id", protect, deleteNotification);
notifications_router.delete("/delete-all", protect, deleteAllNotifications);
export default notifications_router;



// import express from "express";
// import { protect } from "../middleware/auth_middleware.js";
// import { getNotifications, markAsRead } from "../controller/notifications_controller.js";

// const notifications_router = express.Router();

// notifications_router.get("/notifications", protect, getNotifications);
// notifications_router.patch("/notifications/mark-read/:id", protect, markAsRead);

// export default notifications_router;
