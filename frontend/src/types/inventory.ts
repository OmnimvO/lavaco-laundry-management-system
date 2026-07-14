export type InventoryCategory =
  | "DETERGENT"
  | "FABRIC_SOFTENER"
  | "PACKAGING"
  | "CLEANING_SUPPLY"
  | "OTHER";

export type InventoryMovementType =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ADJUSTMENT"
  | "ORDER_USAGE"
  | "REVERSAL";

export type InventoryMovement = {
  id: number;
  inventoryItemId: number;
  movementType:
    InventoryMovementType;

  quantity: number;
  previousQuantity: number;
  newQuantity: number;

  reason?: string | null;
  performedBy?: string | null;
  orderId?: number | null;

  createdAt: string;

  order?: {
    id: number;
    orderNumber: string;
  } | null;
};

export type InventoryItem = {
  id: number;
  name: string;
  category:
    InventoryCategory;
  unit: string;

  quantity: number;
  reorderLevel: number;

  supplierName?: string | null;
  supplierContact?: string | null;
  notes?: string | null;

  isActive: boolean;
  isArchived: boolean;
  isLowStock?: boolean;

  archivedAt?: string | null;
  archivedBy?: string | null;

  createdAt: string;
  updatedAt: string;

  movements?:
    InventoryMovement[];

  _count?: {
    movements: number;
  };
};

export type CreateInventoryItemData = {
  name: string;
  category:
    InventoryCategory;
  unit: string;

  quantity: number;
  reorderLevel: number;

  supplierName?: string;
  supplierContact?: string;
  notes?: string;

  isActive: boolean;
};

export type UpdateInventoryItemData = {
  name?: string;
  category?:
    InventoryCategory;
  unit?: string;

  reorderLevel?: number;

  supplierName?: string | null;
  supplierContact?: string | null;
  notes?: string | null;

  isActive?: boolean;
};

export type InventoryMovementData = {
  quantity: number;
  reason?: string;
};

export type InventoryMovementResponse = {
  message: string;

  item:
    InventoryItem;

  movement:
    InventoryMovement;
};