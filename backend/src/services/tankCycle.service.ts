import prisma from "../lib/prisma.js";

import {
  AuditEntityType,
  NotificationType,
  TankCycleStatus,
} from "../generated/prisma/client.js";

import {
  notificationService,
} from "./notification.service.js";

async function getTankConfiguration() {
  const settings =
    await prisma.shopSettings.upsert({
      where: {
        id: 1,
      },

      update: {},

      create: {
        id: 1,
      },
    });

  return {
    maximumLoads:
      settings.maximumLoadsPerTankCycle,

    warningThreshold:
      settings.tankWarningThreshold,
  };
}

async function ensureActiveCycle() {
  const existing =
    await prisma.tankCycle.findFirst({
      where: {
        status:
          TankCycleStatus.ACTIVE,
      },

      orderBy: {
        startedAt: "desc",
      },
    });

  if (existing) {
    return existing;
  }

  const configuration =
    await getTankConfiguration();

  return prisma.tankCycle.create({
    data: {
      maximumLoads:
        configuration.maximumLoads,
    },
  });
}

async function synchronizeTankNotifications(
  tankCycleId: number,
  resolvedBy = "System"
) {
  const [
    cycle,
    configuration,
  ] = await Promise.all([
    prisma.tankCycle.findUnique({
      where: {
        id: tankCycleId,
      },
    }),

    getTankConfiguration(),
  ]);

  if (!cycle) {
    return;
  }

  if (
    cycle.status !==
    TankCycleStatus.ACTIVE
  ) {
    await notificationService
      .resolveTankCycleNotifications(
        cycle.id,
        resolvedBy
      );

    return;
  }

  if (
    cycle.currentLoads >=
    cycle.maximumLoads
  ) {
    await notificationService
      .createTankNotificationIfMissing(
        NotificationType.TANK_REPLACEMENT_REQUIRED,
        cycle.id,
        "Tank replacement required",
        `The current tank has reached ${cycle.currentLoads} of ${cycle.maximumLoads} loads. Replace the tank and confirm the replacement in Operations Settings.`
      );

    return;
  }

  if (
    cycle.currentLoads >=
    configuration.warningThreshold
  ) {
    await notificationService
      .createTankNotificationIfMissing(
        NotificationType.TANK_WARNING,
        cycle.id,
        "Tank replacement approaching",
        `The current tank has reached ${cycle.currentLoads} of ${cycle.maximumLoads} loads.`
      );

    await prisma.notification.updateMany({
      where: {
        type:
          NotificationType.TANK_REPLACEMENT_REQUIRED,

        relatedEntityType:
          AuditEntityType.TANK_CYCLE,

        relatedEntityId:
          cycle.id,

        isResolved:
          false,
      },

      data: {
        isResolved:
          true,

        resolvedAt:
          new Date(),

        resolvedBy,
      },
    });

    return;
  }

  await notificationService
    .resolveTankCycleNotifications(
      cycle.id,
      resolvedBy
    );
}

