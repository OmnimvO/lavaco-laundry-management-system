import prisma from "../lib/prisma.js";
import {
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
  ServiceType,
  SoapType,
  SoftenerType,
  WashType,
} from "../generated/prisma/client.js";

export const orderService = {
  createOrder: async (data: {
    customerId?: number | null;
    walkInCustomerName?: string;
    walkInCustomerPhone?: string;
    walkInCustomerAddress?: string;
    basketCount: number;
    serviceType: ServiceType;
    washType?: WashType | null;
    dryExtend?: boolean;
    serviceFee?: number;
    soap?: SoapType;
    soapPrice?: number;
    softener?: SoftenerType;
    softenerPrice?: number;
    fulfillmentType?: FulfillmentType;
    deliveryFee?: number;
    hasMixedWhiteColor?: boolean;
    receivedBy?: string;
    claimedBy?: string;
    instructions?: string;
    totalPrice: number;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
  }) => {
    const orderCount = await prisma.order.count();
    const orderNumber = `LAV-${String(orderCount + 1).padStart(6, "0")}`;

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
      where: { id },
      include: {
        customer: true,
      },
    });
  },

  updateOrder: async (
    id: number,
    data: {
      customerId?: number | null;
      walkInCustomerName?: string | null;
      walkInCustomerPhone?: string | null;
      walkInCustomerAddress?: string | null;
      basketCount?: number;
      serviceType?: ServiceType;
      washType?: WashType | null;
      dryExtend?: boolean;
      serviceFee?: number;
      soap?: SoapType;
      soapPrice?: number;
      softener?: SoftenerType;
      softenerPrice?: number;
      fulfillmentType?: FulfillmentType;
      deliveryFee?: number;
      hasMixedWhiteColor?: boolean;
      receivedBy?: string | null;
      claimedBy?: string | null;
      instructions?: string | null;
      totalPrice?: number;
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
    }
  ) => {
    return prisma.order.update({
      where: { id },
      data,
      include: {
        customer: true,
      },
    });
  },

  updateOrderStatus: async (id: number, status: OrderStatus) => {
    return prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
      },
    });
  },

  deleteOrder: async (id: number) => {
    return prisma.order.delete({
      where: { id },
    });
  },
};