import { Router } from "express";

import {
  UserRole,
} from "../generated/prisma/client.js";

import {
  employeeController,
} from "../controllers/employee.controller.js";

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
  employeeController.getAllEmployees
);

router.get(
  "/:id",
  employeeController.getEmployeeById
);

router.post(
  "/",
  requireRole(
    UserRole.ADMIN
  ),
  employeeController.createEmployee
);

router.put(
  "/:id",
  requireRole(
    UserRole.ADMIN
  ),
  employeeController.updateEmployee
);

router.delete(
  "/:id",
  requireRole(
    UserRole.ADMIN
  ),
  employeeController.deleteEmployee
);

export default router;