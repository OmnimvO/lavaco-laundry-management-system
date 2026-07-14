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

  deductOrderSupplies: async (
    data: OrderSupplyUsage
  ) => {
    const results: {
      category: InventoryCategory;
      itemId: number;
      itemName: string;
      deducted: number;
      remaining: number;
      skipped: boolean;
    }[] = [];

    const usages = [
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

    for (const usage of usages) {
      if (usage.quantity <= 0) {
        continue;
      }

      const item =
        await findActiveItemByCategory(
          usage.category
        );

      if (!item) {
        throw new Error(
          usage.category ===
          InventoryCategory.DETERGENT
            ? "No active detergent inventory item is configured."
            : "No active fabric softener inventory item is configured."
        );
      }

      const existingUsage =
        await getExistingOrderUsage(
          data.orderId,
          item.id
        );

      const existingReversal =
        await getExistingOrderReversal(
          data.orderId,
          item.id
        );

      if (
        existingUsage &&
        !existingReversal
      ) {
        results.push({
          category:
            usage.category,
          itemId:
            item.id,
          itemName:
            item.name,
          deducted:
            existingUsage.quantity,
          remaining:
            item.quantity,
          skipped: true,
        });

        continue;
      }

      const result =
        await inventoryService.applyStockMovement(
          item.id,
          {
            quantity:
              usage.quantity,

            movementType:
              InventoryMovementType.ORDER_USAGE,

            reason:
              `Automatic usage for order #${data.orderId}`,

            performedBy:
              data.performedBy,

            orderId:
              data.orderId,
          }
        );

      results.push({
        category:
          usage.category,
        itemId:
          item.id,
        itemName:
          item.name,
        deducted:
          usage.quantity,
        remaining:
          result.item.quantity,
        skipped: false,
      });
    }

    return results;
  },

  reverseOrderSupplies: async (
    orderId: number,
    performedBy: string,
    reason: string
  ) => {
    const usages =
      await prisma.inventoryMovement.findMany({
        where: {
          orderId,
          movementType:
            InventoryMovementType.ORDER_USAGE,
        },

        include: {
          inventoryItem: true,
        },

        orderBy: {
          createdAt: "asc",
        },
      });

    const results: {
      itemId: number;
      itemName: string;
      restored: number;
      remaining: number;
      skipped: boolean;
    }[] = [];

    for (const usage of usages) {
      const existingReversal =
        await getExistingOrderReversal(
          orderId,
          usage.inventoryItemId
        );

      if (existingReversal) {
        results.push({
          itemId:
            usage.inventoryItemId,
          itemName:
            usage.inventoryItem.name,
          restored:
            existingReversal.quantity,
          remaining:
            usage.inventoryItem.quantity,
          skipped: true,
        });

        continue;
      }

      const result =
        await inventoryService.applyStockMovement(
          usage.inventoryItemId,
          {
            quantity:
              usage.quantity,

            movementType:
              InventoryMovementType.REVERSAL,

            reason,

            performedBy,

            orderId,
          }
        );

      results.push({
        itemId:
          result.item.id,
        itemName:
          result.item.name,
        restored:
          usage.quantity,
        remaining:
          result.item.quantity,
        skipped: false,
      });
    }

    return results;
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