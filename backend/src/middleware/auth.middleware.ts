import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  UserStatus,
} from "../generated/prisma/client.js";

import {
  authService,
} from "../services/auth.service.js";

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const authorizationHeader =
      request.headers.authorization;

    if (!authorizationHeader) {
      return response.status(401).json({
        message:
          "Authorization token is required",
      });
    }

    const [
      scheme,
      token,
    ] = authorizationHeader.split(
      " "
    );

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return response.status(401).json({
        message:
          "Use a valid Bearer token",
      });
    }

    const payload =
      authService.verifyToken(
        token
      );

    const user =
      await authService.getUserById(
        payload.userId,
        true
      );

    if (!user) {
      return response.status(401).json({
        message:
          "The account linked to this token no longer exists.",
      });
    }

    if (user.isArchived) {
      return response.status(401).json({
        message:
          "This account has been archived. Please contact an administrator.",
      });
    }

    if (
      user.status !==
      UserStatus.ACTIVE
    ) {
      return response.status(401).json({
        message:
          "This account is inactive.",
      });
    }

    if (
      user.employee?.isArchived
    ) {
      return response.status(401).json({
        message:
          "The linked employee record has been archived.",
      });
    }

    if (
      user.employee &&
      user.employee.status !==
        "ACTIVE"
    ) {
      return response.status(401).json({
        message:
          "The linked employee record is inactive.",
      });
    }

    request.user = {
      userId:
        user.id,

      email:
        user.email,

      role:
        user.role,
    };

    return next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return response.status(401).json({
      message:
        "Invalid or expired token",
    });
  }
}