export const tankCycleService = {
  getCurrentCycle: async () => {
    return ensureActiveCycle();
  },

  getTankStatus: async () => {
    const cycle =
      await ensureActiveCycle();

    const remainingLoads =
      Math.max(
        0,
        cycle.maximumLoads -
          cycle.currentLoads
      );

    const percentage =
      cycle.maximumLoads > 0
        ? (
            cycle.currentLoads /
            cycle.maximumLoads
          ) * 100
        : 0;

    let status:
      | "NORMAL"
      | "WARNING"
      | "REPLACEMENT_REQUIRED";

    const configuration =
      await getTankConfiguration();

    if (
      cycle.currentLoads >=
      cycle.maximumLoads
    ) {
      status =
        "REPLACEMENT_REQUIRED";
    } else if (
      cycle.currentLoads >=
      configuration.warningThreshold
    ) {
      status =
        "WARNING";
    } else {
      status =
        "NORMAL";
    }

    return {
      ...cycle,

      remainingLoads,

      percentage,

      displayStatus:
        status,

      warningThreshold:
        configuration.warningThreshold,

      replacementRequired:
        cycle.currentLoads >=
        cycle.maximumLoads,
    };
  },

  getHistory: async () => {
    return prisma.tankCycle.findMany({
      where: {
        status:
          TankCycleStatus.REPLACED,
      },

      include: {
        _count: {
          select: {
            loadEntries:
              true,
          },
        },
      },

      orderBy: {
        replacedAt: "desc",
      },
    });
  },

  countOrderLoads: async (
    orderId: number,
    loads: number,
    countedBy: string
  ) => {
    if (
      !Number.isInteger(loads) ||
      loads <= 0
    ) {
      throw new Error(
        "Loads must be a positive whole number."
      );
    }

    const existingEntry =
      await prisma.tankLoadEntry.findUnique({
        where: {
          orderId,
        },
      });

    if (
      existingEntry &&
      !existingEntry.isReversed
    ) {
      return existingEntry;
    }

    const cycle =
      await ensureActiveCycle();

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const entry =
            existingEntry
              ? await transaction.tankLoadEntry.update({
                  where: {
                    id:
                      existingEntry.id,
                  },

                  data: {
                    tankCycleId:
                      cycle.id,

                    loads,

                    countedAt:
                      new Date(),

                    countedBy,

                    isReversed:
                      false,

                    reversedAt:
                      null,

                    reversedBy:
                      null,

                    reversalReason:
                      null,
                  },
                })
              : await transaction.tankLoadEntry.create({
                  data: {
                    tankCycleId:
                      cycle.id,

                    orderId,

                    loads,

                    countedBy,
                  },
                });

          await transaction.tankCycle.update({
            where: {
              id:
                cycle.id,
            },

            data: {
              currentLoads: {
                increment:
                  loads,
              },
            },
          });

          return entry;
        }
      );

    await synchronizeTankNotifications(
      cycle.id,
      countedBy
    );

    return result;
  },

  reverseOrderLoads: async (
    orderId: number,
    reversedBy: string,
    reversalReason: string
  ) => {
    const entry =
      await prisma.tankLoadEntry.findUnique({
        where: {
          orderId,
        },

        include: {
          tankCycle:
            true,
        },
      });

    if (
      !entry ||
      entry.isReversed
    ) {
      return null;
    }

    const normalizedReversedBy =
      reversedBy.trim() ||
      "System";

    const normalizedReason =
      reversalReason.trim() ||
      "Order load count was reversed.";

    /*
     * The load entry always retains its original
     * tankCycleId. If that cycle has already been
     * replaced, only mark the entry as reversed.
     * Historical tank totals must not be changed,
     * and the current active cycle must not be
     * affected.
     */
    if (
      entry.tankCycle.status !==
      TankCycleStatus.ACTIVE
    ) {
      return prisma.tankLoadEntry.update({
        where: {
          id:
            entry.id,
        },

        data: {
          isReversed:
            true,

          reversedAt:
            new Date(),

          reversedBy:
            normalizedReversedBy,

          reversalReason:
            normalizedReason,
        },
      });
    }

    const result =
      await prisma.$transaction(
        async (transaction) => {
          /*
           * Read the cycle again inside the
           * transaction. This protects against a
           * tank replacement occurring between the
           * initial lookup and this reversal.
           */
          const currentCycle =
            await transaction.tankCycle.findUnique({
              where: {
                id:
                  entry.tankCycleId,
              },
            });

          if (!currentCycle) {
            throw new Error(
              "The tank cycle for this order was not found."
            );
          }

          const updatedEntry =
            await transaction.tankLoadEntry.update({
              where: {
                id:
                  entry.id,
              },

              data: {
                isReversed:
                  true,

                reversedAt:
                  new Date(),

                reversedBy:
                  normalizedReversedBy,

                reversalReason:
                  normalizedReason,
              },
            });

          /*
           * If the cycle was replaced while this
           * request was in progress, preserve the
           * historical total and do not touch any
           * newer active cycle.
           */
          if (
            currentCycle.status !==
            TankCycleStatus.ACTIVE
          ) {
            return {
              updatedEntry,
              tankTotalChanged:
                false,
            };
          }

          const nextCurrentLoads =
            Math.max(
              0,
              currentCycle.currentLoads -
                entry.loads
            );

          await transaction.tankCycle.update({
            where: {
              id:
                currentCycle.id,
            },

            data: {
              currentLoads:
                nextCurrentLoads,
            },
          });

          return {
            updatedEntry,
            tankTotalChanged:
              true,
          };
        }
      );

    if (
      result.tankTotalChanged
    ) {
      await synchronizeTankNotifications(
        entry.tankCycleId,
        normalizedReversedBy
      );
    }

    return result.updatedEntry;
  },

  replaceTank: async (
    replacedBy: string,
    replacementNotes?:
      | string
      | null
  ) => {
    const cycle =
      await ensureActiveCycle();

    const configuration =
      await getTankConfiguration();

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const replacedCycle =
            await transaction.tankCycle.update({
              where: {
                id:
                  cycle.id,
              },

              data: {
                status:
                  TankCycleStatus.REPLACED,

                replacedAt:
                  new Date(),

                replacedBy,

                replacementNotes:
                  replacementNotes
                    ?.trim() ||
                  null,
              },
            });

          const nextCycle =
            await transaction.tankCycle.create({
              data: {
                maximumLoads:
                  configuration.maximumLoads,
              },
            });

          return {
            replacedCycle,
            nextCycle,
          };
        }
      );

    await notificationService
      .resolveTankCycleNotifications(
        cycle.id,
        replacedBy
      );

    return result;
  },
};