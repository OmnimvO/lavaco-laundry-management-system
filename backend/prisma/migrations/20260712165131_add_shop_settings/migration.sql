-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "shopName" TEXT NOT NULL DEFAULT 'Lava Co. Laundry Hub',
    "shopAddress" TEXT,
    "contactNumber" TEXT,
    "receiptFooter" TEXT NOT NULL DEFAULT 'Thank you for choosing Lava Co. Laundry Hub!',
    "completeServicePrice" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "washAndDryPrice" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "washOnlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "dryOnlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "dryAndFoldPrice" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "foldOnlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "extraRinseFee" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "soapPrice" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "softenerPrice" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "pickupOnlyFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryOnlyFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pickupAndDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maximumWeightPerLoad" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);
