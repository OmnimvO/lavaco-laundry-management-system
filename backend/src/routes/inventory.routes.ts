import { Router } from "express";

import {
  inventoryController,
} from "../controllers/inventory.controller.js";

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
  inventoryController.getAllInventoryItems
);

router.get(
  "/low-stock",
  inventoryController.getLowStockItems
);

router.post(
  "/",
  inventoryController.createInventoryItem
);

router.get(
  "/:id",
  inventoryController.getInventoryItemById
);

router.put(
  "/:id",
  inventoryController.updateInventoryItem
);

router.delete(
  "/:id",
  requireAdmin,
  inventoryController.archiveInventoryItem
);

router.get(
  "/:id/movements",
  inventoryController.getMovements
);

router.post(
  "/:id/stock-in",
  inventoryController.stockIn
);

router.post(
  "/:id/stock-out",
  inventoryController.stockOut
);

router.post(
  "/:id/adjust",
  requireAdmin,
  inventoryController.adjustStock
);

export default router;