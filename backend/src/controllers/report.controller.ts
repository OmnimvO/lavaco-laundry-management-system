import type {
  Request,
  Response,
} from "express";

import prisma from "../lib/prisma.js";

import {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  TankCycleStatus,
} from "../generated/prisma/client.js";

function parseDate(
  value: unknown
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function getStartOfDay(
  date: Date
) {
  const result = new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function getEndOfDay(
  date: Date
) {
  const result = new Date(date);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
}

function getStartOfWeek(
  date: Date
) {
  const result =
    getStartOfDay(date);

  const day =
    result.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
      difference
  );

  return result;
}

function getEndOfWeek(
  date: Date
) {
  const result =
    getStartOfWeek(date);

  result.setDate(
    result.getDate() + 6
  );

  return getEndOfDay(
    result
  );
}

function getStartOfMonth(
  date: Date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
}

function getEndOfMonth(
  date: Date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
}

function getStartOfYear(
  year: number
) {
  return new Date(
    year,
    0,
    1,
    0,
    0,
    0,
    0
  );
}

function getEndOfYear(
  year: number
) {
  return new Date(
    year,
    11,
    31,
    23,
    59,
    59,
    999
  );
}

function isValidYear(
  value: unknown
) {
  const year = Number(value);

  return Number.isInteger(
    year
  ) &&
    year >= 2000 &&
    year <= 9999
    ? year
    : null;
}

function calculateFinancialSummary(
  orders: {
    totalPrice: number;
    paymentStatus:
      PaymentStatus;
    status:
      OrderStatus;
    refundStatus:
      RefundStatus;
    refundAmount: number;
    loadCount: number;
  }[]
) {
  const grossPayments =
    orders
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

  const validRevenue =
    orders
      .filter(
        (order) =>
          order.paymentStatus ===
            PaymentStatus.PAID &&
          order.status !==
            OrderStatus.CANCELLED
      )
      .reduce(
        (total, order) =>
          total +
          order.totalPrice,
        0
      );

  const cancelledOrderValue =
    orders
      .filter(
        (order) =>
          order.status ===
          OrderStatus.CANCELLED
      )
      .reduce(
        (total, order) =>
          total +
          order.totalPrice,
        0
      );

  const refundsCompleted =
    orders
      .filter(
        (order) =>
          order.refundStatus ===
          RefundStatus.REFUNDED
      )
      .reduce(
        (total, order) =>
          total +
          order.refundAmount,
        0
      );

  const refundsPending =
    orders
      .filter(
        (order) =>
          order.refundStatus ===
          RefundStatus.PENDING
      )
      .reduce(
        (total, order) =>
          total +
          order.refundAmount,
        0
      );

  const validOrders =
    orders.filter(
      (order) =>
        order.status !==
        OrderStatus.CANCELLED
    );

  const totalLoads =
    validOrders.reduce(
      (total, order) =>
        total +
        order.loadCount,
      0
    );

  const averageOrderValue =
    validOrders.length > 0
      ? validRevenue /
        validOrders.length
      : 0;

  return {
    grossPayments,
    validRevenue,
    cancelledOrderValue,
    refundsCompleted,
    refundsPending,
    netRevenue:
      validRevenue -
      refundsCompleted,

    totalOrders:
      validOrders.length,

    cancelledOrders:
      orders.length -
      validOrders.length,

    totalLoads,

    averageOrderValue,
  };
}

async function getOrdersBetween(
  startDate?: Date,
  endDate?: Date
) {
  return prisma.order.findMany({
    where: {
      isArchived: false,

      ...(startDate && endDate
        ? {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {}),
    },

    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      totalPrice: true,
      paymentStatus: true,
      status: true,
      refundStatus: true,
      refundAmount: true,
      loadCount: true,
      serviceType: true,
      customerId: true,
      isArchived: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

function getServiceBreakdown(
  orders: Awaited<
    ReturnType<
      typeof getOrdersBetween
    >
  >
) {
  const grouped =
    new Map<
      string,
      {
        serviceType: string;
        orders: number;
        loads: number;
        revenue: number;
      }
    >();

  for (const order of orders) {
    if (
      order.status ===
      OrderStatus.CANCELLED
    ) {
      continue;
    }

    const current =
      grouped.get(
        order.serviceType
      ) ?? {
        serviceType:
          order.serviceType,
        orders: 0,
        loads: 0,
        revenue: 0,
      };

    current.orders += 1;
    current.loads +=
      order.loadCount;

    if (
      order.paymentStatus ===
      PaymentStatus.PAID
    ) {
      current.revenue +=
        order.totalPrice;
    }

    grouped.set(
      order.serviceType,
      current
    );
  }

  return [...grouped.values()]
    .sort(
      (first, second) =>
        second.revenue -
        first.revenue
    );
}

function buildReportResponse(
  type: string,
  startDate: Date | null,
  endDate: Date | null,
  orders: Awaited<
    ReturnType<
      typeof getOrdersBetween
    >
  >
) {
  return {
    type,
    startDate,
    endDate,
    summary:
      calculateFinancialSummary(
        orders
      ),
    serviceBreakdown:
      getServiceBreakdown(
        orders
      ),
    orders,
  };
}

export const reportController = {
  getDailyReport: async (
    request: Request,
    response: Response
  ) => {
    try {
      const selectedDate =
        parseDate(
          request.query.date
        ) ?? new Date();

      const startDate =
        getStartOfDay(
          selectedDate
        );

      const endDate =
        getEndOfDay(
          selectedDate
        );

      const orders =
        await getOrdersBetween(
          startDate,
          endDate
        );

      return response.json(
        buildReportResponse(
          "DAILY",
          startDate,
          endDate,
          orders
        )
      );
    } catch (error) {
      console.error(
        "Daily report error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to generate daily report.",
      });
    }
  },

  getWeeklyReport: async (
    request: Request,
    response: Response
  ) => {
    try {
      const selectedDate =
        parseDate(
          request.query.date
        ) ?? new Date();

      const startDate =
        getStartOfWeek(
          selectedDate
        );

      const endDate =
        getEndOfWeek(
          selectedDate
        );

      const orders =
        await getOrdersBetween(
          startDate,
          endDate
        );

      return response.json(
        buildReportResponse(
          "WEEKLY",
          startDate,
          endDate,
          orders
        )
      );
    } catch (error) {
      console.error(
        "Weekly report error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to generate weekly report.",
      });
    }
  },

  getMonthlyReport: async (
    request: Request,
    response: Response
  ) => {
    try {
      const selectedDate =
        parseDate(
          request.query.date
        ) ?? new Date();

      const startDate =
        getStartOfMonth(
          selectedDate
        );

      const endDate =
        getEndOfMonth(
          selectedDate
        );

      const orders =
        await getOrdersBetween(
          startDate,
          endDate
        );

      return response.json(
        buildReportResponse(
          "MONTHLY",
          startDate,
          endDate,
          orders
        )
      );
    } catch (error) {
      console.error(
        "Monthly report error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to generate monthly report.",
      });
    }
  },

  getYearlyReport: async (
    request: Request,
    response: Response
  ) => {
    try {
      const year =
        isValidYear(
          request.query.year
        ) ??
        new Date().getFullYear();

      const startDate =
        getStartOfYear(year);

      const endDate =
        getEndOfYear(year);

      const orders =
        await getOrdersBetween(
          startDate,
          endDate
        );

      const monthlyBreakdown =
        Array.from(
          {
            length: 12,
          },
          (_, monthIndex) => {
            const monthOrders =
              orders.filter(
                (order) =>
                  new Date(
                    order.createdAt
                  ).getMonth() ===
                  monthIndex
              );

            return {
              month:
                monthIndex + 1,

              summary:
                calculateFinancialSummary(
                  monthOrders
                ),
            };
          }
        );

      return response.json({
        ...buildReportResponse(
          "YEARLY",
          startDate,
          endDate,
          orders
        ),

        year,

        monthlyBreakdown,
      });
    } catch (error) {
      console.error(
        "Yearly report error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to generate yearly report.",
      });
    }
  },

  getOverallReport: async (
    _request: Request,
    response: Response
  ) => {
    try {
      const [
        orders,
        totalCustomers,
        tankReplacements,
      ] = await Promise.all([
        getOrdersBetween(),

        prisma.customer.count({
          where: {
            isArchived: false,
          },
        }),

        prisma.tankCycle.findMany({
          where: {
            status:
              TankCycleStatus.REPLACED,
          },

          orderBy: {
            replacedAt: "desc",
          },
        }),
      ]);

      const summary =
        calculateFinancialSummary(
          orders
        );

      const serviceBreakdown =
        getServiceBreakdown(
          orders
        );

      const bestService =
        serviceBreakdown[0] ??
        null;

      const monthlyMap =
        new Map<
          string,
          {
            year: number;
            month: number;
            revenue: number;
            orders: number;
            loads: number;
          }
        >();

      for (const order of orders) {
        if (
          order.status ===
          OrderStatus.CANCELLED
        ) {
          continue;
        }

        const date =
          new Date(
            order.createdAt
          );

        const key =
          `${date.getFullYear()}-${date.getMonth() + 1}`;

        const current =
          monthlyMap.get(key) ?? {
            year:
              date.getFullYear(),

            month:
              date.getMonth() + 1,

            revenue: 0,
            orders: 0,
            loads: 0,
          };

        current.orders += 1;
        current.loads +=
          order.loadCount;

        if (
          order.paymentStatus ===
          PaymentStatus.PAID
        ) {
          current.revenue +=
            order.totalPrice;
        }

        monthlyMap.set(
          key,
          current
        );
      }

      const bestMonth =
        [...monthlyMap.values()]
          .sort(
            (first, second) =>
              second.revenue -
              first.revenue
          )[0] ?? null;

      const averageLoadsPerTankCycle =
        tankReplacements.length > 0
          ? tankReplacements.reduce(
              (total, cycle) =>
                total +
                cycle.currentLoads,
              0
            ) /
            tankReplacements.length
          : 0;

      const exceededTankCycles =
        tankReplacements.filter(
          (cycle) =>
            cycle.currentLoads >
            cycle.maximumLoads
        ).length;

      return response.json({
        type: "OVERALL",
        summary: {
          ...summary,
          totalCustomers,
          tankReplacementCount:
            tankReplacements.length,
          averageLoadsPerTankCycle,
          exceededTankCycles,
        },
        bestService,
        bestMonth,
        serviceBreakdown,
        tankReplacementHistory:
          tankReplacements,
      });
    } catch (error) {
      console.error(
        "Overall report error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to generate overall report.",
      });
    }
  },

  getRefundReport: async (
    _request: Request,
    response: Response
  ) => {
    try {
      const orders =
        await prisma.order.findMany({
          where: {
            refundStatus: {
              in: [
                RefundStatus.PENDING,
                RefundStatus.REFUNDED,
              ],
            },
          },

          include: {
            customer: true,
          },

          orderBy: {
            cancelledAt: "desc",
          },
        });

      return response.json({
        pending:
          orders.filter(
            (order) =>
              order.refundStatus ===
              RefundStatus.PENDING
          ),

        refunded:
          orders.filter(
            (order) =>
              order.refundStatus ===
              RefundStatus.REFUNDED
          ),

        summary: {
          pendingAmount:
            orders
              .filter(
                (order) =>
                  order.refundStatus ===
                  RefundStatus.PENDING
              )
              .reduce(
                (total, order) =>
                  total +
                  order.refundAmount,
                0
              ),

          refundedAmount:
            orders
              .filter(
                (order) =>
                  order.refundStatus ===
                  RefundStatus.REFUNDED
              )
              .reduce(
                (total, order) =>
                  total +
                  order.refundAmount,
                0
              ),
        },
      });
    } catch (error) {
      console.error(
        "Refund report error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to generate refund report.",
      });
    }
  },
};

export default reportController;