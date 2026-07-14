import { Router } from "express";

import {
  UserRole,
} from "../generated/prisma/client.js";

import {
  tankCycleController,
} from "../controllers/tankCycle.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/role.middleware.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/status",
  tankCycleController.getStatus
);

router.get(
  "/history",
  tankCycleController.getHistory
);

router.post(
  "/replace",
  requireRole(
    UserRole.ADMIN
  ),
  tankCycleController.replaceTank
);

export default router;