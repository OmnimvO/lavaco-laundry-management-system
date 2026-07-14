import bcrypt from "bcryptjs";

import prisma from "../lib/prisma.js";

import {
  UserRole,
  UserStatus,
} from "../generated/prisma/client.js";

const PASSWORD_SALT_ROUNDS = 12;

type CreateUserData = {
  name: string;
  email: string;
  password: string;

  role: UserRole;
  status?: UserStatus;

  employeeId?: number | null;
};

type UpdateUserData = {
  name?: string;
  email?: string;

  role?: UserRole;
  status?: UserStatus;

  employeeId?: number | null;
};

const userSelection = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  employeeId: true,

  isArchived: true,
  archivedAt: true,
  archivedBy: true,

  createdAt: true,
  updatedAt: true,

  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      position: true,
      status: true,
      isArchived: true,
    },
  },
} as const;

export const userService = {
  getAllUsers: async () => {
    return prisma.user.findMany({
      where: {
        isArchived: false,
      },

      select: userSelection,

      orderBy: [
        {
          status: "asc",
        },
        {
          name: "asc",
        },
      ],
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

      select: userSelection,
    });
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
    });
  },

  findUserByEmployeeId: async (
    employeeId: number,
    includeArchived = false
  ) => {
    return prisma.user.findFirst({
      where: {
        employeeId,

        ...(includeArchived
          ? {}
          : {
              isArchived: false,
            }),
      },
    });
  },

  createUser: async (
    data: CreateUserData
  ) => {
    const passwordHash =
      await bcrypt.hash(
        data.password,
        PASSWORD_SALT_ROUNDS
      );

    return prisma.user.create({
      data: {
        name: data.name.trim(),

        email: data.email
          .trim()
          .toLowerCase(),

        passwordHash,

        role: data.role,

        status:
          data.status ??
          UserStatus.ACTIVE,

        employeeId:
          data.employeeId ?? null,
      },

      select: userSelection,
    });
  },

  updateUser: async (
    id: number,
    data: UpdateUserData
  ) => {
    return prisma.user.update({
      where: {
        id,
      },

      data: {
        name:
          data.name !== undefined
            ? data.name.trim()
            : undefined,

        email:
          data.email !== undefined
            ? data.email
                .trim()
                .toLowerCase()
            : undefined,

        role:
          data.role,

        status:
          data.status,

        employeeId:
          data.employeeId,
      },

      select: userSelection,
    });
  },

  resetPassword: async (
    id: number,
    newPassword: string
  ) => {
    const passwordHash =
      await bcrypt.hash(
        newPassword,
        PASSWORD_SALT_ROUNDS
      );

    return prisma.user.update({
      where: {
        id,
      },

      data: {
        passwordHash,
      },

      select: userSelection,
    });
  },

  archiveUser: async (
    id: number,
    archivedBy: string
  ) => {
    return prisma.user.update({
      where: {
        id,
      },

      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
        status:
          UserStatus.INACTIVE,
      },

      select: userSelection,
    });
  },

  restoreUser: async (
    id: number
  ) => {
    return prisma.user.update({
      where: {
        id,
      },

      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        status:
          UserStatus.ACTIVE,
      },

      select: userSelection,
    });
  },

  countActiveAdmins: async (
    excludeUserId?: number
  ) => {
    return prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        status:
          UserStatus.ACTIVE,
        isArchived: false,

        ...(excludeUserId
          ? {
              id: {
                not:
                  excludeUserId,
              },
            }
          : {}),
      },
    });
  },
};