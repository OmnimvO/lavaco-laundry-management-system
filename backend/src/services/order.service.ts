import prisma from "../lib/prisma.js";
import {
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
  ServiceType,
} from "../generated/prisma/client.js";

type CreateOrderData = {
  customerId?: number | null;
  walkInCustomerName?: string | null;
  walkInCustomerPhone?: string | null;
  walkInCustomerAddress?: string | null;

  laundryWeight: number;
  loadCount: number;

  hasMixedWhiteColor?: boolean;
  instructions?: string | null;

  serviceType: ServiceType;
  servicePricePerLoad: number;
  serviceSubtotal: number;

  rinseCycles: number;
  rinseFee: number;

  soapQuantity: number;
  soapPrice: number;

  softenerQuantity: number;
  softenerPrice: number;

  fulfillmentType: FulfillmentType;
  deliveryFee: number;

  receivedBy?: string | null;
  claimedBy?: string | null;

  totalPrice: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paidAt?: Date | null;
};

type UpdateOrderData = {
  customerId?: number | null;
  walkInCustomerName?: string | null;
  walkInCustomerPhone?: string | null;
  walkInCustomerAddress?: string | null;

  laundryWeight?: number;
  loadCount?: number;

  hasMixedWhiteColor?: boolean;
  instructions?: string | null;

  serviceType?: ServiceType;
  servicePricePerLoad?: number;
  serviceSubtotal?: number;

  rinseCycles?: number;
  rinseFee?: number;

  soapQuantity?: number;
  soapPrice?: number;

  softenerQuantity?: number;
  softenerPrice?: number;

  fulfillmentType?: FulfillmentType;
  deliveryFee?: number;

  receivedBy?: string | null;
  claimedBy?: string | null;

  totalPrice?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paidAt?: Date | null;
};

async function getNextOrderNumber() {
  const counter = await prisma.orderCounter.upsert({
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

  return `LAV-${String(counter.lastValue).padStart(
    6,
    "0"
  )}`;
}

export const orderService = {
  createOrder: async (data: CreateOrderData) => {
    const orderNumber = await getNextOrderNumber();

    return prisma.order.create({
      data: {
        ...data,
        orderNumber,
      },
      include: {
        customer: true,
      },
    });
  },

  getAllOrders: async () => {
    return prisma.order.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  getOrderById: async (id: number) => {
    return prisma.order.findUnique({
      where: {
        id,
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
    return prisma.order.update({
      where: {
        id,
      },
      data,
      include: {
        customer: true,
      },
    });
  },

  updateOrderStatus: async (
    id: number,
    status: OrderStatus
  ) => {
    return prisma.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
      include: {
        customer: true,
      },
    });
  },

  deleteOrder: async (id: number) => {
    return prisma.order.delete({
      where: {
        id,
      },
    });
  },
};