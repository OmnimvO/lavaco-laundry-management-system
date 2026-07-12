import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type { UserRole } from "../generated/prisma/client.js";

export function requireRole(
  ...allowedRoles: UserRole[]
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    if (
      !allowedRoles.includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        message:
          "You do not have permission to access this resource",
      });
    }

    return next();
  };
}