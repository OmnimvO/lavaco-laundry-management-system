-- CreateTable
CREATE TABLE "OrderCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderCounter_pkey" PRIMARY KEY ("id")
);
