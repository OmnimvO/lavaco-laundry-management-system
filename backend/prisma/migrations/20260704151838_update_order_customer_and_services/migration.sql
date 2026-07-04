/*
  Warnings:

  - You are about to drop the column `collectedByName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `receivedByName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `serviceType` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "collectedByName",
DROP COLUMN "receivedByName",
DROP COLUMN "serviceType",
ADD COLUMN     "hasDry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasFold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasWash" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualCustomerName" TEXT,
ADD COLUMN     "manualCustomerPhone" TEXT,
ADD COLUMN     "receivedBy" TEXT,
ADD COLUMN     "releasedTo" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
