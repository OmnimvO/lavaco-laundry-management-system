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
  employeeService,
} from "../services/employee.service.js";

import {
  userService,
} from "../services/user.service.js";

import {
  auditLogService,
} from "../services/auditLog.service.js";

import {
  getAuthenticatedUserId,
  getAuthenticatedUserName,
} from "../utils/authUser.js";

const VALID_ROLES =
  new Set<UserRole>(
    Object.values(UserRole)
  );

const VALID_STATUSES =
  new Set<UserStatus>(
    Object.values(UserStatus)
  );

function parsePositiveInteger(
  value:
    | string
    | string[]
    | number
    | undefined
    | null
) {
  const rawValue =
    Array.isArray(value)
      ? value[0]
      : value;

  if (
    rawValue === undefined ||
    rawValue === null ||
    rawValue === ""
  ) {
    return null;
  }

  const numberValue =
    Number(rawValue);

  return (
    Number.isInteger(
      numberValue
    ) &&
    numberValue > 0
      ? numberValue
      : null
  );
}

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

function isUserRole(
  value: unknown
): value is UserRole {
  return (
    typeof value === "string" &&
    VALID_ROLES.has(
      value as UserRole
    )
  );
}

function isUserStatus(
  value: unknown
): value is UserStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.has(
      value as UserStatus
    )
  );
}

async function validateEmployeeLink(
  employeeId: number | null,
  currentUserId?: number
) {
  if (
    employeeId === null
  ) {
    return null;
  }

  const employee =
    await employeeService.getEmployeeById(
      employeeId
    );

  if (!employee) {
    return {
      status: 404,
      message:
        "Linked employee was not found or is archived.",
    };
  }

  if (
    employee.status !==
    "ACTIVE"
  ) {
    return {
      status: 400,
      message:
        "Only an active employee can be linked to a user account.",
    };
  }

  const linkedUser =
    await userService.findUserByEmployeeId(
      employeeId
    );

  if (
    linkedUser &&
    linkedUser.id !==
      currentUserId
  ) {
    return {
      status: 409,
      message:
        "This employee is already linked to another user account.",
    };
  }

  return null;
}

