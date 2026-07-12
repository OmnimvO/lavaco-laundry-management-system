import { Router } from "express";
import { auditLogController } from "../controllers/auditLog.controller.js";

const router = Router();

router.get(
  "/",
  auditLogController.getAllAuditLogs
);

router.post(
  "/",
  auditLogController.createAuditLog
);

router.get(
  "/entity/:entityType/:entityId",
  auditLogController.getAuditLogsByEntity
);

router.get(
  "/:id",
  auditLogController.getAuditLogById
);

router.delete(
  "/:id",
  auditLogController.deleteAuditLog
);

export default router;