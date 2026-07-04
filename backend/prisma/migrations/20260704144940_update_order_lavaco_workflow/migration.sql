/*
  Warnings:

  - You are about to drop the column `price` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `service` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Order` table. All the data in the column will be lost.
  - Added the required column `basketCount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceType` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "price",
DROP COLUMN "service",
DROP COLUMN "weight",
ADD COLUMN     "basketCount" INTEGER NOT NULL,
ADD COLUMN     "collectedByName" TEXT,
ADD COLUMN     "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dryExtend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fulfillmentType" TEXT NOT NULL DEFAULT 'Pickup',
ADD COLUMN     "hasMixedWhiteColor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "receivedByName" TEXT,
ADD COLUMN     "serviceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "serviceType" TEXT NOT NULL,
ADD COLUMN     "soap" TEXT,
ADD COLUMN     "soapPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "softener" TEXT,
ADD COLUMN     "softenerPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "washType" TEXT;
