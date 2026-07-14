import prisma from "../lib/prisma.js";

import {
  OrderStatus,
  PaymentStatus,
} from "../generated/prisma/client.js";

export type RevenueRange = {
  startDate?: Date;
  endDate?: Date;
};

export const revenueService = {
  getRevenueOrders: async (
    range: RevenueRange = {}
  ) => {
    return prisma.order.findMany({
      where: {
        isArchived: false,

        status: {
          not:
            OrderStatus.CANCELLED,
        },

        paymentStatus:
          PaymentStatus.PAID,

        ...(range.startDate &&
        range.endDate
          ? {
              OR: [
                {
                  paidAt: {
                    gte:
                      range.startDate,
                    lte:
                      range.endDate,
                  },
                },
                {
                  paidAt: null,

                  createdAt: {
                    gte:
                      range.startDate,
                    lte:
                      range.endDate,
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        customer: true,
      },

      orderBy: [
        {
          paidAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });
  },

  summarizeRevenue: (
    orders: {
      totalPrice: number;
      laundryWeight: number;
      loadCount: number;
    }[]
  ) => {
    const totalRevenue =
      orders.reduce(
        (total, order) =>
          total +
          order.totalPrice,
        0
      );

    return {
      totalRevenue,

      paidOrders:
        orders.length,

      totalWeight:
        orders.reduce(
          (total, order) =>
            total +
            order.laundryWeight,
          0
        ),

      totalLoads:
        orders.reduce(
          (total, order) =>
            total +
            order.loadCount,
          0
        ),

      averageSale:
        orders.length > 0
          ? totalRevenue /
            orders.length
          : 0,
    };
  },
};

export default revenueService;