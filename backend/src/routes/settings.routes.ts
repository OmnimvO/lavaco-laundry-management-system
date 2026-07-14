import { Router } from "express";

import {
  UserRole,
} from "../generated/prisma/client.js";

import {
  settingsController,
} from "../controllers/settings.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/role.middleware.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  settingsController.getSettings
);

router.put(
  "/",
  requireAuth,
  requireRole(UserRole.ADMIN),
  settingsController.updateSettings
);

export default router;