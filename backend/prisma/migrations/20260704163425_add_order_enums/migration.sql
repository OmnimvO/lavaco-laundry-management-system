/*
  Warnings:

  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fulfillmentType` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `soap` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `softener` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `washType` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `serviceType` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('COMPLETE_SERVICE', 'WASH_AND_DRY', 'WASH_ONLY', 'DRY_ONLY', 'DRY_AND_FOLD', 'FOLD_ONLY', 'SPIN_ONLY');

-- CreateEnum
CREATE TYPE "WashType" AS ENUM ('REGULAR', 'SUPER');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'WASHING', 'DRYING', 'FOLDING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SoapType" AS ENUM ('NONE', 'BREEZE', 'ARIEL');

-- CreateEnum
CREATE TYPE "SoftenerType" AS ENUM ('NONE', 'SURF', 'DOWNY');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
DROP COLUMN "fulfillmentType",
ADD COLUMN     "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
DROP COLUMN "soap",
ADD COLUMN     "soap" "SoapType" NOT NULL DEFAULT 'NONE',
DROP COLUMN "softener",
ADD COLUMN     "softener" "SoftenerType" NOT NULL DEFAULT 'NONE',
DROP COLUMN "washType",
ADD COLUMN     "washType" "WashType",
DROP COLUMN "serviceType",
ADD COLUMN     "serviceType" "ServiceType" NOT NULL;
