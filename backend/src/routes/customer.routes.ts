import { Router } from "express";

import {
  UserRole,
} from "../generated/prisma/client.js";

import {
  customerController,
} from "../controllers/customer.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/role.middleware.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  customerController.getAllCustomers
);

router.get(
  "/lookup",
  requireRole(
    UserRole.ADMIN,
    UserRole.STAFF
  ),
  customerController.lookupCustomerByPhone
);

router.post(
  "/",
  requireRole(
    UserRole.ADMIN,
    UserRole.STAFF
  ),
  customerController.createCustomer
);

router.get(
  "/:id",
  customerController.getCustomerById
);

router.put(
  "/:id",
  requireRole(
    UserRole.ADMIN,
    UserRole.STAFF
  ),
  customerController.updateCustomer
);

router.delete(
  "/:id",
  requireRole(
    UserRole.ADMIN
  ),
  customerController.deleteCustomer
);

export default router;