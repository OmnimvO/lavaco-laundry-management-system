import { Router } from "express";

import {
  archiveController,
} from "../controllers/archive.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  requireAdmin,
} from "../middleware/admin.middleware.js";

const router = Router();

router.use(
  requireAuth,
  requireAdmin
);

router.get(
  "/summary",
  archiveController.getArchiveSummary
);

router.get(
  "/:entityType",
  archiveController.getArchivedRecords
);

router.post(
  "/:entityType/:id/archive",
  archiveController.archiveRecord
);

router.post(
  "/:entityType/:id/restore",
  archiveController.restoreRecord
);

export default router;