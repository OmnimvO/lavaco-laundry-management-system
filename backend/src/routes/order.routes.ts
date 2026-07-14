import { Router } from "express";

import {
  UserRole,
} from "../generated/prisma/client.js";

import {
  orderController,
} from "../controllers/order.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/role.middleware.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  requireRole(
    UserRole.ADMIN,
    UserRole.STAFF
  ),
  orderController.createOrder
);

router.get(
  "/",
  orderController.getAllOrders
);

router.get(
  "/:id",
  orderController.getOrderById
);

router.put(
  "/:id",
  requireRole(
    UserRole.ADMIN,
    UserRole.STAFF
  ),
  orderController.updateOrder
);

router.patch(
  "/:id/status",
  requireRole(
    UserRole.ADMIN,
    UserRole.STAFF
  ),
  orderController.updateOrderStatus
);

router.delete(
  "/:id",
  requireRole(
    UserRole.ADMIN
  ),
  orderController.deleteOrder
);

export default router;