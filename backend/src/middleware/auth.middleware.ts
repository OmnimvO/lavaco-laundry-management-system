import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { authService } from "../services/auth.service.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authorizationHeader =
      req.headers.authorization;

    if (!authorizationHeader) {
      return res.status(401).json({
        message:
          "Authorization token is required",
      });
    }

    const [
      scheme,
      token,
    ] = authorizationHeader.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return res.status(401).json({
        message:
          "Use a valid Bearer token",
      });
    }

    const payload =
      authService.verifyToken(token);

    req.user = payload;

    return next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return res.status(401).json({
      message:
        "Invalid or expired token",
    });
  }
}