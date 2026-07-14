import bcrypt from "bcryptjs";
import jwt, {
  type SignOptions,
} from "jsonwebtoken";

import prisma from "../lib/prisma.js";

import {
  UserRole,
  UserStatus,
} from "../generated/prisma/client.js";

const PASSWORD_SALT_ROUNDS = 12;

type RegisterUserData = {
  name: string;
  email: string;
  password: string;

  role?: UserRole;
  status?: UserStatus;

  employeeId?: number | null;
};

export type TokenPayload = {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
};

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not configured."
    );
  }

  return secret;
}

function getJwtExpiration():
  SignOptions["expiresIn"] {
  return (
    process.env.JWT_EXPIRES_IN ??
    "7d"
  ) as SignOptions["expiresIn"];
}

export const authService = {
  countUsers: async () => {
    return prisma.user.count();
  },

  findUserByEmail: async (
    email: string,
    includeArchived = false
  ) => {
    return prisma.user.findFirst({
      where: {
        email: email
          .trim()
          .toLowerCase(),

        ...(includeArchived
          ? {}
          : {
              isArchived: false,
            }),
      },

      include: {
        employee: true,
      },
    });
  },

  getUserById: async (
    id: number,
    includeArchived = false
  ) => {
    return prisma.user.findFirst({
      where: {
        id,

        ...(includeArchived
          ? {}
          : {
              isArchived: false,
            }),
      },

      include: {
        employee: true,
      },
    });
  },

  registerUser: async (
    data: RegisterUserData
  ) => {
    const normalizedEmail =
      data.email
        .trim()
        .toLowerCase();

    const passwordHash =
      await bcrypt.hash(
        data.password,
        PASSWORD_SALT_ROUNDS
      );

    return prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash,

        role:
          data.role ??
          UserRole.STAFF,

        status:
          data.status ??
          UserStatus.ACTIVE,

        employeeId:
          data.employeeId ?? null,
      },

      include: {
        employee: true,
      },
    });
  },

  comparePassword: async (
    plainPassword: string,
    passwordHash: string
  ) => {
    return bcrypt.compare(
      plainPassword,
      passwordHash
    );
  },

  updatePassword: async (
    userId: number,
    newPassword: string
  ) => {
    const passwordHash =
      await bcrypt.hash(
        newPassword,
        PASSWORD_SALT_ROUNDS
      );

    return prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        passwordHash,
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        employeeId: true,
        isArchived: true,
        updatedAt: true,
      },
    });
  },

  generateToken: (
    payload: TokenPayload
  ) => {
    return jwt.sign(
      payload,
      getJwtSecret(),
      {
        expiresIn:
          getJwtExpiration(),
      }
    );
  },

  verifyToken: (
    token: string
  ) => {
    return jwt.verify(
      token,
      getJwtSecret()
    ) as TokenPayload;
  },
};