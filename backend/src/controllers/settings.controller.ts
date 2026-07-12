import type {
  Request,
  Response,
} from "express";

import { settingsService } from "../services/settings.service.js";

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
      const updateData: Record<
        string,
        string | number | null
      > = {};

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

      const settings =
        await settingsService.updateSettings(
          updateData
        );

      return res.json({
        message:
          "Shop settings updated successfully",
        settings,
      });
    } catch (error) {
      console.error(
        "Update settings error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update shop settings",
      });
    }
  },
};