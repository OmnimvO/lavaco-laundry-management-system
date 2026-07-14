import { Router } from "express";

import {
  revenueController,
} from "../controllers/revenue.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  revenueController.getRevenueReport
);

export default router;