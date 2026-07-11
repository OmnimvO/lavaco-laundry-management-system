/*
  Warnings:

  - You are about to drop the column `soapRequested` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `softenerRequested` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "soapRequested",
DROP COLUMN "softenerRequested",
ADD COLUMN     "soapQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "softenerQuantity" INTEGER NOT NULL DEFAULT 0;
