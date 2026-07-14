import type {
  Request,
  Response,
} from "express";

import {
  AuditAction,
  AuditEntityType,
  UserRole,
  UserStatus,
} from "../generated/prisma/client.js";

import {
  authService,
} from "../services/auth.service.js";

import {
  auditLogService,
} from "../services/auditLog.service.js";

import {
  getAuthenticatedUserName,
} from "../utils/authUser.js";

function normalizeEmail(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toLowerCase();
}

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function validatePassword(
  password: unknown
) {
  if (
    typeof password !== "string"
  ) {
    return "Password is required";
  }

  if (password.length < 8) {
    return (
      "Password must contain at least 8 characters"
    );
  }

  return null;
}

function getSafeUser(user: {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  employeeId: number | null;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedBy: string | null;
  employee?: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    employeeId:
      user.employeeId,
    isArchived:
      user.isArchived,
    archivedAt:
      user.archivedAt,
    archivedBy:
      user.archivedBy,
    employee:
      user.employee ?? null,
    createdAt:
      user.createdAt,
    updatedAt:
      user.updatedAt,
  };
}

async function recordLoginAudit(
  data: {
    email: string;
    success: boolean;
    userId?: number | null;
    userName?: string | null;
    reason?: string;
  }
) {
  await auditLogService.recordAuditLogSafely({
    action:
      AuditAction.UPDATE,

    entityType:
      AuditEntityType.USER,

    entityId:
      data.userId ?? null,

    entityName:
      data.userName ??
      data.email,

    description:
      data.success
        ? `Successful login for ${data.email}.`
        : `Rejected login attempt for ${data.email}. ${data.reason ?? ""}`.trim(),

    performedBy:
      data.success
        ? data.userName ??
          data.email
        : "System",

    newData: {
      event:
        data.success
          ? "LOGIN_SUCCESS"
          : "LOGIN_FAILED",

      email:
        data.email,

      reason:
        data.reason ?? null,

      occurredAt:
        new Date().toISOString(),
    },
  });
}

function getAccountAccessError(
  user: {
    status: UserStatus;
    isArchived: boolean;
    employee:
      | {
          status: string;
          isArchived: boolean;
        }
      | null;
  }
) {
  if (user.isArchived) {
    return {
      status: 403,
      message:
        "This account has been archived. Ask an administrator to restore it.",
    };
  }

  if (
    user.status !==
    UserStatus.ACTIVE
  ) {
    return {
      status: 403,
      message:
        "This account is inactive.",
    };
  }

  if (
    user.employee?.isArchived
  ) {
    return {
      status: 403,
      message:
        "The linked employee record has been archived.",
    };
  }

  if (
    user.employee &&
    user.employee.status !==
      "ACTIVE"
  ) {
    return {
      status: 403,
      message:
        "The linked employee record is inactive.",
    };
  }

  return null;
}

