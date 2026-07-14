import type {
  Request,
  Response,
} from "express";

import {
  AuditAction,
  AuditEntityType,
  Prisma,
} from "../generated/prisma/client.js";

import {
  settingsService,
  type UpdateSettingsData,
} from "../services/settings.service.js";

import {
  auditLogService,
} from "../services/auditLog.service.js";

import {
  getAuthenticatedUserName,
} from "../utils/authUser.js";

const PRICE_FIELDS = [
  "completeServicePrice",
  "washAndDryPrice",
  "washOnlyPrice",
  "dryOnlyPrice",
  "dryAndFoldPrice",
  "foldOnlyPrice",
  "extraRinseFee",
  "soapPrice",
  "softenerPrice",
  "pickupOnlyFee",
  "deliveryOnlyFee",
  "pickupAndDeliveryFee",
] as const;

function getOptionalText(
  value: unknown
) {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || null;
}

function parseBoolean(
  value: unknown
) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return false;
}

function toPrismaJson(
  value: unknown
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(
      value,
      (_key, nestedValue) => {
        if (
          nestedValue instanceof Date
        ) {
          return nestedValue.toISOString();
        }

        if (
          nestedValue === undefined
        ) {
          return null;
        }

        return nestedValue;
      }
    )
  ) as Prisma.InputJsonValue;
}

function getChangedFields(
  previousData:
    Record<string, unknown>,

  newData:
    Record<string, unknown>,

  fields:
    string[]
): Prisma.InputJsonValue {
  const changedFields:
    Record<
      string,
      {
        previous:
          unknown;
        next:
          unknown;
      }
    > = {};

  for (const field of fields) {
    const previousValue =
      previousData[field];

    const nextValue =
      newData[field];

    if (
      JSON.stringify(previousValue) !==
      JSON.stringify(nextValue)
    ) {
      changedFields[field] = {
        previous:
          previousValue ??
          null,

        next:
          nextValue ??
          null,
      };
    }
  }

  return toPrismaJson(
    changedFields
  );
}

