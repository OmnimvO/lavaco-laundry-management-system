import prisma from "../lib/prisma.js";

import {
  OrderStatus,
  PaymentStatus,
} from "../generated/prisma/client.js";

type CustomerData = {
  name: string;
  phone?: string | null;
  normalizedPhone?:
    | string
    | null;

  normalizedName?:
    | string
    | null;

  address?: string | null;
  normalizedAddress?:
    | string
    | null;
};

type UpdateCustomerData = {
  name?: string;
  phone?: string | null;
  normalizedPhone?:
    | string
    | null;

  normalizedName?:
    | string
    | null;

  address?: string | null;
  normalizedAddress?:
    | string
    | null;
};

function addCustomerStatistics<
  T extends {
    createdAt: Date;
    orders: {
      createdAt: Date;
      totalPrice: number;
      paymentStatus:
        PaymentStatus;
      status: OrderStatus;
    }[];
  }
>(customer: T) {
  const validOrders =
    customer.orders.filter(
      (order) =>
        order.status !==
        OrderStatus.CANCELLED
    );

  const paidOrders =
    validOrders.filter(
      (order) =>
        order.paymentStatus ===
        PaymentStatus.PAID
    );

  const lastVisit =
    validOrders.length > 0
      ? validOrders.reduce(
          (
            latest,
            order
          ) =>
            order.createdAt >
            latest
              ? order.createdAt
              : latest,
          validOrders[0]
            .createdAt
        )
      : null;

  return {
    ...customer,

    customerSince:
      customer.createdAt,

    totalOrders:
      validOrders.length,

    totalSpent:
      paidOrders.reduce(
        (total, order) =>
          total +
          order.totalPrice,
        0
      ),

    lastVisit,
  };
}

const customerOrderSelection = {
  createdAt: true,
  totalPrice: true,
  paymentStatus: true,
  status: true,
} as const;

export const customerService = {
  findCustomerByNormalizedPhone:
    async (
      normalizedPhone: string
    ) => {
      return prisma.customer.findFirst({
        where: {
          normalizedPhone,
          isArchived: false,
        },

        orderBy: {
          createdAt: "asc",
        },
      });
    },

  findDuplicateCustomer:
    async (data: {
      normalizedPhone?:
        | string
        | null;

      normalizedName?:
        | string
        | null;

      normalizedAddress?:
        | string
        | null;

      excludeCustomerId?:
        | number
        | null;
    }) => {
      const exclusion =
        data.excludeCustomerId
          ? {
              id: {
                not:
                  data.excludeCustomerId,
              },
            }
          : {};

      if (data.normalizedPhone) {
        const byPhone =
          await prisma.customer.findFirst({
            where: {
              ...exclusion,

              normalizedPhone:
                data.normalizedPhone,

              isArchived: false,
            },
          });

        if (byPhone) {
          return byPhone;
        }
      }

      if (
        data.normalizedName &&
        data.normalizedAddress
      ) {
        return prisma.customer.findFirst({
          where: {
            ...exclusion,

            normalizedName:
              data.normalizedName,

            normalizedAddress:
              data.normalizedAddress,

            isArchived: false,
          },
        });
      }

      return null;
    },

  createCustomer: async (
    data: CustomerData
  ) => {
    return prisma.customer.create({
      data,
    });
  },

  getAllCustomers: async () => {
    const customers =
      await prisma.customer.findMany({
        where: {
          isArchived: false,
        },

        include: {
          orders: {
            select:
              customerOrderSelection,
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return customers.map(
      addCustomerStatistics
    );
  },

  getCustomerById: async (
    id: number,
    includeArchived = false
  ) => {
    const customer =
      await prisma.customer.findFirst({
        where: {
          id,

          ...(includeArchived
            ? {}
            : {
                isArchived:
                  false,
              }),
        },

        include: {
          orders: {
            select:
              customerOrderSelection,
          },
        },
      });

    return customer
      ? addCustomerStatistics(
          customer
        )
      : null;
  },

  updateCustomer: async (
    id: number,
    data: UpdateCustomerData
  ) => {
    return prisma.customer.update({
      where: {
        id,
      },

      data,
    });
  },

  archiveCustomer: async (
    id: number,
    archivedBy: string
  ) => {
    return prisma.customer.update({
      where: {
        id,
      },

      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
      },
    });
  },
};