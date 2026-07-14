import { Router } from "express";

import { reportController } from "../controllers/report.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/daily",
  reportController.getDailyReport
);

router.get(
  "/weekly",
  reportController.getWeeklyReport
);

router.get(
  "/monthly",
  reportController.getMonthlyReport
);

router.get(
  "/yearly",
  reportController.getYearlyReport
);

router.get(
  "/overall",
  reportController.getOverallReport
);

router.get(
  "/refunds",
  reportController.getRefundReport
);

export default router;