export const settingsController = {
  getSettings: async (
    _req: Request,
    res: Response
  ) => {
    try {
      const settings =
        await settingsService.getSettings();

      return res.json(settings);
    } catch (error) {
      console.error(
        "Get settings error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get shop settings",
      });
    }
  },

  updateSettings: async (
    req: Request,
    res: Response
  ) => {
    try {
      const currentSettings =
        await settingsService.getSettings();

      const updateData:
        UpdateSettingsData = {};

      if (
        req.body.shopName !== undefined
      ) {
        if (
          typeof req.body.shopName !==
            "string" ||
          !req.body.shopName.trim()
        ) {
          return res.status(400).json({
            message:
              "Shop name is required",
          });
        }

        updateData.shopName =
          req.body.shopName.trim();
      }

      if (
        req.body.receiptFooter !==
        undefined
      ) {
        if (
          typeof req.body.receiptFooter !==
            "string" ||
          !req.body.receiptFooter.trim()
        ) {
          return res.status(400).json({
            message:
              "Receipt footer cannot be empty",
          });
        }

        updateData.receiptFooter =
          req.body.receiptFooter.trim();
      }

      const shopAddress =
        getOptionalText(
          req.body.shopAddress
        );

      if (
        req.body.shopAddress !==
        undefined
      ) {
        updateData.shopAddress =
          shopAddress ?? null;
      }

      const contactNumber =
        getOptionalText(
          req.body.contactNumber
        );

      if (
        req.body.contactNumber !==
        undefined
      ) {
        updateData.contactNumber =
          contactNumber ?? null;
      }

      for (
        const field of PRICE_FIELDS
      ) {
        if (
          req.body[field] === undefined
        ) {
          continue;
        }

        const numericValue = Number(
          req.body[field]
        );

        if (
          !Number.isFinite(
            numericValue
          ) ||
          numericValue < 0
        ) {
          return res.status(400).json({
            message:
              `${field} must be zero or greater`,
          });
        }

        updateData[field] =
          numericValue;
      }

      if (
        req.body.maximumWeightPerLoad !==
        undefined
      ) {
        const maximumWeightPerLoad =
          Number(
            req.body.maximumWeightPerLoad
          );

        if (
          !Number.isFinite(
            maximumWeightPerLoad
          ) ||
          maximumWeightPerLoad <= 0
        ) {
          return res.status(400).json({
            message:
              "Maximum weight per load must be greater than zero",
          });
        }

        updateData.maximumWeightPerLoad =
          maximumWeightPerLoad;
      }

      const nextMaximumLoads =
        req.body.maximumLoadsPerTankCycle !==
        undefined
          ? Number(
              req.body.maximumLoadsPerTankCycle
            )
          : currentSettings
              .maximumLoadsPerTankCycle;

      if (
        !Number.isInteger(
          nextMaximumLoads
        ) ||
        nextMaximumLoads <= 0
      ) {
        return res.status(400).json({
          message:
            "Maximum loads per tank cycle must be a positive whole number",
        });
      }

      if (
        req.body.maximumLoadsPerTankCycle !==
        undefined
      ) {
        updateData.maximumLoadsPerTankCycle =
          nextMaximumLoads;
      }

      const nextWarningThreshold =
        req.body.tankWarningThreshold !==
        undefined
          ? Number(
              req.body.tankWarningThreshold
            )
          : currentSettings
              .tankWarningThreshold;

      if (
        !Number.isInteger(
          nextWarningThreshold
        ) ||
        nextWarningThreshold <= 0
      ) {
        return res.status(400).json({
          message:
            "Tank warning threshold must be a positive whole number",
        });
      }

      if (
        nextWarningThreshold >=
        nextMaximumLoads
      ) {
        return res.status(400).json({
          message:
            "Tank warning threshold must be lower than the maximum loads per tank cycle",
        });
      }

      if (
        req.body.tankWarningThreshold !==
        undefined
      ) {
        updateData.tankWarningThreshold =
          nextWarningThreshold;
      }

      if (
        Object.keys(updateData).length ===
        0
      ) {
        return res.status(400).json({
          message:
            "No valid settings were provided",
        });
      }

      const applyTankLimitToCurrentCycle =
        parseBoolean(
          req.body
            .applyTankLimitToCurrentCycle
        );

      const result =
        await settingsService.updateSettings(
          updateData,
          {
            applyTankLimitToCurrentCycle,
          }
        );

      const performedBy =
        getAuthenticatedUserName(req);

      const changedFields =
        getChangedFields(
          result.previousSettings as unknown as
            Record<string, unknown>,

          result.settings as unknown as
            Record<string, unknown>,

          Object.keys(
            updateData
          )
        );

      await auditLogService.recordAuditLogSafely({
        action:
          AuditAction.UPDATE,

        entityType:
          AuditEntityType.SETTINGS,

        entityId:
          result.settings.id,

        entityName:
          "Shop Settings",

        description:
          "Shop settings were updated.",

        performedBy,

        previousData: {
          changedFields,

          activeTankCycleId:
            result.activeTankCycle.id,

          previousTankMaximum:
            result.previousSettings
              .maximumLoadsPerTankCycle,
        },

        newData: {
          changedFields,

          activeTankCycleId:
            result.activeTankCycle.id,

          activeTankMaximum:
            result.activeTankCycle
              .maximumLoads,

          appliedToCurrentTankCycle:
            result
              .appliedToCurrentTankCycle,
        },
      });

      return res.json({
        message:
          "Shop settings updated successfully",

        settings:
          result.settings,

        tankCycle: {
          id:
            result.activeTankCycle.id,

          currentLoads:
            result.activeTankCycle
              .currentLoads,

          maximumLoads:
            result.activeTankCycle
              .maximumLoads,

          appliedToCurrentCycle:
            result
              .appliedToCurrentTankCycle,

          note:
            result
              .appliedToCurrentTankCycle
              ? "The new maximum was applied to the current tank cycle."
              : "The new maximum will apply automatically to the next tank cycle.",
        },
      });
    } catch (error) {
      console.error(
        "Update settings error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to update shop settings";

      return res.status(500).json({
        message,
      });
    }
  },
};

export default settingsController;