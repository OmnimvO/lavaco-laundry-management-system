import type {
  Request,
  Response,
} from "express";

import {
  AuditAction,
  AuditEntityType,
  InventoryCategory,
  InventoryMovementType,
} from "../generated/prisma/client.js";

import {
  inventoryService,
} from "../services/inventory.service.js";

import {
  auditLogService,
} from "../services/auditLog.service.js";

import {
  notificationService,
} from "../services/notification.service.js";

import {
  getAuthenticatedUserName,
} from "../utils/authUser.js";

const VALID_CATEGORIES =
  new Set<InventoryCategory>(
    Object.values(
      InventoryCategory
    )
  );

function parsePositiveInteger(
  value:
    | string
    | string[]
    | undefined
) {
  const rawValue =
    Array.isArray(value)
      ? value[0]
      : value;

  const id = Number(rawValue);

  return (
    Number.isInteger(id) &&
    id > 0
      ? id
      : null
  );
}

function parseNonNegativeNumber(
  value: unknown
) {
  const numberValue =
    Number(value);

  return (
    Number.isFinite(
      numberValue
    ) &&
    numberValue >= 0
      ? numberValue
      : null
  );
}

function normalizeOptionalText(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  return value.trim() ||
    null;
}

async function synchronizeLowStockNotification(
  item: {
    id: number;
    name: string;
    quantity: number;
    reorderLevel: number;
    unit: string;
  },

  performedBy: string
) {
  if (
    item.quantity <=
    item.reorderLevel
  ) {
    await notificationService
      .createInventoryNotificationIfMissing(
        item.id,

        "Low inventory warning",

        `${item.name} has ${item.quantity} ${item.unit} remaining. Reorder level: ${item.reorderLevel}.`
      );

    return;
  }

  await notificationService
    .resolveInventoryNotifications(
      item.id,
      performedBy
    );
}

