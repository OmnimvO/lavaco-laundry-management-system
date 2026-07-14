import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  UserRole,
} from "../generated/prisma/client.js";

export function requireRole(
  ...allowedRoles: UserRole[]
) {
  return (
    request: Request,
    response: Response,
    next: NextFunction
  ) => {
    if (!request.user) {
      return response.status(401).json({
        message:
          "Not authenticated.",
      });
    }

    if (
      allowedRoles.length === 0
    ) {
      return response.status(500).json({
        message:
          "No roles were configured for this route.",
      });
    }

    if (
      !allowedRoles.includes(
        request.user.role
      )
    ) {
      return response.status(403).json({
        message:
          "You do not have permission to access this resource.",
      });
    }

    return next();
  };
}