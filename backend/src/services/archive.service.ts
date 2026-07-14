import prisma from "../lib/prisma.js";

import {
  EmployeeStatus,
  OrderStatus,
  UserStatus,
} from "../generated/prisma/client.js";

export type ArchiveEntityType =
  | "CUSTOMER"
  | "EMPLOYEE"
  | "ORDER"
  | "INVENTORY"
  | "USER";

function getArchiveData(
  archivedBy: string
) {
  return {
    isArchived: true,
    archivedAt: new Date(),
    archivedBy:
      archivedBy.trim() ||
      "System",
  };
}

function getRestoreData() {
  return {
    isArchived: false,
    archivedAt: null,
    archivedBy: null,
  };
}

export const archiveService = {
  getArchiveSummary: async () => {
    const [
      customers,
      employees,
      orders,
      inventory,
      users,
    ] = await Promise.all([
      prisma.customer.count({
        where: {
          isArchived: true,
        },
      }),

      prisma.employee.count({
        where: {
          isArchived: true,
        },
      }),

      prisma.order.count({
        where: {
          isArchived: true,
        },
      }),

      prisma.inventoryItem.count({
        where: {
          isArchived: true,
        },
      }),

      prisma.user.count({
        where: {
          isArchived: true,
        },
      }),
    ]);

    return {
      customers,
      employees,
      orders,
      inventory,
      users,

      total:
        customers +
        employees +
        orders +
        inventory +
        users,
    };
  },

  getArchivedRecords: async (
    entityType: ArchiveEntityType
  ) => {
    switch (entityType) {
      case "CUSTOMER":
        return prisma.customer.findMany({
          where: {
            isArchived: true,
          },

          include: {
            _count: {
              select: {
                orders: true,
              },
            },
          },

          orderBy: {
            archivedAt: "desc",
          },
        });

      case "EMPLOYEE":
        return prisma.employee.findMany({
          where: {
            isArchived: true,
          },

          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                isArchived: true,
              },
            },
          },

          orderBy: {
            archivedAt: "desc",
          },
        });

      case "ORDER":
        return prisma.order.findMany({
          where: {
            isArchived: true,
          },

          include: {
            customer: true,
          },

          orderBy: {
            archivedAt: "desc",
          },
        });

      case "INVENTORY":
        return prisma.inventoryItem.findMany({
          where: {
            isArchived: true,
          },

          include: {
            _count: {
              select: {
                movements: true,
              },
            },
          },

          orderBy: {
            archivedAt: "desc",
          },
        });

      case "USER":
        return prisma.user.findMany({
          where: {
            isArchived: true,
          },

          select: {
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
                status: true,
                isArchived: true,
              },
            },
          },

          orderBy: {
            archivedAt: "desc",
          },
        });
    }
  },

  getArchivedRecordById: async (
    entityType: ArchiveEntityType,
    id: number
  ) => {
    switch (entityType) {
      case "CUSTOMER":
        return prisma.customer.findFirst({
          where: {
            id,
            isArchived: true,
          },
        });

      case "EMPLOYEE":
        return prisma.employee.findFirst({
          where: {
            id,
            isArchived: true,
          },
        });

      case "ORDER":
        return prisma.order.findFirst({
          where: {
            id,
            isArchived: true,
          },
        });

      case "INVENTORY":
        return prisma.inventoryItem.findFirst({
          where: {
            id,
            isArchived: true,
          },
        });

      case "USER":
        return prisma.user.findFirst({
          where: {
            id,
            isArchived: true,
          },
        });
    }
  },

  archiveRecord: async (
    entityType: ArchiveEntityType,
    id: number,
    archivedBy: string
  ) => {
    switch (entityType) {
      case "CUSTOMER":
        return prisma.customer.update({
          where: {
            id,
          },

          data:
            getArchiveData(
              archivedBy
            ),
        });

      case "EMPLOYEE":
        return prisma.employee.update({
          where: {
            id,
          },

          data: {
            ...getArchiveData(
              archivedBy
            ),

            status:
              EmployeeStatus.INACTIVE,
          },
        });

      case "ORDER":
        return prisma.order.update({
          where: {
            id,
          },

          data:
            getArchiveData(
              archivedBy
            ),
        });

      case "INVENTORY":
        return prisma.inventoryItem.update({
          where: {
            id,
          },

          data: {
            ...getArchiveData(
              archivedBy
            ),

            isActive: false,
          },
        });

      case "USER":
        return prisma.user.update({
          where: {
            id,
          },

          data: {
            ...getArchiveData(
              archivedBy
            ),

            status:
              UserStatus.INACTIVE,
          },
        });
    }
  },

  restoreRecord: async (
    entityType: ArchiveEntityType,
    id: number
  ) => {
    switch (entityType) {
      case "CUSTOMER":
        return prisma.customer.update({
          where: {
            id,
          },

          data:
            getRestoreData(),
        });

      case "EMPLOYEE":
        return prisma.employee.update({
          where: {
            id,
          },

          data: {
            ...getRestoreData(),

            status:
              EmployeeStatus.ACTIVE,
          },
        });

      case "ORDER": {
        const order =
          await prisma.order.findUnique({
            where: {
              id,
            },
          });

        if (!order) {
          throw new Error(
            "Order was not found."
          );
        }

        return prisma.order.update({
          where: {
            id,
          },

          data:
            getRestoreData(),
        });
      }

      case "INVENTORY":
        return prisma.inventoryItem.update({
          where: {
            id,
          },

          data: {
            ...getRestoreData(),

            isActive: true,
          },
        });

      case "USER":
        return prisma.user.update({
          where: {
            id,
          },

          data: {
            ...getRestoreData(),

            status:
              UserStatus.ACTIVE,
          },
        });
    }
  },

  canRestoredOrderCountAsRevenue: async (
    id: number
  ) => {
    const order =
      await prisma.order.findUnique({
        where: {
          id,
        },

        select: {
          status: true,
        },
      });

    if (!order) {
      return false;
    }

    return (
      order.status !==
      OrderStatus.CANCELLED
    );
  },
};