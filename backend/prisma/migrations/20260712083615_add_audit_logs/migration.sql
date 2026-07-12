-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'PAYMENT_CHANGE', 'PRINT');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('ORDER', 'CUSTOMER', 'EMPLOYEE', 'REPORT');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" INTEGER,
    "entityName" TEXT,
    "description" TEXT NOT NULL,
    "performedBy" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
