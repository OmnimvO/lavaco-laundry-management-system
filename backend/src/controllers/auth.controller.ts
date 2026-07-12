import type {
  Request,
  Response,
} from "express";

import {
  UserRole,
  UserStatus,
} from "../generated/prisma/client.js";

import { authService } from "../services/auth.service.js";

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

function validatePassword(
  password: unknown
) {
  if (typeof password !== "string") {
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
    employeeId: user.employeeId,
    employee:
      user.employee ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const authController = {
  register: async (
    req: Request,
    res: Response
  ) => {
    try {
      const userCount =
        await authService.countUsers();

      if (userCount > 0) {
        return res.status(403).json({
          message:
            "Public registration is disabled. Ask an administrator to create your account.",
        });
      }

      const {
        name,
        email,
        password,
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

      const passwordError =
        validatePassword(password);

      if (passwordError) {
        return res.status(400).json({
          message: passwordError,
        });
      }

      const existingUser =
        await authService.findUserByEmail(
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
          Number(employeeId);

        if (
          !Number.isInteger(
            numericEmployeeId
          ) ||
          numericEmployeeId <= 0
        ) {
          return res.status(400).json({
            message:
              "Invalid employee ID",
          });
        }
      }

      const user =
        await authService.registerUser({
          name: name.trim(),
          email: normalizedEmail,
          password,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          employeeId:
            numericEmployeeId,
        });

      const token =
        authService.generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        });

      return res.status(201).json({
        message:
          "Administrator account created successfully",

        token,
        user: getSafeUser(user),
      });
    } catch (error) {
      console.error(
        "Register error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to register account",
      });
    }
  },

  login: async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        email,
        password,
      } = req.body;

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
        !password
      ) {
        return res.status(400).json({
          message:
            "Password is required",
        });
      }

      const user =
        await authService.findUserByEmail(
          normalizedEmail
        );

      if (!user) {
        return res.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      if (
        user.status !==
        UserStatus.ACTIVE
      ) {
        return res.status(403).json({
          message:
            "This account is inactive",
        });
      }

      if (
        user.employee &&
        user.employee.status !==
          "ACTIVE"
      ) {
        return res.status(403).json({
          message:
            "The linked employee record is inactive",
        });
      }

      const passwordMatches =
        await authService.comparePassword(
          password,
          user.passwordHash
        );

      if (!passwordMatches) {
        return res.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      const token =
        authService.generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        });

      return res.json({
        message:
          "Login successful",
        token,
        user: getSafeUser(user),
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to log in",
      });
    }
  },

  getCurrentUser: async (
    req: Request,
    res: Response
  ) => {
    try {
      const authenticatedUser =
        req.user;

      if (!authenticatedUser) {
        return res.status(401).json({
          message:
            "Not authenticated",
        });
      }

      const user =
        await authService.getUserById(
          authenticatedUser.userId
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      if (
        user.status !==
        UserStatus.ACTIVE
      ) {
        return res.status(403).json({
          message:
            "This account is inactive",
        });
      }

      if (
        user.employee &&
        user.employee.status !==
          "ACTIVE"
      ) {
        return res.status(403).json({
          message:
            "The linked employee record is inactive",
        });
      }

      return res.json({
        user: getSafeUser(user),
      });
    } catch (error) {
      console.error(
        "Get current user error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get current user",
      });
    }
  },

  changePassword: async (
    req: Request,
    res: Response
  ) => {
    try {
      const authenticatedUser =
        req.user;

      if (!authenticatedUser) {
        return res.status(401).json({
          message:
            "Not authenticated",
        });
      }

      const {
        currentPassword,
        newPassword,
      } = req.body;

      if (
        typeof currentPassword !==
          "string" ||
        !currentPassword
      ) {
        return res.status(400).json({
          message:
            "Current password is required",
        });
      }

      const passwordError =
        validatePassword(newPassword);

      if (passwordError) {
        return res.status(400).json({
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
        return res.status(400).json({
          message:
            "New password must be different from your current password",
        });
      }

      const user =
        await authService.getUserById(
          authenticatedUser.userId
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      if (
        user.status !==
        UserStatus.ACTIVE
      ) {
        return res.status(403).json({
          message:
            "This account is inactive",
        });
      }

      const passwordMatches =
        await authService.comparePassword(
          currentPassword,
          user.passwordHash
        );

      if (!passwordMatches) {
        return res.status(401).json({
          message:
            "Current password is incorrect",
        });
      }

      await authService.updatePassword(
        user.id,
        newPassword
      );

      return res.json({
        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to change password",
      });
    }
  },
};