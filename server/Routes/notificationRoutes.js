import express from "express";
import authMiddleware from "../src/middlewares/authMiddleware.js";
import {
  getNotificationsForUser,
  markNotificationRead,
  getUnreadCount,
  syncNearDeadlineAndRecentAlerts,
} from "../Controllers/notificationController.js";

const router = express.Router();

// Authentication required for notification access
router.use(authMiddleware);

router.get("/", getNotificationsForUser); // GET /api/notifications
router.get("/sync", syncNearDeadlineAndRecentAlerts); // GET /api/notifications/sync
router.post("/:id/read", markNotificationRead); // POST /api/notifications/:id/read
router.get("/unread-count", getUnreadCount); // GET /api/notifications/unread-count

export default router;
