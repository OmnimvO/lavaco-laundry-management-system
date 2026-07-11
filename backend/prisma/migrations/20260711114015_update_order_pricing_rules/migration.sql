/*
  Warnings:

  - The values [PICKUP,DELIVERY] on the enum `FulfillmentType` will be removed. If these variants are still used in the database, this will fail.
  - The values [SPIN_ONLY] on the enum `ServiceType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `basketCount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `dryExtend` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `serviceFee` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `soap` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `softener` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `washType` on the `Order` table. All the data in the column will be lost.
  - Added the required column `laundryWeight` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `loadCount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `servicePricePerLoad` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceSubtotal` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FulfillmentType_new" AS ENUM ('PICKUP_ONLY', 'DELIVERY_ONLY', 'PICKUP_AND_DELIVERY');
ALTER TABLE "public"."Order" ALTER COLUMN "fulfillmentType" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "fulfillmentType" TYPE "FulfillmentType_new" USING ("fulfillmentType"::text::"FulfillmentType_new");
ALTER TYPE "FulfillmentType" RENAME TO "FulfillmentType_old";
ALTER TYPE "FulfillmentType_new" RENAME TO "FulfillmentType";
DROP TYPE "public"."FulfillmentType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ServiceType_new" AS ENUM ('COMPLETE_SERVICE', 'WASH_AND_DRY', 'WASH_ONLY', 'DRY_ONLY', 'DRY_AND_FOLD', 'FOLD_ONLY');
ALTER TABLE "Order" ALTER COLUMN "serviceType" TYPE "ServiceType_new" USING ("serviceType"::text::"ServiceType_new");
ALTER TYPE "ServiceType" RENAME TO "ServiceType_old";
ALTER TYPE "ServiceType_new" RENAME TO "ServiceType";
DROP TYPE "public"."ServiceType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "basketCount",
DROP COLUMN "dryExtend",
DROP COLUMN "serviceFee",
DROP COLUMN "soap",
DROP COLUMN "softener",
DROP COLUMN "washType",
ADD COLUMN     "laundryWeight" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "loadCount" INTEGER NOT NULL,
ADD COLUMN     "rinseCycles" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "rinseFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "servicePricePerLoad" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "serviceSubtotal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "soapRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "softenerRequested" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "fulfillmentType" DROP DEFAULT;

-- DropEnum
DROP TYPE "SoapType";

-- DropEnum
DROP TYPE "SoftenerType";

-- DropEnum
DROP TYPE "WashType";
