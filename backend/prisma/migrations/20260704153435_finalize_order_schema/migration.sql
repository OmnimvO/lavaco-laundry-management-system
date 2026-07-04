/*
  Warnings:

  - You are about to drop the column `hasDry` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `hasFold` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `hasWash` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `manualCustomerName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `manualCustomerPhone` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `releasedTo` on the `Order` table. All the data in the column will be lost.
  - Added the required column `serviceType` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "hasDry",
DROP COLUMN "hasFold",
DROP COLUMN "hasWash",
DROP COLUMN "manualCustomerName",
DROP COLUMN "manualCustomerPhone",
DROP COLUMN "releasedTo",
ADD COLUMN     "claimedBy" TEXT,
ADD COLUMN     "serviceType" TEXT NOT NULL,
ADD COLUMN     "walkInCustomerAddress" TEXT,
ADD COLUMN     "walkInCustomerName" TEXT,
ADD COLUMN     "walkInCustomerPhone" TEXT;
