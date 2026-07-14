import type {
  Request,
  Response,
} from "express";

import prisma from "../lib/prisma.js";

import {
  AuditAction,
  AuditEntityType,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
} from "../generated/prisma/client.js";

import {
  getAuthenticatedUserName,
} from "../utils/authUser.js";

import {
  auditLogService,
} from "../services/auditLog.service.js";

function parsePositiveInteger(
  value:
    | string
    | string[]
    | undefined
) {
  const rawValue =
    Array.isArray(value)
      ? value[0]
      : value;

  const id = Number(rawValue);

  return (
    Number.isInteger(id) &&
    id > 0
      ? id
      : null
  );
}

function parseRefundAmount(
  value: unknown
) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return null;
  }

  return amount;
}

export const refundController = {
  getRefunds: async (
    request: Request,
    response: Response
  ) => {
    try {
      const statusQuery =
        typeof request.query.status ===
        "string"
          ? request.query.status
          : null;

      const refundStatus =
        statusQuery &&
        Object.values(
          RefundStatus
        ).includes(
          statusQuery as RefundStatus
        )
          ? (statusQuery as RefundStatus)
          : null;

      const orders =
        await prisma.order.findMany({
          where: {
            status:
              OrderStatus.CANCELLED,

            paymentStatus:
              PaymentStatus.PAID,

            ...(refundStatus
              ? {
                  refundStatus,
                }
              : {
                  refundStatus: {
                    in: [
                      RefundStatus.PENDING,
                      RefundStatus.REFUNDED,
                    ],
                  },
                }),
          },

          include: {
            customer: true,
          },

          orderBy: [
            {
              refundStatus: "asc",
            },
            {
              cancelledAt: "desc",
            },
          ],
        });

      const pendingOrders =
        orders.filter(
          (order) =>
            order.refundStatus ===
            RefundStatus.PENDING
        );

      const refundedOrders =
        orders.filter(
          (order) =>
            order.refundStatus ===
            RefundStatus.REFUNDED
        );

      return response.json({
        summary: {
          total:
            orders.length,

          pending:
            pendingOrders.length,

          refunded:
            refundedOrders.length,

          pendingAmount:
            pendingOrders.reduce(
              (total, order) =>
                total +
                order.refundAmount,
              0
            ),

          refundedAmount:
            refundedOrders.reduce(
              (total, order) =>
                total +
                order.refundAmount,
              0
            ),
        },

        orders,
      });
    } catch (error) {
      console.error(
        "Get refunds error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to get refunds.",
      });
    }
  },

  getRefundByOrderId: async (
    request: Request,
    response: Response
  ) => {
    try {
      const orderId =
        parsePositiveInteger(
          request.params.orderId
        );

      if (!orderId) {
        return response.status(400).json({
          message:
            "Invalid order ID.",
        });
      }

      const order =
        await prisma.order.findFirst({
          where: {
            id: orderId,

            status:
              OrderStatus.CANCELLED,

            paymentStatus:
              PaymentStatus.PAID,
          },

          include: {
            customer: true,
          },
        });

      if (!order) {
        return response.status(404).json({
          message:
            "Refund record was not found.",
        });
      }

      return response.json(order);
    } catch (error) {
      console.error(
        "Get refund error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to get refund.",
      });
    }
  },

  markRefunded: async (
    request: Request,
    response: Response
  ) => {
    try {
      const orderId =
        parsePositiveInteger(
          request.params.orderId
        );

      if (!orderId) {
        return response.status(400).json({
          message:
            "Invalid order ID.",
        });
      }

      const existingOrder =
        await prisma.order.findUnique({
          where: {
            id: orderId,
          },

          include: {
            customer: true,
          },
        });

      if (!existingOrder) {
        return response.status(404).json({
          message:
            "Order was not found.",
        });
      }

      if (
        existingOrder.status !==
        OrderStatus.CANCELLED
      ) {
        return response.status(400).json({
          message:
            "Only cancelled orders can be refunded.",
        });
      }

      if (
        existingOrder.paymentStatus !==
        PaymentStatus.PAID
      ) {
        return response.status(400).json({
          message:
            "This order has no recorded payment to refund.",
        });
      }

      if (
        existingOrder.refundStatus ===
        RefundStatus.REFUNDED
      ) {
        return response.status(409).json({
          message:
            "This order has already been refunded.",
        });
      }

      const requestedAmount =
        request.body?.refundAmount ===
        undefined
          ? existingOrder.refundAmount ||
            existingOrder.totalPrice
          : parseRefundAmount(
              request.body.refundAmount
            );

      if (
        requestedAmount === null ||
        requestedAmount <= 0
      ) {
        return response.status(400).json({
          message:
            "Refund amount must be greater than zero.",
        });
      }

      if (
        requestedAmount >
        existingOrder.totalPrice
      ) {
        return response.status(400).json({
          message:
            "Refund amount cannot exceed the order total.",
        });
      }

      const performedBy =
        getAuthenticatedUserName(
          request
        );

      const refundedAt =
        new Date();

      const order =
        await prisma.order.update({
          where: {
            id: orderId,
          },

          data: {
            refundStatus:
              RefundStatus.REFUNDED,

            refundAmount:
              requestedAmount,

            refundedAt,

            refundedBy:
              performedBy,
          },

          include: {
            customer: true,
          },
        });

      await auditLogService.recordAuditLogSafely({
        action:
          AuditAction.REFUND_CHANGE,

        entityType:
          AuditEntityType.ORDER,

        entityId:
          order.id,

        entityName:
          order.orderNumber,

        description:
          `Refund for ${order.orderNumber} was completed in the amount of ₱${requestedAmount.toFixed(
            2
          )}.`,

        performedBy,

        previousData: {
          refundStatus:
            existingOrder.refundStatus,

          refundAmount:
            existingOrder.refundAmount,

          refundedAt:
            existingOrder.refundedAt
              ?.toISOString() ??
            null,

          refundedBy:
            existingOrder.refundedBy,
        },

        newData: {
          refundStatus:
            order.refundStatus,

          refundAmount:
            order.refundAmount,

          refundedAt:
            order.refundedAt
              ?.toISOString() ??
            null,

          refundedBy:
            order.refundedBy,
        },
      });

      return response.json({
        message:
          "Refund marked as completed.",

        order,
      });
    } catch (error) {
      console.error(
        "Complete refund error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to complete refund.",
      });
    }
  },

  reopenRefund: async (
    request: Request,
    response: Response
  ) => {
    try {
      const orderId =
        parsePositiveInteger(
          request.params.orderId
        );

      if (!orderId) {
        return response.status(400).json({
          message:
            "Invalid order ID.",
        });
      }

      const existingOrder =
        await prisma.order.findUnique({
          where: {
            id: orderId,
          },
        });

      if (!existingOrder) {
        return response.status(404).json({
          message:
            "Order was not found.",
        });
      }

      if (
        existingOrder.status !==
          OrderStatus.CANCELLED ||
        existingOrder.paymentStatus !==
          PaymentStatus.PAID
      ) {
        return response.status(400).json({
          message:
            "Only paid cancelled orders can have a pending refund.",
        });
      }

      const performedBy =
        getAuthenticatedUserName(
          request
        );

      const order =
        await prisma.order.update({
          where: {
            id: orderId,
          },

          data: {
            refundStatus:
              RefundStatus.PENDING,

            refundAmount:
              existingOrder.totalPrice,

            refundedAt: null,
            refundedBy: null,
          },
        });

      await auditLogService.recordAuditLogSafely({
        action:
          AuditAction.REFUND_CHANGE,

        entityType:
          AuditEntityType.ORDER,

        entityId:
          order.id,

        entityName:
          order.orderNumber,

        description:
          `Refund for ${order.orderNumber} was returned to pending status.`,

        performedBy,

        previousData: {
          refundStatus:
            existingOrder.refundStatus,

          refundAmount:
            existingOrder.refundAmount,
        },

        newData: {
          refundStatus:
            order.refundStatus,

          refundAmount:
            order.refundAmount,
        },
      });

      return response.json({
        message:
          "Refund returned to pending status.",

        order,
      });
    } catch (error) {
      console.error(
        "Reopen refund error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to reopen refund.",
      });
    }
  },
};

export default refundController;