export const authController = {
  register: async (
    request: Request,
    response: Response
  ) => {
    try {
      const userCount =
        await authService.countUsers();

      if (userCount > 0) {
        return response.status(403).json({
          message:
            "Public registration is disabled. Ask an administrator to create your account.",
        });
      }

      const {
        name,
        email,
        password,
        employeeId,
      } = request.body;

      if (
        typeof name !==
          "string" ||
        !name.trim()
      ) {
        return response.status(400).json({
          message:
            "Name is required",
        });
      }

      const normalizedEmail =
        normalizeEmail(email);

      if (
        !normalizedEmail ||
        !isValidEmail(
          normalizedEmail
        )
      ) {
        return response.status(400).json({
          message:
            "Enter a valid email address",
        });
      }

      const passwordError =
        validatePassword(password);

      if (passwordError) {
        return response.status(400).json({
          message:
            passwordError,
        });
      }

      const existingUser =
        await authService.findUserByEmail(
          normalizedEmail,
          true
        );

      if (existingUser) {
        return response.status(409).json({
          message:
            existingUser.isArchived
              ? "An archived account already uses this email."
              : "An account with this email already exists",
        });
      }

      let numericEmployeeId:
        | number
        | null = null;

      if (
        employeeId !==
          undefined &&
        employeeId !== null &&
        employeeId !== ""
      ) {
        numericEmployeeId =
          Number(employeeId);

        if (
          !Number.isInteger(
            numericEmployeeId
          ) ||
          numericEmployeeId <= 0
        ) {
          return response.status(400).json({
            message:
              "Invalid employee ID",
          });
        }
      }

      const user =
        await authService.registerUser({
          name:
            name.trim(),

          email:
            normalizedEmail,

          password,

          role:
            UserRole.ADMIN,

          status:
            UserStatus.ACTIVE,

          employeeId:
            numericEmployeeId,
        });

      const token =
        authService.generateToken({
          userId:
            user.id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,
        });

      await auditLogService.recordAuditLogSafely({
        action:
          AuditAction.CREATE,

        entityType:
          AuditEntityType.USER,

        entityId:
          user.id,

        entityName:
          user.name,

        description:
          "Initial administrator account was created.",

        performedBy:
          user.name,

        newData: {
          email:
            user.email,

          role:
            user.role,

          status:
            user.status,
        },
      });

      return response
        .status(201)
        .json({
          message:
            "Administrator account created successfully",

          token,

          user:
            getSafeUser(user),
        });
    } catch (error) {
      console.error(
        "Register error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to register account",
      });
    }
  },

  login: async (
    request: Request,
    response: Response
  ) => {
    try {
      const {
        email,
        password,
      } = request.body;

      const normalizedEmail =
        normalizeEmail(email);

      if (
        !normalizedEmail ||
        !isValidEmail(
          normalizedEmail
        )
      ) {
        return response.status(400).json({
          message:
            "Enter a valid email address",
        });
      }

      if (
        typeof password !==
          "string" ||
        !password
      ) {
        return response.status(400).json({
          message:
            "Password is required",
        });
      }

      const user =
        await authService.findUserByEmail(
          normalizedEmail,
          true
        );

      if (!user) {
        await recordLoginAudit({
          email:
            normalizedEmail,

          success: false,

          reason:
            "Account was not found.",
        });

        return response.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      const accessError =
        getAccountAccessError(
          user
        );

      if (accessError) {
        await recordLoginAudit({
          email:
            normalizedEmail,

          success: false,

          userId:
            user.id,

          userName:
            user.name,

          reason:
            accessError.message,
        });

        return response
          .status(
            accessError.status
          )
          .json({
            message:
              accessError.message,
          });
      }

      const passwordMatches =
        await authService.comparePassword(
          password,
          user.passwordHash
        );

      if (!passwordMatches) {
        await recordLoginAudit({
          email:
            normalizedEmail,

          success: false,

          userId:
            user.id,

          userName:
            user.name,

          reason:
            "Incorrect password.",
        });

        return response.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      const token =
        authService.generateToken({
          userId:
            user.id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,
        });

      await recordLoginAudit({
        email:
          user.email,

        success: true,

        userId:
          user.id,

        userName:
          user.name,
      });

      return response.json({
        message:
          "Login successful",

        token,

        user:
          getSafeUser(user),
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to log in",
      });
    }
  },

  getCurrentUser: async (
    request: Request,
    response: Response
  ) => {
    try {
      const authenticatedUser =
        request.user;

      if (!authenticatedUser) {
        return response.status(401).json({
          message:
            "Not authenticated",
        });
      }

      const user =
        await authService.getUserById(
          authenticatedUser.userId,
          true
        );

      if (!user) {
        return response.status(404).json({
          message:
            "User not found",
        });
      }

      const accessError =
        getAccountAccessError(
          user
        );

      if (accessError) {
        return response
          .status(
            accessError.status
          )
          .json({
            message:
              accessError.message,
          });
      }

      return response.json({
        user:
          getSafeUser(user),
      });
    } catch (error) {
      console.error(
        "Get current user error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to get current user",
      });
    }
  },

  changePassword: async (
    request: Request,
    response: Response
  ) => {
    try {
      const authenticatedUser =
        request.user;

      if (!authenticatedUser) {
        return response.status(401).json({
          message:
            "Not authenticated",
        });
      }

      const {
        currentPassword,
        newPassword,
      } = request.body;

      if (
        typeof currentPassword !==
          "string" ||
        !currentPassword
      ) {
        return response.status(400).json({
          message:
            "Current password is required",
        });
      }

      const passwordError =
        validatePassword(
          newPassword
        );

      if (passwordError) {
        return response.status(400).json({
          message:
            passwordError.replace(
              "Password",
              "New password"
            ),
        });
      }

      if (
        currentPassword ===
        newPassword
      ) {
        return response.status(400).json({
          message:
            "New password must be different from your current password",
        });
      }

      const user =
        await authService.getUserById(
          authenticatedUser.userId,
          true
        );

      if (!user) {
        return response.status(404).json({
          message:
            "User not found",
        });
      }

      const accessError =
        getAccountAccessError(
          user
        );

      if (accessError) {
        return response
          .status(
            accessError.status
          )
          .json({
            message:
              accessError.message,
          });
      }

      const passwordMatches =
        await authService.comparePassword(
          currentPassword,
          user.passwordHash
        );

      if (!passwordMatches) {
        return response.status(401).json({
          message:
            "Current password is incorrect",
        });
      }

      await authService.updatePassword(
        user.id,
        newPassword
      );

      await auditLogService.recordAuditLogSafely({
        action:
          AuditAction.UPDATE,

        entityType:
          AuditEntityType.USER,

        entityId:
          user.id,

        entityName:
          user.name,

        description:
          `Password for ${user.email} was changed.`,

        performedBy:
          getAuthenticatedUserName(
            request
          ),

        newData: {
          passwordChanged:
            true,

          changedAt:
            new Date().toISOString(),
        },
      });

      return response.json({
        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to change password",
      });
    }
  },
};

export default authController;