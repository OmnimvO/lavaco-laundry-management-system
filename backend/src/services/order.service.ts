import prisma from "../lib/prisma.js";

import {
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ServiceType,
} from "../generated/prisma/client.js";

import {
  findOrCreateWalkInCustomer,
} from "./customerMatching.service.js";

type CreateOrderData = {
  customerId?: number | null;

  walkInCustomerName?:
    | string
    | null;

  walkInCustomerPhone?:
    | string
    | null;

  walkInCustomerAddress?:
    | string
    | null;

  laundryWeight: number;
  loadCount: number;

  hasMixedWhiteColor?: boolean;

  instructions?:
    | string
    | null;

  serviceType: ServiceType;

  servicePricePerLoad: number;
  serviceSubtotal: number;

  rinseCycles: number;
  rinseFee: number;

  soapQuantity: number;
  soapPrice: number;

  softenerQuantity: number;
  softenerPrice: number;

  fulfillmentType:
    FulfillmentType;

  deliveryFee: number;

  receivedBy?:
    | string
    | null;

  claimedBy?:
    | string
    | null;

  totalPrice: number;

  status?: OrderStatus;

  paymentStatus?:
    PaymentStatus;

  paidAt?: Date | null;
};

type UpdateOrderData = {
  customerId?: number | null;

  walkInCustomerName?:
    | string
    | null;

  walkInCustomerPhone?:
    | string
    | null;

  walkInCustomerAddress?:
    | string
    | null;

  laundryWeight?: number;
  loadCount?: number;

  hasMixedWhiteColor?: boolean;

  instructions?:
    | string
    | null;

  serviceType?: ServiceType;

  servicePricePerLoad?: number;
  serviceSubtotal?: number;

  rinseCycles?: number;
  rinseFee?: number;

  soapQuantity?: number;
  soapPrice?: number;

  softenerQuantity?: number;
  softenerPrice?: number;

  fulfillmentType?:
    FulfillmentType;

  deliveryFee?: number;

  receivedBy?:
    | string
    | null;

  claimedBy?:
    | string
    | null;

  totalPrice?: number;

  status?: OrderStatus;

  paymentStatus?:
    PaymentStatus;

  paidAt?: Date | null;

  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundedAt?: Date | null;
  refundedBy?: string | null;

  cancellationReason?:
    | string
    | null;

  cancelledAt?: Date | null;
  cancelledBy?: string | null;

  isArchived?: boolean;
  archivedAt?: Date | null;
  archivedBy?: string | null;
};

type UpdateCustomerReferenceData = {
  customerId?: number | null;

  walkInCustomerName?:
    | string
    | null;

  walkInCustomerPhone?:
    | string
    | null;

  walkInCustomerAddress?:
    | string
    | null;
};

const SETTINGS_ID = 1;

async function getNextOrderNumber(
  transaction:
    Prisma.TransactionClient
) {
  const counter =
    await transaction.orderCounter.upsert({
      where: {
        id: 1,
      },

      create: {
        id: 1,
        lastValue: 1,
      },

      update: {
        lastValue: {
          increment: 1,
        },
      },
    });

  return `LAV-${String(
    counter.lastValue
  ).padStart(6, "0")}`;
}

async function resolveCustomerForOrder(
  transaction:
    Prisma.TransactionClient,

  data: UpdateCustomerReferenceData
) {
  if (data.customerId) {
    const existingCustomer =
      await transaction.customer.findFirst({
        where: {
          id: data.customerId,
          isArchived: false,
        },
      });

    if (!existingCustomer) {
      throw new Error(
        "Selected customer was not found or is archived."
      );
    }

    return {
      customer:
        existingCustomer,

      wasCreated: false,

      matchedBy:
        "EXISTING_CUSTOMER" as const,
    };
  }

  if (
    !data.walkInCustomerName?.trim()
  ) {
    throw new Error(
      "Walk-in customer name is required."
    );
  }

  return findOrCreateWalkInCustomer(
    transaction,
    {
      name:
        data.walkInCustomerName,

      phone:
        data.walkInCustomerPhone,

      address:
        data.walkInCustomerAddress,
    }
  );
}

export const orderService = {
  getShopSettings: async () => {
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

  createOrder: async (
    data: CreateOrderData
  ) => {
    return prisma.$transaction(
      async (transaction) => {
        const customerResult =
          await resolveCustomerForOrder(
            transaction,
            {
              customerId:
                data.customerId,

              walkInCustomerName:
                data.walkInCustomerName,

              walkInCustomerPhone:
                data.walkInCustomerPhone,

              walkInCustomerAddress:
                data.walkInCustomerAddress,
            }
          );

        const orderNumber =
          await getNextOrderNumber(
            transaction
          );

        const order =
          await transaction.order.create({
            data: {
              ...data,

              orderNumber,

              customerId:
                customerResult
                  .customer.id,

              walkInCustomerName:
                data.walkInCustomerName ??
                null,

              walkInCustomerPhone:
                data.walkInCustomerPhone ??
                null,

              walkInCustomerAddress:
                data.walkInCustomerAddress ??
                null,
            },

            include: {
              customer: true,
            },
          });

        return {
          order,
          customerResult,
        };
      }
    );
  },

  getAllOrders: async () => {
    return prisma.order.findMany({
      where: {
        isArchived: false,
      },

      include: {
        customer: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  },

  getOrderById: async (
    id: number,
    includeArchived = false
  ) => {
    return prisma.order.findFirst({
      where: {
        id,

        ...(includeArchived
          ? {}
          : {
              isArchived: false,
            }),
      },

      include: {
        customer: true,
      },
    });
  },

  updateOrder: async (
    id: number,
    data: UpdateOrderData
  ) => {
    return prisma.$transaction(
      async (transaction) => {
        let resolvedCustomerId =
          data.customerId;

        if (
          data.customerId !==
            undefined ||
          data.walkInCustomerName !==
            undefined
        ) {
          const customerResult =
            await resolveCustomerForOrder(
              transaction,
              {
                customerId:
                  data.customerId,

                walkInCustomerName:
                  data.walkInCustomerName,

                walkInCustomerPhone:
                  data.walkInCustomerPhone,

                walkInCustomerAddress:
                  data.walkInCustomerAddress,
              }
            );

          resolvedCustomerId =
            customerResult.customer.id;
        }

        return transaction.order.update({
          where: {
            id,
          },

          data: {
            ...data,

            ...(resolvedCustomerId !==
            undefined
              ? {
                  customerId:
                    resolvedCustomerId,
                }
              : {}),
          },

          include: {
            customer: true,
          },
        });
      }
    );
  },

  updateOrderStatus: async (
    id: number,
    status: OrderStatus,
    additionalData:
      Partial<UpdateOrderData> = {}
  ) => {
    return prisma.order.update({
      where: {
        id,
      },

      data: {
        status,
        ...additionalData,
      },

      include: {
        customer: true,
      },
    });
  },

  archiveOrder: async (
    id: number,
    archivedBy: string
  ) => {
    return prisma.order.update({
      where: {
        id,
      },

      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
      },

      include: {
        customer: true,
      },
    });
  },

  getValidRevenueOrders:
    async () => {
      return prisma.order.findMany({
        where: {
          paymentStatus:
            PaymentStatus.PAID,

          status: {
            not:
              OrderStatus.CANCELLED,
          },
        },

        include: {
          customer: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });
    },
};