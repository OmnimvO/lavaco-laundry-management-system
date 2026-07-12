import type {
  Request,
  Response,
} from "express";

import {
  UserRole,
  UserStatus,
} from "../generated/prisma/client.js";

import { employeeService } from "../services/employee.service.js";
import { userService } from "../services/user.service.js";

const VALID_ROLES = new Set<UserRole>(
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
  const rawValue = Array.isArray(value)
    ? value[0]
    : value;

  if (
    rawValue === undefined ||
    rawValue === null ||
    rawValue === ""
  ) {
    return null;
  }

  const numberValue = Number(rawValue);

  if (
    !Number.isInteger(numberValue) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

function normalizeEmail(
  value: unknown
) {
  if (typeof value !== "string") {
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
  if (employeeId === null) {
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
        "Linked employee was not found",
    };
  }

  if (
    employee.status !== "ACTIVE"
  ) {
    return {
      status: 400,
      message:
        "Only an active employee can be linked to a user account",
    };
  }

  const linkedUser =
    await userService.findUserByEmployeeId(
      employeeId
    );

  if (
    linkedUser &&
    linkedUser.id !== currentUserId
  ) {
    return {
      status: 409,
      message:
        "This employee is already linked to another user account",
    };
  }

  return null;
}

export const userController = {
  getAllUsers: async (
    _req: Request,
    res: Response
  ) => {
    try {
      const users =
        await userService.getAllUsers();

      return res.json(users);
    } catch (error) {
      console.error(
        "Get users error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get user accounts",
      });
    }
  },

  getUserById: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          req.params.id
        );

      if (!id) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const user =
        await userService.getUserById(
          id
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User account not found",
        });
      }

      return res.json(user);
    } catch (error) {
      console.error(
        "Get user error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get user account",
      });
    }
  },

  createUser: async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        name,
        email,
        password,
        role = UserRole.STAFF,
        status = UserStatus.ACTIVE,
        employeeId,
      } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          message: "Name is required",
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
        return res.status(400).json({
          message:
            "Enter a valid email address",
        });
      }

      if (
        typeof password !== "string" ||
        password.length < 8
      ) {
        return res.status(400).json({
          message:
            "Password must contain at least 8 characters",
        });
      }

      if (!isUserRole(role)) {
        return res.status(400).json({
          message:
            "Invalid account role",
        });
      }

      if (!isUserStatus(status)) {
        return res.status(400).json({
          message:
            "Invalid account status",
        });
      }

      const existingUser =
        await userService.findUserByEmail(
          normalizedEmail
        );

      if (existingUser) {
        return res.status(409).json({
          message:
            "An account with this email already exists",
        });
      }

      let numericEmployeeId:
        | number
        | null = null;

      if (
        employeeId !== undefined &&
        employeeId !== null &&
        employeeId !== ""
      ) {
        numericEmployeeId =
          parsePositiveInteger(
            employeeId
          );

        if (!numericEmployeeId) {
          return res.status(400).json({
            message:
              "Invalid employee ID",
          });
        }
      }

      const employeeError =
        await validateEmployeeLink(
          numericEmployeeId
        );

      if (employeeError) {
        return res
          .status(employeeError.status)
          .json({
            message:
              employeeError.message,
          });
      }

      const user =
        await userService.createUser({
          name: name.trim(),
          email: normalizedEmail,
          password,
          role,
          status,
          employeeId:
            numericEmployeeId,
        });

      return res
        .status(201)
        .json({
          message:
            "User account created successfully",
          user,
        });
    } catch (error) {
      console.error(
        "Create user error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create user account",
      });
    }
  },

  updateUser: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          req.params.id
        );

      if (!id) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const authenticatedUser =
        req.user;

      if (!authenticatedUser) {
        return res.status(401).json({
          message: "Not authenticated",
        });
      }

      const existingUser =
        await userService.getUserById(
          id
        );

      if (!existingUser) {
        return res.status(404).json({
          message:
            "User account not found",
        });
      }

      const {
        name,
        email,
        role,
        status,
        employeeId,
      } = req.body;

      if (
        name !== undefined &&
        (
          typeof name !== "string" ||
          !name.trim()
        )
      ) {
        return res.status(400).json({
          message:
            "Name cannot be empty",
        });
      }

      let normalizedEmail:
        | string
        | undefined;

      if (email !== undefined) {
        normalizedEmail =
          normalizeEmail(email);

        if (
          !normalizedEmail ||
          !isValidEmail(
            normalizedEmail
          )
        ) {
          return res.status(400).json({
            message:
              "Enter a valid email address",
          });
        }

        const userWithEmail =
          await userService.findUserByEmail(
            normalizedEmail
          );

        if (
          userWithEmail &&
          userWithEmail.id !== id
        ) {
          return res.status(409).json({
            message:
              "An account with this email already exists",
          });
        }
      }

      if (
        role !== undefined &&
        !isUserRole(role)
      ) {
        return res.status(400).json({
          message:
            "Invalid account role",
        });
      }

      if (
        status !== undefined &&
        !isUserStatus(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid account status",
        });
      }

      if (
        authenticatedUser.userId === id &&
        role !== undefined &&
        role !== existingUser.role
      ) {
        return res.status(400).json({
          message:
            "You cannot change your own account role",
        });
      }

      if (
        authenticatedUser.userId === id &&
        status === UserStatus.INACTIVE
      ) {
        return res.status(400).json({
          message:
            "You cannot deactivate your own account",
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
            role !== UserRole.ADMIN
          ) ||
          status ===
            UserStatus.INACTIVE
        );

      if (removesActiveAdmin) {
        const activeAdminCount =
          await userService.countActiveAdmins();

        if (activeAdminCount <= 1) {
          return res.status(400).json({
            message:
              "The last active administrator cannot be demoted or deactivated",
          });
        }
      }

      let normalizedEmployeeId:
        | number
        | null
        | undefined;

      if (employeeId !== undefined) {
        if (
          employeeId === null ||
          employeeId === ""
        ) {
          normalizedEmployeeId = null;
        } else {
          normalizedEmployeeId =
            parsePositiveInteger(
              employeeId
            );

          if (!normalizedEmployeeId) {
            return res.status(400).json({
              message:
                "Invalid employee ID",
            });
          }
        }

        const employeeError =
          await validateEmployeeLink(
            normalizedEmployeeId,
            id
          );

        if (employeeError) {
          return res
            .status(employeeError.status)
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

      return res.json({
        message:
          "User account updated successfully",
        user,
      });
    } catch (error) {
      console.error(
        "Update user error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update user account",
      });
    }
  },

  resetPassword: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          req.params.id
        );

      if (!id) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const {
        newPassword,
      } = req.body;

      if (
        typeof newPassword !==
          "string" ||
        newPassword.length < 8
      ) {
        return res.status(400).json({
          message:
            "New password must contain at least 8 characters",
        });
      }

      const existingUser =
        await userService.getUserById(
          id
        );

      if (!existingUser) {
        return res.status(404).json({
          message:
            "User account not found",
        });
      }

      await userService.resetPassword(
        id,
        newPassword
      );

      return res.json({
        message:
          `Password for ${existingUser.name} was reset successfully`,
      });
    } catch (error) {
      console.error(
        "Reset user password error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to reset user password",
      });
    }
  },

  deleteUser: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          req.params.id
        );

      if (!id) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const authenticatedUser =
        req.user;

      if (!authenticatedUser) {
        return res.status(401).json({
          message: "Not authenticated",
        });
      }

      if (
        authenticatedUser.userId === id
      ) {
        return res.status(400).json({
          message:
            "You cannot delete your own account",
        });
      }

      const existingUser =
        await userService.getUserById(
          id
        );

      if (!existingUser) {
        return res.status(404).json({
          message:
            "User account not found",
        });
      }

      if (
        existingUser.role ===
          UserRole.ADMIN &&
        existingUser.status ===
          UserStatus.ACTIVE
      ) {
        const activeAdminCount =
          await userService.countActiveAdmins();

        if (activeAdminCount <= 1) {
          return res.status(400).json({
            message:
              "The last active administrator cannot be deleted",
          });
        }
      }

      await userService.deleteUser(id);

      return res.json({
        message:
          "User account deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete user account",
      });
    }
  },
};