import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { isAdminRequest } from "../utils/authUser.js";

export function requireAdmin(
  request: Request,
  response: Response,
  next: NextFunction
) {
  if (!isAdminRequest(request)) {
    return response.status(403).json({
      message:
        "Administrator access is required.",
    });
  }

  return next();
}