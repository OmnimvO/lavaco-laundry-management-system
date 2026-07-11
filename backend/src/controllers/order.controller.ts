import type { Request, Response } from "express";
import { orderService } from "../services/order.service.js";

const MAX_KG_PER_LOAD = 8;

const SERVICE_PRICES: Record<string, number> = {
  WASH_ONLY: 60,
  DRY_ONLY: 70,
  FOLD_ONLY: 20,
  WASH_AND_DRY: 140,
  DRY_AND_FOLD: 100,
  COMPLETE_SERVICE: 160,
};

const FULFILLMENT_FEES: Record<string, number> = {
  NONE: 0,
  PICKUP_ONLY: 25,
  DELIVERY_ONLY: 25,
  PICKUP_AND_DELIVERY: 50,
};

const VALID_ORDER_STATUSES = new Set([
  "RECEIVED",
  "WASHING",
  "DRYING",
  "FOLDING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
]);

function calculateOrderPricing(data: {
  laundryWeight: number;
  serviceType: string;
  rinseCycles: number;
  soapQuantity: number;
  softenerQuantity: number;
  fulfillmentType: string;
}) {
  const {
    laundryWeight,
    serviceType,
    rinseCycles,
    soapQuantity,
    softenerQuantity,
    fulfillmentType,
  } = data;

  const loadCount = Math.ceil(
    laundryWeight / MAX_KG_PER_LOAD
  );

  const servicePricePerLoad =
    SERVICE_PRICES[serviceType];

  if (servicePricePerLoad === undefined) {
    throw new Error("Invalid service type");
  }

  const serviceSubtotal =
    servicePricePerLoad * loadCount;

  // Two rinse cycles are included.
  // Choosing 3, 4, or 5 adds one flat ₱20 charge.
  const rinseFee = rinseCycles > 2 ? 20 : 0;

  const soapPrice = soapQuantity * 20;
  const softenerPrice = softenerQuantity * 15;

  const deliveryFee =
    FULFILLMENT_FEES[fulfillmentType];

  if (deliveryFee === undefined) {
    throw new Error("Invalid fulfillment type");
  }

  const totalPrice =
    serviceSubtotal +
    rinseFee +
    soapPrice +
    softenerPrice +
    deliveryFee;

  return {
    loadCount,
    servicePricePerLoad,
    serviceSubtotal,
    rinseFee,
    soapPrice,
    softenerPrice,
    deliveryFee,
    totalPrice,
  };
}

function validateOrderInput(data: {
  customerId?: number | string | null;
  walkInCustomerName?: string;
  laundryWeight: number;
  soapQuantity: number;
  softenerQuantity: number;
  serviceType: string;
  rinseCycles: number;
  fulfillmentType: string;
}) {
  if (
    !data.customerId &&
    !data.walkInCustomerName?.trim()
  ) {
    return (
      "Select an existing customer or enter " +
      "a walk-in customer name"
    );
  }

  if (
    !Number.isFinite(data.laundryWeight) ||
    data.laundryWeight <= 0
  ) {
    return "Laundry weight must be greater than 0";
  }

  if (
    SERVICE_PRICES[data.serviceType] === undefined
  ) {
    return "Invalid service type";
  }

  if (
    !Number.isInteger(data.rinseCycles) ||
    data.rinseCycles < 2 ||
    data.rinseCycles > 5
  ) {
    return "Rinse cycles must be between 2 and 5";
  }

  if (
    FULFILLMENT_FEES[data.fulfillmentType] ===
    undefined
  ) {
    return "Invalid fulfillment type";
  }

  if (
  !Number.isInteger(data.soapQuantity) ||
  data.soapQuantity < 0
  ) {
    return "Soap quantity must be a whole number of 0 or greater";
  }

  if (
    !Number.isInteger(data.softenerQuantity) ||
    data.softenerQuantity < 0
  ) {
    return "Softener quantity must be a whole number of 0 or greater";
  }

  return null;
}

function requiresDelivery(
  fulfillmentType: string
) {
  return (
    fulfillmentType === "DELIVERY_ONLY" ||
    fulfillmentType === "PICKUP_AND_DELIVERY"
  );
}

function getAllowedStatuses(
  currentStatus: string,
  fulfillmentType: string
) {
  switch (currentStatus) {
    case "RECEIVED":
      return [
        "RECEIVED",
        "WASHING",
        "CANCELLED",
      ];

    case "WASHING":
      return [
        "WASHING",
        "DRYING",
        "CANCELLED",
      ];

    case "DRYING":
      return [
        "DRYING",
        "FOLDING",
        "CANCELLED",
      ];

    case "FOLDING":
      if (requiresDelivery(fulfillmentType)) {
        return [
          "FOLDING",
          "OUT_FOR_DELIVERY",
          "CANCELLED",
        ];
      }

      return [
        "FOLDING",
        "READY_FOR_PICKUP",
        "CANCELLED",
      ];

    case "READY_FOR_PICKUP":
      return [
        "READY_FOR_PICKUP",
        "COMPLETED",
        "CANCELLED",
      ];

    case "OUT_FOR_DELIVERY":
      return [
        "OUT_FOR_DELIVERY",
        "COMPLETED",
        "CANCELLED",
      ];

    case "COMPLETED":
      return ["COMPLETED"];

    case "CANCELLED":
      return ["CANCELLED"];

    default:
      return [];
  }
}