export const inventoryController = {
  createInventoryItem:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const {
          name,
          category,
          unit,
          quantity = 0,
          reorderLevel = 0,
          supplierName,
          supplierContact,
          notes,
          isActive = true,
        } = request.body;

        if (
          typeof name !==
            "string" ||
          !name.trim()
        ) {
          return response.status(400).json({
            message:
              "Inventory item name is required.",
          });
        }

        if (
          !VALID_CATEGORIES.has(
            category
          )
        ) {
          return response.status(400).json({
            message:
              "Invalid inventory category.",
          });
        }

        if (
          typeof unit !==
            "string" ||
          !unit.trim()
        ) {
          return response.status(400).json({
            message:
              "Inventory unit is required.",
          });
        }

        const parsedQuantity =
          parseNonNegativeNumber(
            quantity
          );

        const parsedReorderLevel =
          parseNonNegativeNumber(
            reorderLevel
          );

        if (
          parsedQuantity ===
            null ||
          parsedReorderLevel ===
            null
        ) {
          return response.status(400).json({
            message:
              "Quantity and reorder level must be zero or greater.",
          });
        }

        const item =
          await inventoryService.createInventoryItem({
            name,
            category,
            unit,
            quantity:
              parsedQuantity,
            reorderLevel:
              parsedReorderLevel,
            supplierName:
              normalizeOptionalText(
                supplierName
              ),
            supplierContact:
              normalizeOptionalText(
                supplierContact
              ),
            notes:
              normalizeOptionalText(
                notes
              ),
            isActive:
              Boolean(isActive),
          });

        const performedBy =
          getAuthenticatedUserName(
            request
          );

        await auditLogService.recordAuditLogSafely({
          action:
            AuditAction.CREATE,

          entityType:
            AuditEntityType.INVENTORY,

          entityId:
            item.id,

          entityName:
            item.name,

          description:
            `Inventory item ${item.name} was created.`,

          performedBy,

          newData: {
            name:
              item.name,
            category:
              item.category,
            unit:
              item.unit,
            quantity:
              item.quantity,
            reorderLevel:
              item.reorderLevel,
            supplierName:
              item.supplierName,
            supplierContact:
              item.supplierContact,
            isActive:
              item.isActive,
          },
        });

        await synchronizeLowStockNotification(
          item,
          performedBy
        );

        return response
          .status(201)
          .json(item);
      } catch (error) {
        console.error(
          "Create inventory item error:",
          error
        );

        return response.status(500).json({
          message:
            error instanceof Error
              ? error.message
              : "Failed to create inventory item.",
        });
      }
    },

  getAllInventoryItems:
    async (
      _request: Request,
      response: Response
    ) => {
      try {
        const items =
          await inventoryService.getAllInventoryItems();

        return response.json(
          items.map(
            (item) => ({
              ...item,
              isLowStock:
                item.quantity <=
                item.reorderLevel,
            })
          )
        );
      } catch (error) {
        console.error(
          "Get inventory items error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to get inventory items.",
        });
      }
    },

  getInventoryItemById:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const id =
          parsePositiveInteger(
            request.params.id
          );

        if (!id) {
          return response.status(400).json({
            message:
              "Invalid inventory item ID.",
          });
        }

        const item =
          await inventoryService.getInventoryItemById(
            id
          );

        if (!item) {
          return response.status(404).json({
            message:
              "Inventory item was not found.",
          });
        }

        return response.json({
          ...item,
          isLowStock:
            item.quantity <=
            item.reorderLevel,
        });
      } catch (error) {
        console.error(
          "Get inventory item error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to get inventory item.",
        });
      }
    },

  updateInventoryItem:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const id =
          parsePositiveInteger(
            request.params.id
          );

        if (!id) {
          return response.status(400).json({
            message:
              "Invalid inventory item ID.",
          });
        }

        const existingItem =
          await inventoryService.getInventoryItemById(
            id
          );

        if (!existingItem) {
          return response.status(404).json({
            message:
              "Inventory item was not found.",
          });
        }

        const updateData: {
          name?: string;
          category?: InventoryCategory;
          unit?: string;
          reorderLevel?: number;
          supplierName?: string | null;
          supplierContact?: string | null;
          notes?: string | null;
          isActive?: boolean;
        } = {};

        if (
          request.body.name !==
          undefined
        ) {
          if (
            typeof request.body.name !==
              "string" ||
            !request.body.name.trim()
          ) {
            return response.status(400).json({
              message:
                "Inventory item name cannot be empty.",
            });
          }

          updateData.name =
            request.body.name.trim();
        }

        if (
          request.body.category !==
          undefined
        ) {
          if (
            !VALID_CATEGORIES.has(
              request.body.category
            )
          ) {
            return response.status(400).json({
              message:
                "Invalid inventory category.",
            });
          }

          updateData.category =
            request.body.category;
        }

        if (
          request.body.unit !==
          undefined
        ) {
          if (
            typeof request.body.unit !==
              "string" ||
            !request.body.unit.trim()
          ) {
            return response.status(400).json({
              message:
                "Inventory unit cannot be empty.",
            });
          }

          updateData.unit =
            request.body.unit.trim();
        }

        if (
          request.body.reorderLevel !==
          undefined
        ) {
          const reorderLevel =
            parseNonNegativeNumber(
              request.body.reorderLevel
            );

          if (
            reorderLevel ===
            null
          ) {
            return response.status(400).json({
              message:
                "Reorder level must be zero or greater.",
            });
          }

          updateData.reorderLevel =
            reorderLevel;
        }

        if (
          request.body.supplierName !==
          undefined
        ) {
          updateData.supplierName =
            normalizeOptionalText(
              request.body.supplierName
            );
        }

        if (
          request.body.supplierContact !==
          undefined
        ) {
          updateData.supplierContact =
            normalizeOptionalText(
              request.body.supplierContact
            );
        }

        if (
          request.body.notes !==
          undefined
        ) {
          updateData.notes =
            normalizeOptionalText(
              request.body.notes
            );
        }

        if (
          request.body.isActive !==
          undefined
        ) {
          updateData.isActive =
            Boolean(
              request.body.isActive
            );
        }

        const item =
          await inventoryService.updateInventoryItem(
            id,
            updateData
          );

        const performedBy =
          getAuthenticatedUserName(
            request
          );

        await auditLogService.recordAuditLogSafely({
          action:
            AuditAction.UPDATE,

          entityType:
            AuditEntityType.INVENTORY,

          entityId:
            item.id,

          entityName:
            item.name,

          description:
            `Inventory item ${existingItem.name} was updated.`,

          performedBy,

          previousData: {
            name:
              existingItem.name,
            category:
              existingItem.category,
            unit:
              existingItem.unit,
            reorderLevel:
              existingItem.reorderLevel,
            supplierName:
              existingItem.supplierName,
            supplierContact:
              existingItem.supplierContact,
            notes:
              existingItem.notes,
            isActive:
              existingItem.isActive,
          },

          newData: {
            name:
              item.name,
            category:
              item.category,
            unit:
              item.unit,
            reorderLevel:
              item.reorderLevel,
            supplierName:
              item.supplierName,
            supplierContact:
              item.supplierContact,
            notes:
              item.notes,
            isActive:
              item.isActive,
          },
        });

        await synchronizeLowStockNotification(
          item,
          performedBy
        );

        return response.json(item);
      } catch (error) {
        console.error(
          "Update inventory item error:",
          error
        );

        return response.status(500).json({
          message:
            error instanceof Error
              ? error.message
              : "Failed to update inventory item.",
        });
      }
    },

  archiveInventoryItem:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const id =
          parsePositiveInteger(
            request.params.id
          );

        if (!id) {
          return response.status(400).json({
            message:
              "Invalid inventory item ID.",
          });
        }

        const existingItem =
          await inventoryService.getInventoryItemById(
            id
          );

        if (!existingItem) {
          return response.status(404).json({
            message:
              "Inventory item was not found.",
          });
        }

        const performedBy =
          getAuthenticatedUserName(
            request
          );

        const item =
          await inventoryService.archiveInventoryItem(
            id,
            performedBy
          );

        await auditLogService.recordAuditLogSafely({
          action:
            AuditAction.ARCHIVE,

          entityType:
            AuditEntityType.INVENTORY,

          entityId:
            item.id,

          entityName:
            item.name,

          description:
            `Inventory item ${item.name} was archived.`,

          performedBy,

          previousData: {
            isArchived:
              existingItem.isArchived,
            isActive:
              existingItem.isActive,
            quantity:
              existingItem.quantity,
          },

          newData: {
            isArchived:
              item.isArchived,
            isActive:
              item.isActive,
            quantity:
              item.quantity,
            archivedAt:
              item.archivedAt
                ?.toISOString(),
            archivedBy:
              item.archivedBy,
          },
        });

        return response.json({
          message:
            "Inventory item archived successfully.",
          item,
        });
      } catch (error) {
        console.error(
          "Archive inventory item error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to archive inventory item.",
        });
      }
    },

  stockIn:
    async (
      request: Request,
      response: Response
    ) => {
      return inventoryController.applyMovement(
        request,
        response,
        InventoryMovementType.STOCK_IN
      );
    },

  stockOut:
    async (
      request: Request,
      response: Response
    ) => {
      return inventoryController.applyMovement(
        request,
        response,
        InventoryMovementType.STOCK_OUT
      );
    },

  adjustStock:
    async (
      request: Request,
      response: Response
    ) => {
      return inventoryController.applyMovement(
        request,
        response,
        InventoryMovementType.ADJUSTMENT
      );
    },

  applyMovement:
    async (
      request: Request,
      response: Response,
      movementType:
        InventoryMovementType
    ) => {
      try {
        const id =
          parsePositiveInteger(
            request.params.id
          );

        if (!id) {
          return response.status(400).json({
            message:
              "Invalid inventory item ID.",
          });
        }

        const quantity =
          parseNonNegativeNumber(
            request.body.quantity
          );

        if (
          quantity === null ||
          (
            movementType !==
              InventoryMovementType.ADJUSTMENT &&
            quantity <= 0
          )
        ) {
          return response.status(400).json({
            message:
              movementType ===
              InventoryMovementType.ADJUSTMENT
                ? "Adjusted quantity must be zero or greater."
                : "Movement quantity must be greater than zero.",
          });
        }

        const performedBy =
          getAuthenticatedUserName(
            request
          );

        const result =
          await inventoryService.applyStockMovement(
            id,
            {
              quantity,
              movementType,
              reason:
                normalizeOptionalText(
                  request.body.reason
                ),
              performedBy,
            }
          );

        const auditAction =
          movementType ===
          InventoryMovementType.STOCK_IN
            ? AuditAction.STOCK_IN
            : movementType ===
              InventoryMovementType.STOCK_OUT
              ? AuditAction.STOCK_OUT
              : AuditAction.ADJUSTMENT;

        await auditLogService.recordAuditLogSafely({
          action:
            auditAction,

          entityType:
            AuditEntityType.INVENTORY,

          entityId:
            result.item.id,

          entityName:
            result.item.name,

          description:
            `${result.item.name} stock changed from ${result.movement.previousQuantity} to ${result.movement.newQuantity}.`,

          performedBy,

          previousData: {
            quantity:
              result.movement
                .previousQuantity,
          },

          newData: {
            quantity:
              result.movement
                .newQuantity,
            movementType:
              result.movement
                .movementType,
            movementQuantity:
              result.movement
                .quantity,
            reason:
              result.movement
                .reason,
          },
        });

        await synchronizeLowStockNotification(
          result.item,
          performedBy
        );

        return response.json({
          message:
            "Inventory stock updated successfully.",
          ...result,
        });
      } catch (error) {
        console.error(
          "Inventory movement error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "Failed to update inventory stock.";

        return response.status(
          message.includes(
            "Insufficient stock"
          )
            ? 400
            : 500
        ).json({
          message,
        });
      }
    },

  getMovements:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const id =
          parsePositiveInteger(
            request.params.id
          );

        if (!id) {
          return response.status(400).json({
            message:
              "Invalid inventory item ID.",
          });
        }

        const movements =
          await inventoryService.getMovementsByItemId(
            id
          );

        return response.json(
          movements
        );
      } catch (error) {
        console.error(
          "Get inventory movements error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to get inventory movements.",
        });
      }
    },

  getLowStockItems:
    async (
      _request: Request,
      response: Response
    ) => {
      try {
        const items =
          await inventoryService.getLowStockItems();

        return response.json(items);
      } catch (error) {
        console.error(
          "Get low stock items error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to get low stock items.",
        });
      }
    },
};

export default inventoryController;