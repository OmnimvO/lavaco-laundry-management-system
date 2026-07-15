import prisma from "../lib/prisma.js";

import {
  InventoryCategory,
  InventoryMovementType,
} from "../generated/prisma/client.js";

type CreateInventoryItemData = {
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity?: number;
  reorderLevel?: number;
  supplierName?: string | null;
  supplierContact?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

type UpdateInventoryItemData = {
  name?: string;
  category?: InventoryCategory;
  unit?: string;
  reorderLevel?: number;
  supplierName?: string | null;
  supplierContact?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

type StockMovementData = {
  quantity: number;
  movementType:
    InventoryMovementType;
  reason?: string | null;
  performedBy?: string | null;
  orderId?: number | null;
};

type OrderSupplyUsage = {
  orderId: number;
  soapQuantity: number;
  softenerQuantity: number;
  performedBy: string;
};

type SupplyCategoryTarget = {
  category: InventoryCategory;
  quantity: number;
};

async function findActiveItemByCategory(
  category: InventoryCategory
) {
  return prisma.inventoryItem.findFirst({
    where: {
      category,
      isArchived: false,
      isActive: true,
    },

    orderBy: {
      id: "asc",
    },
  });
}

async function getExistingOrderUsage(
  orderId: number,
  inventoryItemId: number
) {
  return prisma.inventoryMovement.findFirst({
    where: {
      orderId,
      inventoryItemId,
      movementType:
        InventoryMovementType.ORDER_USAGE,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getExistingOrderReversal(
  orderId: number,
  inventoryItemId: number
) {
  return prisma.inventoryMovement.findFirst({
    where: {
      orderId,
      inventoryItemId,
      movementType:
        InventoryMovementType.REVERSAL,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getOrderSupplyMovements(
  orderId: number,
  category: InventoryCategory
) {
  return prisma.inventoryMovement.findMany({
    where: {
      orderId,
      inventoryItem: {
        category,
      },
      movementType: {
        in: [
          InventoryMovementType.ORDER_USAGE,
          InventoryMovementType.REVERSAL,
        ],
      },
    },
    include: {
      inventoryItem: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

function getNetUsedQuantity(
  movements: Awaited<
    ReturnType<
      typeof getOrderSupplyMovements
    >
  >
) {
  return movements.reduce(
    (total, movement) =>
      movement.movementType ===
      InventoryMovementType.ORDER_USAGE
        ? total + movement.quantity
        : total - movement.quantity,
    0
  );
}

function getPreferredInventoryItem(
  movements: Awaited<
    ReturnType<
      typeof getOrderSupplyMovements
    >
  >
) {
  return (
    [...movements]
      .reverse()
      .find(
        (movement) =>
          movement.movementType ===
          InventoryMovementType.ORDER_USAGE
      )
      ?.inventoryItem ?? null
  );
}

export const inventoryService = {
  createInventoryItem: async (
    data: CreateInventoryItemData
  ) => {
    const initialQuantity =
      data.quantity ?? 0;

    return prisma.$transaction(
      async (transaction) => {
        const item =
          await transaction.inventoryItem.create({
            data: {
              name:
                data.name.trim(),

              category:
                data.category,

              unit:
                data.unit.trim(),

              quantity:
                initialQuantity,

              reorderLevel:
                data.reorderLevel ??
                0,

              supplierName:
                data.supplierName
                  ?.trim() ||
                null,

              supplierContact:
                data.supplierContact
                  ?.trim() ||
                null,

              notes:
                data.notes?.trim() ||
                null,

              isActive:
                data.isActive ??
                true,
            },
          });

        if (
          initialQuantity > 0
        ) {
          await transaction.inventoryMovement.create({
            data: {
              inventoryItemId:
                item.id,

              movementType:
                InventoryMovementType.STOCK_IN,

              quantity:
                initialQuantity,

              previousQuantity: 0,

              newQuantity:
                initialQuantity,

              reason:
                "Initial stock",

              performedBy:
                "System",
            },
          });
        }

        return item;
      }
    );
  },

  getAllInventoryItems: async () => {
    return prisma.inventoryItem.findMany({
      where: {
        isArchived: false,
      },

      include: {
        _count: {
          select: {
            movements: true,
          },
        },
      },

      orderBy: [
        {
          isActive: "desc",
        },
        {
          name: "asc",
        },
      ],
    });
  },

  getInventoryItemById: async (
    id: number,
    includeArchived = false
  ) => {
    return prisma.inventoryItem.findFirst({
      where: {
        id,

        ...(includeArchived
          ? {}
          : {
              isArchived:
                false,
            }),
      },

      include: {
        movements: {
          orderBy: {
            createdAt:
              "desc",
          },

          take: 50,
        },
      },
    });
  },

  updateInventoryItem: async (
    id: number,
    data: UpdateInventoryItemData
  ) => {
    return prisma.inventoryItem.update({
      where: {
        id,
      },

      data,
    });
  },

  archiveInventoryItem: async (
    id: number,
    archivedBy: string
  ) => {
    return prisma.inventoryItem.update({
      where: {
        id,
      },

      data: {
        isArchived: true,
        archivedAt:
          new Date(),
        archivedBy,
        isActive: false,
      },
    });
  },

  getMovementsByItemId: async (
    inventoryItemId: number
  ) => {
    return prisma.inventoryMovement.findMany({
      where: {
        inventoryItemId,
      },

      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  },

  applyStockMovement: async (
    inventoryItemId: number,
    data: StockMovementData
  ) => {
    return prisma.$transaction(
      async (transaction) => {
        const item =
          await transaction.inventoryItem.findFirst({
            where: {
              id:
                inventoryItemId,

              isArchived:
                false,

              isActive:
                true,
            },
          });

        if (!item) {
          throw new Error(
            "Inventory item was not found or is inactive."
          );
        }

        let newQuantity =
          item.quantity;

        switch (
          data.movementType
        ) {
          case InventoryMovementType.STOCK_IN:
          case InventoryMovementType.REVERSAL:
            newQuantity +=
              data.quantity;
            break;

          case InventoryMovementType.STOCK_OUT:
          case InventoryMovementType.ORDER_USAGE:
            newQuantity -=
              data.quantity;
            break;

          case InventoryMovementType.ADJUSTMENT:
            newQuantity =
              data.quantity;
            break;
        }

        if (newQuantity < 0) {
          throw new Error(
            "Insufficient stock. Inventory cannot become negative."
          );
        }

        const updatedItem =
          await transaction.inventoryItem.update({
            where: {
              id:
                inventoryItemId,
            },

            data: {
              quantity:
                newQuantity,
            },
          });

        const movement =
          await transaction.inventoryMovement.create({
            data: {
              inventoryItemId,

              movementType:
                data.movementType,

              quantity:
                data.quantity,

              previousQuantity:
                item.quantity,

              newQuantity,

              reason:
                data.reason
                  ?.trim() ||
                null,

              performedBy:
                data.performedBy
                  ?.trim() ||
                null,

              orderId:
                data.orderId ??
                null,
            },
          });

        return {
          item:
            updatedItem,

          movement,
        };
      }
    );
  },

  syncOrderSupplies: async (
    data: OrderSupplyUsage
  ) => {
    const targets: SupplyCategoryTarget[] = [
      {
        category:
          InventoryCategory.DETERGENT,
        quantity:
          data.soapQuantity,
      },
      {
        category:
          InventoryCategory.FABRIC_SOFTENER,
        quantity:
          data.softenerQuantity,
      },
    ];

    const results: {
      category: InventoryCategory;
      itemId: number | null;
      itemName: string | null;
      previousUsed: number;
      requestedUsed: number;
      deducted: number;
      restored: number;
      remaining: number | null;
    }[] = [];

    for (const target of targets) {
      const requestedUsed =
        Math.max(
          0,
          Math.trunc(
            target.quantity
          )
        );

      const movements =
        await getOrderSupplyMovements(
          data.orderId,
          target.category
        );

      const previousUsed =
        Math.max(
          0,
          getNetUsedQuantity(
            movements
          )
        );

      const difference =
        requestedUsed -
        previousUsed;

      if (difference === 0) {
        const preferredItem =
          getPreferredInventoryItem(
            movements
          );

        results.push({
          category:
            target.category,
          itemId:
            preferredItem?.id ??
            null,
          itemName:
            preferredItem?.name ??
            null,
          previousUsed,
          requestedUsed,
          deducted: 0,
          restored: 0,
          remaining:
            preferredItem?.quantity ??
            null,
        });

        continue;
      }

      if (difference > 0) {
        const preferredItem =
          getPreferredInventoryItem(
            movements
          );

        const item =
          preferredItem &&
          !preferredItem.isArchived &&
          preferredItem.isActive
            ? preferredItem
            : await findActiveItemByCategory(
                target.category
              );

        if (!item) {
          throw new Error(
            target.category ===
            InventoryCategory.DETERGENT
              ? "No active detergent inventory item is configured."
              : "No active fabric softener inventory item is configured."
          );
        }

        const result =
          await inventoryService.applyStockMovement(
            item.id,
            {
              quantity:
                difference,
              movementType:
                InventoryMovementType.ORDER_USAGE,
              reason:
                `Supply usage synchronized for order #${data.orderId}`,
              performedBy:
                data.performedBy,
              orderId:
                data.orderId,
            }
          );

        results.push({
          category:
            target.category,
          itemId:
            item.id,
          itemName:
            item.name,
          previousUsed,
          requestedUsed,
          deducted:
            difference,
          restored: 0,
          remaining:
            result.item.quantity,
        });

        continue;
      }

      let quantityToRestore =
        Math.abs(
          difference
        );

      let restored = 0;
      let lastRemaining:
        number | null = null;
      let lastItemId:
        number | null = null;
      let lastItemName:
        string | null = null;

      const usageByItem =
        new Map<
          number,
          {
            item:
              (typeof movements)[number]["inventoryItem"];
            netUsed: number;
          }
        >();

      for (const movement of movements) {
        const current =
          usageByItem.get(
            movement.inventoryItemId
          ) ?? {
            item:
              movement.inventoryItem,
            netUsed: 0,
          };

        current.netUsed +=
          movement.movementType ===
          InventoryMovementType.ORDER_USAGE
            ? movement.quantity
            : -movement.quantity;

        usageByItem.set(
          movement.inventoryItemId,
          current
        );
      }

      for (
        const entry of
        [...usageByItem.values()]
          .filter(
            (value) =>
              value.netUsed > 0
          )
          .reverse()
      ) {
        if (
          quantityToRestore <= 0
        ) {
          break;
        }

        const restoreQuantity =
          Math.min(
            quantityToRestore,
            entry.netUsed
          );

        const result =
          await inventoryService.applyStockMovement(
            entry.item.id,
            {
              quantity:
                restoreQuantity,
              movementType:
                InventoryMovementType.REVERSAL,
              reason:
                `Supply usage adjusted for order #${data.orderId}`,
              performedBy:
                data.performedBy,
              orderId:
                data.orderId,
            }
          );

        restored +=
          restoreQuantity;

        quantityToRestore -=
          restoreQuantity;

        lastRemaining =
          result.item.quantity;

        lastItemId =
          result.item.id;

        lastItemName =
          result.item.name;
      }

      if (
        quantityToRestore > 0
      ) {
        throw new Error(
          "Unable to restore the complete order supply adjustment."
        );
      }

      results.push({
        category:
          target.category,
        itemId:
          lastItemId,
        itemName:
          lastItemName,
        previousUsed,
        requestedUsed,
        deducted: 0,
        restored,
        remaining:
          lastRemaining,
      });
    }

    return results;
  },

  deductOrderSupplies: async (
    data: OrderSupplyUsage
  ) => {
    return inventoryService.syncOrderSupplies(
      data
    );
  },

  reverseOrderSupplies: async (
    orderId: number,
    performedBy: string,
    reason: string
  ) => {
    return prisma.$transaction(
      async (transaction) => {
        const movements =
          await transaction.inventoryMovement.findMany({
            where: {
              orderId,

              movementType: {
                in: [
                  InventoryMovementType.ORDER_USAGE,
                  InventoryMovementType.REVERSAL,
                ],
              },
            },

            include: {
              inventoryItem: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          });

        const usageByItem =
          new Map<
            number,
            {
              item:
                (typeof movements)[number]["inventoryItem"];
              netUsed: number;
            }
          >();

        for (const movement of movements) {
          const current =
            usageByItem.get(
              movement.inventoryItemId
            ) ?? {
              item:
                movement.inventoryItem,
              netUsed: 0,
            };

          if (
            movement.movementType ===
            InventoryMovementType.ORDER_USAGE
          ) {
            current.netUsed +=
              movement.quantity;
          } else {
            current.netUsed -=
              movement.quantity;
          }

          usageByItem.set(
            movement.inventoryItemId,
            current
          );
        }

        const results: {
          itemId: number;
          itemName: string;
          restored: number;
          remaining: number;
          skipped: boolean;
        }[] = [];

        for (
          const entry of
          usageByItem.values()
        ) {
          const quantityToRestore =
            Math.max(
              0,
              entry.netUsed
            );

          if (
            quantityToRestore === 0
          ) {
            results.push({
              itemId:
                entry.item.id,

              itemName:
                entry.item.name,

              restored: 0,

              remaining:
                entry.item.quantity,

              skipped: true,
            });

            continue;
          }

          /*
           * Cancellation must return supplies to
           * the exact item originally used. This
           * deliberately does not require the item
           * to remain active or unarchived.
           */
          const currentItem =
            await transaction.inventoryItem.findUnique({
              where: {
                id:
                  entry.item.id,
              },
            });

          if (!currentItem) {
            throw new Error(
              `Inventory item ${entry.item.name} was not found while restoring cancelled-order supplies.`
            );
          }

          const newQuantity =
            currentItem.quantity +
            quantityToRestore;

          const updatedItem =
            await transaction.inventoryItem.update({
              where: {
                id:
                  currentItem.id,
              },

              data: {
                quantity:
                  newQuantity,
              },
            });

          await transaction.inventoryMovement.create({
            data: {
              inventoryItemId:
                currentItem.id,

              movementType:
                InventoryMovementType.REVERSAL,

              quantity:
                quantityToRestore,

              previousQuantity:
                currentItem.quantity,

              newQuantity,

              reason:
                reason.trim() ||
                "Order supplies were restored.",

              performedBy:
                performedBy.trim() ||
                "System",

              orderId,
            },
          });

          results.push({
            itemId:
              updatedItem.id,

            itemName:
              updatedItem.name,

            restored:
              quantityToRestore,

            remaining:
              updatedItem.quantity,

            skipped: false,
          });
        }

        return results;
      }
    );
  },

  getLowStockItems: async () => {
    const items =
      await prisma.inventoryItem.findMany({
        where: {
          isArchived: false,
          isActive: true,
        },

        orderBy: {
          quantity: "asc",
        },
      });

    return items.filter(
      (item) =>
        item.quantity <=
        item.reorderLevel
    );
  },
};