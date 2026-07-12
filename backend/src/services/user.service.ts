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

export const userService = {
  getAllUsers: async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        employeeId: true,
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
          },
        },
      },

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
    id: number
  ) => {
    return prisma.user.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        employeeId: true,
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
          },
        },
      },
    });
  },

  findUserByEmail: async (
    email: string
  ) => {
    return prisma.user.findUnique({
      where: {
        email: email
          .trim()
          .toLowerCase(),
      },
    });
  },

  findUserByEmployeeId: async (
    employeeId: number
  ) => {
    return prisma.user.findUnique({
      where: {
        employeeId,
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

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        employeeId: true,
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
          },
        },
      },
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

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        employeeId: true,
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
          },
        },
      },
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

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        employeeId: true,
        updatedAt: true,
      },
    });
  },

  deleteUser: async (
    id: number
  ) => {
    return prisma.user.delete({
      where: {
        id,
      },
    });
  },

  countActiveAdmins: async () => {
    return prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
  },
};