function validateStatusTransition(data: {
  currentStatus: string;
  nextStatus: string;
  fulfillmentType: string;
}) {
  const {
    currentStatus,
    nextStatus,
    fulfillmentType,
  } = data;

  if (!VALID_ORDER_STATUSES.has(nextStatus)) {
    return "Invalid order status";
  }

  const allowedStatuses = getAllowedStatuses(
    currentStatus,
    fulfillmentType
  );

  if (!allowedStatuses.includes(nextStatus)) {
    return (
      `Invalid status transition from ` +
      `${currentStatus} to ${nextStatus}`
    );
  }

  return null;
}

export const orderController = {
  createOrder: async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        customerId,
        walkInCustomerName,
        walkInCustomerPhone,
        walkInCustomerAddress,

        laundryWeight,
        serviceType,
        rinseCycles = 2,

        soapQuantity = 0,
        softenerQuantity = 0,

        fulfillmentType = "NONE",

        hasMixedWhiteColor = false,
        instructions,
        receivedBy,
        claimedBy,

        paymentStatus = "UNPAID",
      } = req.body;

      const numericLaundryWeight =
        Number(laundryWeight);

      const numericRinseCycles =
        Number(rinseCycles);

      const numericSoapQuantity =
      Number(soapQuantity);

      const numericSoftenerQuantity =
      Number(softenerQuantity);

      const validationError =
        validateOrderInput({
          customerId,
          walkInCustomerName,
          laundryWeight:
            numericLaundryWeight,
          soapQuantity: numericSoapQuantity,
          softenerQuantity: numericSoftenerQuantity,
          serviceType,
          rinseCycles:
            numericRinseCycles,
          fulfillmentType,
        });

      if (validationError) {
        return res.status(400).json({
          message: validationError,
        });
      }

      const pricing = calculateOrderPricing({
        laundryWeight:
          numericLaundryWeight,
        serviceType,
        rinseCycles:
          numericRinseCycles,
        soapQuantity: numericSoapQuantity,
        softenerQuantity: numericSoftenerQuantity,
        fulfillmentType,
      });

      const order =
        await orderService.createOrder({
          customerId: customerId
            ? Number(customerId)
            : null,

          walkInCustomerName:
            walkInCustomerName?.trim() ||
            null,

          walkInCustomerPhone:
            walkInCustomerPhone?.trim() ||
            null,

          walkInCustomerAddress:
            walkInCustomerAddress?.trim() ||
            null,

          laundryWeight:
            numericLaundryWeight,

          loadCount:
            pricing.loadCount,

          hasMixedWhiteColor:
            Boolean(hasMixedWhiteColor),

          instructions:
            instructions?.trim() || null,

          serviceType,

          servicePricePerLoad:
            pricing.servicePricePerLoad,

          serviceSubtotal:
            pricing.serviceSubtotal,

          rinseCycles:
            numericRinseCycles,

          rinseFee:
            pricing.rinseFee,

          soapQuantity: numericSoapQuantity,
          soapPrice: pricing.soapPrice,

          softenerQuantity: numericSoftenerQuantity,
          softenerPrice: pricing.softenerPrice,

          fulfillmentType,

          deliveryFee:
            pricing.deliveryFee,

          receivedBy:
            receivedBy?.trim() || null,

          claimedBy:
            claimedBy?.trim() || null,

          totalPrice:
            pricing.totalPrice,

          // Every new order must begin here.
          status: "RECEIVED",

          paymentStatus,
        });

      return res.status(201).json(order);
    } catch (error) {
      console.error(
        "Create order error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to create order";

      return res.status(500).json({
        message,
      });
    }
  },

  getAllOrders: async (
    _req: Request,
    res: Response
  ) => {
    try {
      const orders =
        await orderService.getAllOrders();

      return res.json(orders);
    } catch (error) {
      console.error(
        "Get orders error:",
        error
      );

      return res.status(500).json({
        message: "Failed to get orders",
      });
    }
  },

  getOrderById: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = Number(req.params.id);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      const order =
        await orderService.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      return res.json(order);
    } catch (error) {
      console.error(
        "Get order error:",
        error
      );

      return res.status(500).json({
        message: "Failed to get order",
      });
    }
  },

  updateOrder: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = Number(req.params.id);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      const existingOrder =
        await orderService.getOrderById(id);

      if (!existingOrder) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      const customerId =
        req.body.customerId !== undefined
          ? req.body.customerId
          : existingOrder.customerId;

      const walkInCustomerName =
        req.body.walkInCustomerName !== undefined
          ? req.body.walkInCustomerName
          : existingOrder.walkInCustomerName;

      const walkInCustomerPhone =
        req.body.walkInCustomerPhone !== undefined
          ? req.body.walkInCustomerPhone
          : existingOrder.walkInCustomerPhone;

      const walkInCustomerAddress =
        req.body.walkInCustomerAddress !== undefined
          ? req.body.walkInCustomerAddress
          : existingOrder.walkInCustomerAddress;

      const laundryWeight = Number(
        req.body.laundryWeight ??
          existingOrder.laundryWeight
      );

      const serviceType =
        req.body.serviceType ??
        existingOrder.serviceType;

      const rinseCycles = Number(
        req.body.rinseCycles ??
          existingOrder.rinseCycles
      );

      const soapQuantity = Number(
        req.body.soapQuantity ??
          existingOrder.soapQuantity
      );

      const softenerQuantity = Number(
        req.body.softenerQuantity ??
          existingOrder.softenerQuantity
      );

      const fulfillmentType =
        req.body.fulfillmentType ??
        existingOrder.fulfillmentType;

      const nextStatus =
        req.body.status ??
        existingOrder.status;

      const validationError =
        validateOrderInput({
          customerId,
          walkInCustomerName:
            walkInCustomerName ?? undefined,
          laundryWeight,
          soapQuantity,
          softenerQuantity,
          serviceType,
          rinseCycles,
          fulfillmentType,
        });

      if (validationError) {
        return res.status(400).json({
          message: validationError,
        });
      }

      const statusError =
        validateStatusTransition({
          currentStatus:
            existingOrder.status,

          nextStatus,

          fulfillmentType,
        });

      if (statusError) {
        return res.status(400).json({
          message: statusError,
        });
      }

      const pricing =
        calculateOrderPricing({
          laundryWeight,
          serviceType,
          rinseCycles,
          soapQuantity,
          softenerQuantity,
          fulfillmentType,
        });

      const order =
        await orderService.updateOrder(
          id,
          {
            customerId: customerId
              ? Number(customerId)
              : null,

            walkInCustomerName:
              walkInCustomerName?.trim() ||
              null,

            walkInCustomerPhone:
              walkInCustomerPhone?.trim() ||
              null,

            walkInCustomerAddress:
              walkInCustomerAddress?.trim() ||
              null,

            laundryWeight,

            loadCount:
              pricing.loadCount,

            hasMixedWhiteColor:
              req.body
                .hasMixedWhiteColor !==
              undefined
                ? Boolean(
                    req.body
                      .hasMixedWhiteColor
                  )
                : existingOrder
                    .hasMixedWhiteColor,

            instructions:
              req.body.instructions !==
              undefined
                ? req.body.instructions
                    ?.trim() || null
                : existingOrder.instructions,

            serviceType,

            servicePricePerLoad:
              pricing.servicePricePerLoad,

            serviceSubtotal:
              pricing.serviceSubtotal,

            rinseCycles,

            rinseFee:
              pricing.rinseFee,

            soapQuantity,
            soapPrice: pricing.soapPrice,

            softenerQuantity,
            softenerPrice: pricing.softenerPrice,

            fulfillmentType,

            deliveryFee:
              pricing.deliveryFee,

            receivedBy:
              req.body.receivedBy !==
              undefined
                ? req.body.receivedBy
                    ?.trim() || null
                : existingOrder.receivedBy,

            claimedBy:
              req.body.claimedBy !==
              undefined
                ? req.body.claimedBy
                    ?.trim() || null
                : existingOrder.claimedBy,

            totalPrice:
              pricing.totalPrice,

            status: nextStatus,

            paymentStatus:
              req.body.paymentStatus ??
              existingOrder.paymentStatus,
          }
        );

      return res.json(order);
    } catch (error) {
      console.error(
        "Update order error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to update order";

      return res.status(500).json({
        message,
      });
    }
  },

  updateOrderStatus: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      if (!status) {
        return res.status(400).json({
          message: "Status is required",
        });
      }

      const existingOrder =
        await orderService.getOrderById(id);

      if (!existingOrder) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      const statusError =
        validateStatusTransition({
          currentStatus:
            existingOrder.status,

          nextStatus: status,

          fulfillmentType:
            existingOrder.fulfillmentType,
        });

      if (statusError) {
        return res.status(400).json({
          message: statusError,
        });
      }

      const order =
        await orderService.updateOrderStatus(
          id,
          status
        );

      return res.json(order);
    } catch (error) {
      console.error(
        "Update status error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to update order status";

      return res.status(500).json({
        message,
      });
    }
  },

  deleteOrder: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = Number(req.params.id);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      const existingOrder =
        await orderService.getOrderById(id);

      if (!existingOrder) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      await orderService.deleteOrder(id);

      return res.json({
        message:
          "Order deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete order error:",
        error
      );

      return res.status(500).json({
        message: "Failed to delete order",
      });
    }
  },
};