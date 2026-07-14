import { Router } from "express";

import {
  notificationController,
} from "../controllers/notification.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  notificationController.getMyNotifications
);

router.get(
  "/unread-count",
  notificationController.getUnreadCount
);

router.put(
  "/read-all",
  notificationController.markAllAsRead
);

router.put(
  "/:id/read",
  notificationController.markAsRead
);

export default router;