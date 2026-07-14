import type {
  Request,
  Response,
} from "express";

import prisma from "../lib/prisma.js";

import {
  EmployeeStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  UserRole,
} from "../generated/prisma/client.js";

import {
  tankCycleService,
} from "../services/tankCycle.service.js";

import {
  notificationService,
} from "../services/notification.service.js";

import {
  getAuthenticatedUser,
  getAuthenticatedUserId,
} from "../utils/authUser.js";

function getStartOfToday() {
  const date = new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

export const dashboardController = {
  getDashboardSummary:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const startOfToday =
          getStartOfToday();

        const userId =
          getAuthenticatedUserId(
            request
          );

        const role =
          getAuthenticatedUser(
            request
          )?.role;

        if (
          !userId ||
          !role ||
          !Object.values(
            UserRole
          ).includes(role)
        ) {
          return response.status(401).json({
            message:
              "Authenticated user details are unavailable.",
          });
        }

        const [
          todayOrders,
          activeCustomers,
          activeEmployees,
          activeInventoryItems,
          readyForPickup,
          outForDelivery,
          pendingRefunds,
          currentTank,
          userNotifications,
          inventoryItems,
        ] = await Promise.all([
          prisma.order.findMany({
            where: {
              createdAt: {
                gte:
                  startOfToday,
              },

              isArchived:
                false,
            },

            select: {
              id: true,
              orderNumber: true,
              totalPrice: true,
              loadCount: true,
              paymentStatus: true,
              status: true,
              createdAt: true,
            },

            orderBy: {
              createdAt:
                "desc",
            },
          }),

          prisma.customer.count({
            where: {
              isArchived:
                false,
            },
          }),

          prisma.employee.count({
            where: {
              isArchived:
                false,

              status:
                EmployeeStatus.ACTIVE,
            },
          }),

          prisma.inventoryItem.count({
            where: {
              isArchived:
                false,

              isActive:
                true,
            },
          }),

          prisma.order.count({
            where: {
              status:
                OrderStatus.READY_FOR_PICKUP,

              isArchived:
                false,
            },
          }),

          prisma.order.count({
            where: {
              status:
                OrderStatus.OUT_FOR_DELIVERY,

              isArchived:
                false,
            },
          }),

          prisma.order.aggregate({
            where: {
              refundStatus:
                RefundStatus.PENDING,
            },

            _count: {
              _all: true,
            },

            _sum: {
              refundAmount:
                true,
            },
          }),

          tankCycleService
            .getTankStatus(),

          notificationService
            .getNotificationsForUser(
              userId,
              role
            ),

          prisma.inventoryItem.findMany({
            where: {
              isArchived:
                false,

              isActive:
                true,
            },

            orderBy: {
              quantity:
                "asc",
            },
          }),
        ]);

        const validTodayOrders =
          todayOrders.filter(
            (order) =>
              order.status !==
              OrderStatus.CANCELLED
          );

        const todayRevenue =
          validTodayOrders
            .filter(
              (order) =>
                order.paymentStatus ===
                PaymentStatus.PAID
            )
            .reduce(
              (total, order) =>
                total +
                order.totalPrice,
              0
            );

        const todayLoads =
          validTodayOrders.reduce(
            (total, order) =>
              total +
              order.loadCount,
            0
          );

        const cancelledToday =
          todayOrders.filter(
            (order) =>
              order.status ===
              OrderStatus.CANCELLED
          ).length;

        const unreadNotifications =
          userNotifications.filter(
            (notification) =>
              notification.reads
                .length === 0
          ).length;

        const lowStockItems =
          inventoryItems
            .filter(
              (item) =>
                item.quantity <=
                item.reorderLevel
            )
            .slice(0, 10);

        return response.json({
          today: {
            revenue:
              todayRevenue,

            orders:
              validTodayOrders.length,

            loads:
              todayLoads,

            cancelledOrders:
              cancelledToday,
          },

          operations: {
            tank:
              currentTank,

            readyForPickup,

            outForDelivery,

            pendingRefunds:
              pendingRefunds
                ._count._all,

            pendingRefundAmount:
              pendingRefunds
                ._sum
                .refundAmount ??
              0,

            unreadNotifications,

            lowStockItems:
              lowStockItems.length,
          },

          activeRecords: {
            customers:
              activeCustomers,

            employees:
              activeEmployees,

            inventoryItems:
              activeInventoryItems,
          },

          lowStockItems,

          recentOrders:
            todayOrders.slice(
              0,
              10
            ),
        });
      } catch (error) {
        console.error(
          "Dashboard summary error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to get dashboard summary.",
        });
      }
    },
};

export default dashboardController;