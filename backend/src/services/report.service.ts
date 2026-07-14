import prisma from "../lib/prisma.js";

import {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  TankCycleStatus,
} from "../generated/prisma/client.js";

export type ReportRange = {
  startDate?: Date;
  endDate?: Date;
};

const reportOrderSelection = {
  id: true,
  orderNumber: true,
  createdAt: true,
  paidAt: true,
  totalPrice: true,
  paymentStatus: true,
  status: true,
  refundStatus: true,
  refundAmount: true,
  laundryWeight: true,
  loadCount: true,
  serviceType: true,
  customerId: true,
  isArchived: true,
} as const;

export async function getReportOrders(
  range: ReportRange = {}
) {
  return prisma.order.findMany({
    where: {
      isArchived: false,

      ...(range.startDate &&
      range.endDate
        ? {
            createdAt: {
              gte:
                range.startDate,
              lte:
                range.endDate,
            },
          }
        : {}),
    },

    select:
      reportOrderSelection,

    orderBy: {
      createdAt: "desc",
    },
  });
}

export function calculateReportSummary(
  orders: Awaited<
    ReturnType<
      typeof getReportOrders
    >
  >
) {
  const activeOrders =
    orders.filter(
      (order) =>
        order.status !==
        OrderStatus.CANCELLED
    );

  const paidOrders =
    activeOrders.filter(
      (order) =>
        order.paymentStatus ===
        PaymentStatus.PAID
    );

  const unpaidOrders =
    activeOrders.filter(
      (order) =>
        order.paymentStatus ===
        PaymentStatus.UNPAID
    );

  const cancelledOrders =
    orders.filter(
      (order) =>
        order.status ===
        OrderStatus.CANCELLED
    );

  const validRevenue =
    paidOrders.reduce(
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

  return {
    validRevenue,

    netRevenue:
      validRevenue -
      refundsCompleted,

    unpaidAmount:
      unpaidOrders.reduce(
        (total, order) =>
          total +
          order.totalPrice,
        0
      ),

    totalOrders:
      activeOrders.length,

    paidOrders:
      paidOrders.length,

    unpaidOrders:
      unpaidOrders.length,

    cancelledOrders:
      cancelledOrders.length,

    totalWeight:
      activeOrders.reduce(
        (total, order) =>
          total +
          order.laundryWeight,
        0
      ),

    totalLoads:
      activeOrders.reduce(
        (total, order) =>
          total +
          order.loadCount,
        0
      ),

    averageOrderValue:
      paidOrders.length > 0
        ? validRevenue /
          paidOrders.length
        : 0,

    refundsCompleted,

    refundsPending:
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
  };
}

export function getReportServiceBreakdown(
  orders: Awaited<
    ReturnType<
      typeof getReportOrders
    >
  >
) {
  const grouped =
    new Map<
      string,
      {
        serviceType: string;
        orders: number;
        paidOrders: number;
        loads: number;
        weight: number;
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
        paidOrders: 0,
        loads: 0,
        weight: 0,
        revenue: 0,
      };

    current.orders += 1;
    current.loads +=
      order.loadCount;
    current.weight +=
      order.laundryWeight;

    if (
      order.paymentStatus ===
      PaymentStatus.PAID
    ) {
      current.paidOrders +=
        1;
      current.revenue +=
        order.totalPrice;
    }

    grouped.set(
      order.serviceType,
      current
    );
  }

  return [
    ...grouped.values(),
  ].sort(
    (first, second) =>
      second.revenue -
      first.revenue
  );
}

export async function getOverallOperations() {
  const [
    orders,
    totalCustomers,
    tankReplacements,
  ] = await Promise.all([
    getReportOrders(),

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

  return {
    orders,
    totalCustomers,
    tankReplacements,
  };
}

export const reportService = {
  getReportOrders,
  calculateReportSummary,
  getReportServiceBreakdown,
  getOverallOperations,
};

export default reportService;