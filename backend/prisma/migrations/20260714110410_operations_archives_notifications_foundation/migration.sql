/*
  Warnings:

  - A unique constraint covering the columns `[normalizedPhone]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TankCycleStatus" AS ENUM ('ACTIVE', 'REPLACED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TANK_WARNING', 'TANK_REPLACEMENT_REQUIRED', 'LOW_INVENTORY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('DETERGENT', 'FABRIC_SOFTENER', 'BLEACH', 'PACKAGING', 'HANGER', 'LAUNDRY_TAG', 'RECEIPT_PAPER', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'ORDER_USAGE', 'REVERSAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE';
ALTER TYPE "AuditAction" ADD VALUE 'REFUND_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_IN';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_OUT';
ALTER TYPE "AuditAction" ADD VALUE 'ADJUSTMENT';
ALTER TYPE "AuditAction" ADD VALUE 'TANK_REPLACEMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntityType" ADD VALUE 'INVENTORY';
ALTER TYPE "AuditEntityType" ADD VALUE 'TANK_CYCLE';
ALTER TYPE "AuditEntityType" ADD VALUE 'NOTIFICATION';
ALTER TYPE "AuditEntityType" ADD VALUE 'USER';
ALTER TYPE "AuditEntityType" ADD VALUE 'SETTINGS';
ALTER TYPE "AuditEntityType" ADD VALUE 'ARCHIVE';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "normalizedAddress" TEXT,
ADD COLUMN     "normalizedName" TEXT,
ADD COLUMN     "normalizedPhone" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "refundedBy" TEXT;

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN     "maximumLoadsPerTankCycle" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "tankWarningThreshold" INTEGER NOT NULL DEFAULT 25;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TankCycle" (
    "id" SERIAL NOT NULL,
    "status" "TankCycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "maximumLoads" INTEGER NOT NULL,
    "currentLoads" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "replacementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TankCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankLoadEntry" (
    "id" SERIAL NOT NULL,
    "tankCycleId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "loads" INTEGER NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countedBy" TEXT,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "reversedAt" TIMESTAMP(3),
    "reversedBy" TEXT,
    "reversalReason" TEXT,

    CONSTRAINT "TankLoadEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetRole" "UserRole",
    "targetUserId" INTEGER,
    "relatedEntityType" "AuditEntityType",
    "relatedEntityId" INTEGER,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supplierName" TEXT,
    "supplierContact" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" SERIAL NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "previousQuantity" DOUBLE PRECISION NOT NULL,
    "newQuantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "performedBy" TEXT,
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TankCycle_status_idx" ON "TankCycle"("status");

-- CreateIndex
CREATE INDEX "TankCycle_startedAt_idx" ON "TankCycle"("startedAt");

-- CreateIndex
CREATE INDEX "TankLoadEntry_tankCycleId_isReversed_idx" ON "TankLoadEntry"("tankCycleId", "isReversed");

-- CreateIndex
CREATE UNIQUE INDEX "TankLoadEntry_orderId_key" ON "TankLoadEntry"("orderId");

-- CreateIndex
CREATE INDEX "Notification_isResolved_createdAt_idx" ON "Notification"("isResolved", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_targetRole_idx" ON "Notification"("targetRole");

-- CreateIndex
CREATE INDEX "Notification_targetUserId_idx" ON "Notification"("targetUserId");

-- CreateIndex
CREATE INDEX "NotificationRead_userId_readAt_idx" ON "NotificationRead"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_notificationId_userId_key" ON "NotificationRead"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "InventoryItem_isArchived_isActive_idx" ON "InventoryItem"("isArchived", "isActive");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryItemId_createdAt_idx" ON "InventoryMovement"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_orderId_idx" ON "InventoryMovement"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_normalizedPhone_key" ON "Customer"("normalizedPhone");

-- CreateIndex
CREATE INDEX "Customer_isArchived_idx" ON "Customer"("isArchived");

-- CreateIndex
CREATE INDEX "Customer_normalizedName_normalizedAddress_idx" ON "Customer"("normalizedName", "normalizedAddress");

-- CreateIndex
CREATE INDEX "Employee_isArchived_idx" ON "Employee"("isArchived");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Order_status_paymentStatus_idx" ON "Order"("status", "paymentStatus");

-- CreateIndex
CREATE INDEX "Order_isArchived_idx" ON "Order"("isArchived");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "User_isArchived_idx" ON "User"("isArchived");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- AddForeignKey
ALTER TABLE "TankLoadEntry" ADD CONSTRAINT "TankLoadEntry_tankCycleId_fkey" FOREIGN KEY ("tankCycleId") REFERENCES "TankCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankLoadEntry" ADD CONSTRAINT "TankLoadEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
