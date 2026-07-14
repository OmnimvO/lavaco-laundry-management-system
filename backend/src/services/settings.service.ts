import prisma from "../lib/prisma.js";
import {
  TankCycleStatus,
} from "../generated/prisma/client.js";

export type UpdateSettingsData = {
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

  maximumLoadsPerTankCycle?: number;
  tankWarningThreshold?: number;
};

type UpdateSettingsOptions = {
  applyTankLimitToCurrentCycle?: boolean;
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
    data: UpdateSettingsData,
    options: UpdateSettingsOptions = {}
  ) => {
    return prisma.$transaction(
      async (transaction) => {
        const previousSettings =
          await transaction.shopSettings.upsert({
            where: {
              id: SETTINGS_ID,
            },

            update: {},

            create: {
              id: SETTINGS_ID,
            },
          });

        const settings =
          await transaction.shopSettings.update({
            where: {
              id: SETTINGS_ID,
            },

            data,
          });

        let activeTankCycle =
          await transaction.tankCycle.findFirst({
            where: {
              status:
                TankCycleStatus.ACTIVE,
            },

            orderBy: {
              startedAt: "desc",
            },
          });

        if (!activeTankCycle) {
          activeTankCycle =
            await transaction.tankCycle.create({
              data: {
                maximumLoads:
                  settings.maximumLoadsPerTankCycle,
              },
            });
        } else if (
          options.applyTankLimitToCurrentCycle &&
          data.maximumLoadsPerTankCycle !==
            undefined
        ) {
          activeTankCycle =
            await transaction.tankCycle.update({
              where: {
                id: activeTankCycle.id,
              },

              data: {
                maximumLoads:
                  data.maximumLoadsPerTankCycle,
              },
            });
        }

        return {
          settings,
          previousSettings,
          activeTankCycle,
          appliedToCurrentTankCycle:
            Boolean(
              options.applyTankLimitToCurrentCycle &&
                data.maximumLoadsPerTankCycle !==
                  undefined
            ),
        };
      }
    );
  },
};