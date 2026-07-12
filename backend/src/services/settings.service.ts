import prisma from "../lib/prisma.js";

type UpdateSettingsData = {
  shopName?: string;
  shopAddress?: string | null;
  contactNumber?: string | null;
  receiptFooter?: string;

  completeServicePrice?: number;
  washAndDryPrice?: number;
  washOnlyPrice?: number;
  dryOnlyPrice?: number;
  dryAndFoldPrice?: number;
  foldOnlyPrice?: number;

  extraRinseFee?: number;

  soapPrice?: number;
  softenerPrice?: number;

  pickupOnlyFee?: number;
  deliveryOnlyFee?: number;
  pickupAndDeliveryFee?: number;

  maximumWeightPerLoad?: number;
};

const SETTINGS_ID = 1;

export const settingsService = {
  getSettings: async () => {
    return prisma.shopSettings.upsert({
      where: {
        id: SETTINGS_ID,
      },

      update: {},

      create: {
        id: SETTINGS_ID,
      },
    });
  },

  updateSettings: async (
    data: UpdateSettingsData
  ) => {
    return prisma.shopSettings.upsert({
      where: {
        id: SETTINGS_ID,
      },

      create: {
        id: SETTINGS_ID,
        ...data,
      },

      update: data,
    });
  },
};