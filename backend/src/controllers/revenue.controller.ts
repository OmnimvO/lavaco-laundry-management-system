import type {
  Request,
  Response,
} from "express";

import {
  revenueService,
} from "../services/revenue.service.js";

function parseOptionalDate(
  value: unknown,
  endOfDay = false
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const date =
    new Date(
      `${value}T${
        endOfDay
          ? "23:59:59.999"
          : "00:00:00.000"
      }`
    );

  return Number.isNaN(
    date.getTime()
  )
    ? undefined
    : date;
}

export const revenueController = {
  getRevenueReport: async (
    request: Request,
    response: Response
  ) => {
    try {
      const startDate =
        parseOptionalDate(
          request.query.startDate
        );

      const endDate =
        parseOptionalDate(
          request.query.endDate,
          true
        );

      if (
        (startDate &&
          !endDate) ||
        (!startDate &&
          endDate)
      ) {
        return response.status(400).json({
          message:
            "Both startDate and endDate are required for a custom revenue range.",
        });
      }

      if (
        startDate &&
        endDate &&
        startDate > endDate
      ) {
        return response.status(400).json({
          message:
            "The revenue start date cannot be later than the end date.",
        });
      }

      const orders =
        await revenueService
          .getRevenueOrders({
            startDate,
            endDate,
          });

      return response.json({
        startDate:
          startDate ?? null,

        endDate:
          endDate ?? null,

        summary:
          revenueService
            .summarizeRevenue(
              orders
            ),

        orders,
      });
    } catch (error) {
      console.error(
        "Revenue report error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to generate the revenue report.",
      });
    }
  },
};

export default revenueController;