export const userController = {
  getAllUsers: async (
    _request: Request,
    response: Response
  ) => {
    try {
      const users =
        await userService.getAllUsers();

      return response.json(
        users
      );
    } catch (error) {
      console.error(
        "Get users error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to get user accounts.",
      });
    }
  },

  getUserById: async (
    request: Request,
    response: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          request.params.id
        );

      if (!id) {
        return response.status(400).json({
          message:
            "Invalid user ID.",
        });
      }

      const user =
        await userService.getUserById(
          id
        );

      if (!user) {
        return response.status(404).json({
          message:
            "User account was not found.",
        });
      }

      return response.json(user);
    } catch (error) {
      console.error(
        "Get user error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to get user account.",
      });
    }
  },

  createUser: async (
    request: Request,
    response: Response
  ) => {
    try {
      const {
        name,
        email,
        password,
        role =
          UserRole.STAFF,
        status =
          UserStatus.ACTIVE,
        employeeId,
      } = request.body;

      if (
        typeof name !==
          "string" ||
        !name.trim()
      ) {
        return response.status(400).json({
          message:
            "Name is required.",
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
            "Enter a valid email address.",
        });
      }

      if (
        typeof password !==
          "string" ||
        password.length < 8
      ) {
        return response.status(400).json({
          message:
            "Password must contain at least 8 characters.",
        });
      }

      if (!isUserRole(role)) {
        return response.status(400).json({
          message:
            "Invalid account role.",
        });
      }

      if (
        !isUserStatus(status)
      ) {
        return response.status(400).json({
          message:
            "Invalid account status.",
        });
      }

      const existingUser =
        await userService.findUserByEmail(
          normalizedEmail,
          true
        );

      if (existingUser) {
        return response.status(409).json({
          message:
            existingUser.isArchived
              ? "An archived account already uses this email. Restore that account instead."
              : "An account with this email already exists.",
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
          parsePositiveInteger(
            employeeId
          );

        if (!numericEmployeeId) {
          return response.status(400).json({
            message:
              "Invalid employee ID.",
          });
        }
      }

      const employeeError =
        await validateEmployeeLink(
          numericEmployeeId
        );

      if (employeeError) {
        return response
          .status(
            employeeError.status
          )
          .json({
            message:
              employeeError.message,
          });
      }

      const user =
        await userService.createUser({
          name:
            name.trim(),

          email:
            normalizedEmail,

          password,
          role,
          status,

          employeeId:
            numericEmployeeId,
        });

      const performedBy =
        getAuthenticatedUserName(
          request
        );

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
          `User account ${user.email} was created.`,

        performedBy,

        newData: {
          name:
            user.name,

          email:
            user.email,

          role:
            user.role,

          status:
            user.status,

          employeeId:
            user.employeeId,
        },
      });

      return response
        .status(201)
        .json({
          message:
            "User account created successfully.",

          user,
        });
    } catch (error) {
      console.error(
        "Create user error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to create user account.",
      });
    }
  },

  updateUser: async (
    request: Request,
    response: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          request.params.id
        );

      if (!id) {
        return response.status(400).json({
          message:
            "Invalid user ID.",
        });
      }

      const authenticatedUserId =
        getAuthenticatedUserId(
          request
        );

      if (!authenticatedUserId) {
        return response.status(401).json({
          message:
            "Not authenticated.",
        });
      }

      const existingUser =
        await userService.getUserById(
          id
        );

      if (!existingUser) {
        return response.status(404).json({
          message:
            "User account was not found.",
        });
      }

      const {
        name,
        email,
        role,
        status,
        employeeId,
      } = request.body;

      if (
        name !== undefined &&
        (
          typeof name !==
            "string" ||
          !name.trim()
        )
      ) {
        return response.status(400).json({
          message:
            "Name cannot be empty.",
        });
      }

      let normalizedEmail:
        | string
        | undefined;

      if (
        email !== undefined
      ) {
        normalizedEmail =
          normalizeEmail(email);

        if (
          !normalizedEmail ||
          !isValidEmail(
            normalizedEmail
          )
        ) {
          return response.status(400).json({
            message:
              "Enter a valid email address.",
          });
        }

        const userWithEmail =
          await userService.findUserByEmail(
            normalizedEmail,
            true
          );

        if (
          userWithEmail &&
          userWithEmail.id !== id
        ) {
          return response.status(409).json({
            message:
              "Another account already uses this email.",
          });
        }
      }

      if (
        role !== undefined &&
        !isUserRole(role)
      ) {
        return response.status(400).json({
          message:
            "Invalid account role.",
        });
      }

      if (
        status !== undefined &&
        !isUserStatus(status)
      ) {
        return response.status(400).json({
          message:
            "Invalid account status.",
        });
      }

      if (
        authenticatedUserId === id &&
        role !== undefined &&
        role !==
          existingUser.role
      ) {
        return response.status(400).json({
          message:
            "You cannot change your own account role.",
        });
      }

      if (
        authenticatedUserId === id &&
        status ===
          UserStatus.INACTIVE
      ) {
        return response.status(400).json({
          message:
            "You cannot deactivate your own account.",
        });
      }

      const removesActiveAdmin =
        existingUser.role ===
          UserRole.ADMIN &&
        existingUser.status ===
          UserStatus.ACTIVE &&
        (
          (
            role !== undefined &&
            role !==
              UserRole.ADMIN
          ) ||
          status ===
            UserStatus.INACTIVE
        );

      if (removesActiveAdmin) {
        const remainingAdmins =
          await userService.countActiveAdmins(
            id
          );

        if (
          remainingAdmins < 1
        ) {
          return response.status(400).json({
            message:
              "The last active administrator cannot be demoted or deactivated.",
          });
        }
      }

      let normalizedEmployeeId:
        | number
        | null
        | undefined;

      if (
        employeeId !==
        undefined
      ) {
        if (
          employeeId === null ||
          employeeId === ""
        ) {
          normalizedEmployeeId =
            null;
        } else {
          normalizedEmployeeId =
            parsePositiveInteger(
              employeeId
            );

          if (
            !normalizedEmployeeId
          ) {
            return response.status(400).json({
              message:
                "Invalid employee ID.",
            });
          }
        }

        const employeeError =
          await validateEmployeeLink(
            normalizedEmployeeId,
            id
          );

        if (employeeError) {
          return response
            .status(
              employeeError.status
            )
            .json({
              message:
                employeeError.message,
            });
        }
      }

      const user =
        await userService.updateUser(
          id,
          {
            name:
              name !== undefined
                ? name.trim()
                : undefined,

            email:
              normalizedEmail,

            role,
            status,

            employeeId:
              normalizedEmployeeId,
          }
        );

      const performedBy =
        getAuthenticatedUserName(
          request
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
          `User account ${user.email} was updated.`,

        performedBy,

        previousData: {
          name:
            existingUser.name,

          email:
            existingUser.email,

          role:
            existingUser.role,

          status:
            existingUser.status,

          employeeId:
            existingUser.employeeId,
        },

        newData: {
          name:
            user.name,

          email:
            user.email,

          role:
            user.role,

          status:
            user.status,

          employeeId:
            user.employeeId,
        },
      });

      return response.json({
        message:
          "User account updated successfully.",

        user,
      });
    } catch (error) {
      console.error(
        "Update user error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to update user account.",
      });
    }
  },

  resetPassword: async (
    request: Request,
    response: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          request.params.id
        );

      if (!id) {
        return response.status(400).json({
          message:
            "Invalid user ID.",
        });
      }

      const {
        newPassword,
      } = request.body;

      if (
        typeof newPassword !==
          "string" ||
        newPassword.length < 8
      ) {
        return response.status(400).json({
          message:
            "New password must contain at least 8 characters.",
        });
      }

      const existingUser =
        await userService.getUserById(
          id
        );

      if (!existingUser) {
        return response.status(404).json({
          message:
            "User account was not found.",
        });
      }

      const user =
        await userService.resetPassword(
          id,
          newPassword
        );

      const performedBy =
        getAuthenticatedUserName(
          request
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
          `Password for ${user.email} was reset.`,

        performedBy,

        newData: {
          passwordReset: true,
        },
      });

      return response.json({
        message:
          `Password for ${existingUser.name} was reset successfully.`,
      });
    } catch (error) {
      console.error(
        "Reset user password error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to reset user password.",
      });
    }
  },

  deleteUser: async (
    request: Request,
    response: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          request.params.id
        );

      if (!id) {
        return response.status(400).json({
          message:
            "Invalid user ID.",
        });
      }

      const authenticatedUserId =
        getAuthenticatedUserId(
          request
        );

      if (!authenticatedUserId) {
        return response.status(401).json({
          message:
            "Not authenticated.",
        });
      }

      if (
        authenticatedUserId === id
      ) {
        return response.status(400).json({
          message:
            "You cannot archive your own account.",
        });
      }

      const existingUser =
        await userService.getUserById(
          id
        );

      if (!existingUser) {
        return response.status(404).json({
          message:
            "User account was not found.",
        });
      }

      if (
        existingUser.role ===
          UserRole.ADMIN &&
        existingUser.status ===
          UserStatus.ACTIVE
      ) {
        const remainingAdmins =
          await userService.countActiveAdmins(
            id
          );

        if (
          remainingAdmins < 1
        ) {
          return response.status(400).json({
            message:
              "The last active administrator cannot be archived.",
          });
        }
      }

      const performedBy =
        getAuthenticatedUserName(
          request
        );

      const user =
        await userService.archiveUser(
          id,
          performedBy
        );

      await auditLogService.recordAuditLogSafely({
        action:
          AuditAction.ARCHIVE,

        entityType:
          AuditEntityType.USER,

        entityId:
          user.id,

        entityName:
          user.name,

        description:
          `User account ${user.email} was archived.`,

        performedBy,

        previousData: {
          status:
            existingUser.status,

          isArchived:
            existingUser.isArchived,
        },

        newData: {
          status:
            user.status,

          isArchived:
            user.isArchived,

          archivedAt:
            user.archivedAt
              ?.toISOString(),

          archivedBy:
            user.archivedBy,
        },
      });

      return response.json({
        message:
          "User account archived successfully.",

        user,
      });
    } catch (error) {
      console.error(
        "Archive user error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to archive user account.",
      });
    }
  },
};

export default userController;