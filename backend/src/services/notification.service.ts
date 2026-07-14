import prisma from "../lib/prisma.js";

import {
  AuditEntityType,
  NotificationType,
  UserRole,
} from "../generated/prisma/client.js";

type CreateNotificationData = {
  type: NotificationType;
  title: string;
  message: string;
  targetRole?: UserRole | null;
  targetUserId?: number | null;
  relatedEntityType?: AuditEntityType | null;
  relatedEntityId?: number | null;
};

export const notificationService = {
  createNotification: async (
    data: CreateNotificationData
  ) => {
    return prisma.notification.create({
      data: {
        type: data.type,
        title: data.title.trim(),
        message: data.message.trim(),

        targetRole:
          data.targetRole ?? null,

        targetUserId:
          data.targetUserId ?? null,

        relatedEntityType:
          data.relatedEntityType ?? null,

        relatedEntityId:
          data.relatedEntityId ?? null,
      },
    });
  },

  createTankNotificationIfMissing:
    async (
      type: NotificationType,
      tankCycleId: number,
      title: string,
      message: string
    ) => {
      const existing =
        await prisma.notification.findFirst({
          where: {
            type,

            relatedEntityType:
              AuditEntityType.TANK_CYCLE,

            relatedEntityId:
              tankCycleId,

            isResolved: false,
          },
        });

      if (existing) {
        return existing;
      }

      return prisma.notification.create({
        data: {
          type,
          title,
          message,

          relatedEntityType:
            AuditEntityType.TANK_CYCLE,

          relatedEntityId:
            tankCycleId,
        },
      });
    },

  createInventoryNotificationIfMissing:
    async (
      inventoryItemId: number,
      title: string,
      message: string
    ) => {
      const existing =
        await prisma.notification.findFirst({
          where: {
            type:
              NotificationType.LOW_INVENTORY,

            relatedEntityType:
              AuditEntityType.INVENTORY,

            relatedEntityId:
              inventoryItemId,

            isResolved: false,
          },
        });

      if (existing) {
        return prisma.notification.update({
          where: {
            id: existing.id,
          },

          data: {
            title:
              title.trim(),

            message:
              message.trim(),
          },
        });
      }

      return prisma.notification.create({
        data: {
          type:
            NotificationType.LOW_INVENTORY,

          title:
            title.trim(),

          message:
            message.trim(),

          relatedEntityType:
            AuditEntityType.INVENTORY,

          relatedEntityId:
            inventoryItemId,
        },
      });
    },

  resolveInventoryNotifications:
    async (
      inventoryItemId: number,
      resolvedBy: string
    ) => {
      return prisma.notification.updateMany({
        where: {
          type:
            NotificationType.LOW_INVENTORY,

          relatedEntityType:
            AuditEntityType.INVENTORY,

          relatedEntityId:
            inventoryItemId,

          isResolved: false,
        },

        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy:
            resolvedBy.trim() ||
            "System",
        },
      });
    },

  getNotificationsForUser: async (
    userId: number,
    role: UserRole
  ) => {
    return prisma.notification.findMany({
      where: {
        OR: [
          {
            targetUserId:
              userId,
          },
          {
            targetUserId: null,
            targetRole:
              role,
          },
          {
            targetUserId: null,
            targetRole: null,
          },
        ],
      },

      include: {
        reads: {
          where: {
            userId,
          },

          select: {
            readAt: true,
          },
        },
      },

      orderBy: [
        {
          isResolved: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });
  },

  markAsRead: async (
    notificationId: number,
    userId: number
  ) => {
    const notification =
      await prisma.notification.findUnique({
        where: {
          id: notificationId,
        },
      });

    if (!notification) {
      throw new Error(
        "Notification was not found."
      );
    }

    return prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },

      update: {
        readAt: new Date(),
      },

      create: {
        notificationId,
        userId,
      },
    });
  },

  markAllAsRead: async (
    userId: number,
    role: UserRole
  ) => {
    const notifications =
      await prisma.notification.findMany({
        where: {
          OR: [
            {
              targetUserId:
                userId,
            },
            {
              targetUserId: null,
              targetRole:
                role,
            },
            {
              targetUserId: null,
              targetRole: null,
            },
          ],
        },

        select: {
          id: true,
        },
      });

    if (
      notifications.length === 0
    ) {
      return {
        updatedCount: 0,
      };
    }

    await prisma.$transaction(
      notifications.map(
        (notification) =>
          prisma.notificationRead.upsert({
            where: {
              notificationId_userId: {
                notificationId:
                  notification.id,

                userId,
              },
            },

            update: {
              readAt: new Date(),
            },

            create: {
              notificationId:
                notification.id,

              userId,
            },
          })
      )
    );

    return {
      updatedCount:
        notifications.length,
    };
  },

  resolveTankCycleNotifications:
    async (
      tankCycleId: number,
      resolvedBy: string
    ) => {
      return prisma.notification.updateMany({
        where: {
          relatedEntityType:
            AuditEntityType.TANK_CYCLE,

          relatedEntityId:
            tankCycleId,

          isResolved: false,
        },

        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy:
            resolvedBy.trim() ||
            "System",
        },
      });
    },
};