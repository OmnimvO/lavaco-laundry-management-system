import { Router } from "express";

import { UserRole } from "../generated/prisma/client.js";

import { userController } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(
  requireAuth,
  requireRole(UserRole.ADMIN)
);

router.get(
  "/",
  userController.getAllUsers
);

router.get(
  "/:id",
  userController.getUserById
);

router.post(
  "/",
  userController.createUser
);

router.put(
  "/:id",
  userController.updateUser
);

router.patch(
  "/:id/reset-password",
  userController.resetPassword
);

router.delete(
  "/:id",
  userController.deleteUser
);

export default router;