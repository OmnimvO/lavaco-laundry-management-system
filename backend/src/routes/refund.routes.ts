import { Router } from "express";

import {
  refundController,
} from "../controllers/refund.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  requireAdmin,
} from "../middleware/admin.middleware.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  refundController.getRefunds
);

router.get(
  "/:orderId",
  refundController.getRefundByOrderId
);

router.put(
  "/:orderId/complete",
  requireAdmin,
  refundController.markRefunded
);

router.put(
  "/:orderId/reopen",
  requireAdmin,
  refundController.reopenRefund
);

export default router;