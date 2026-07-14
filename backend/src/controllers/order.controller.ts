import type {
  Request,
  Response,
} from "express";

import {
  AuditAction,
  AuditEntityType,
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ServiceType,
} from "../generated/prisma/client.js";

import { orderService } from "../services/order.service.js";
import { auditLogService } from "../services/auditLog.service.js";
import { tankCycleService } from "../services/tankCycle.service.js";
import { inventoryService } from "../services/inventory.service.js";

import {
  getAuthenticatedUserName,
} from "../utils/authUser.js";

import {
  normalizePhilippinePhone,
} from "../utils/philippinePhone.js";

const VALID_SERVICE_TYPES =
  new Set<ServiceType>(
    Object.values(ServiceType)
  );

const VALID_FULFILLMENT_TYPES =
  new Set<FulfillmentType>(
    Object.values(FulfillmentType)
  );

const VALID_PAYMENT_STATUSES =
  new Set<PaymentStatus>(
    Object.values(PaymentStatus)
  );

const VALID_ORDER_STATUSES =
  new Set<OrderStatus>(
    Object.values(OrderStatus)
  );

type ShopPricingSettings = {
  completeServicePrice: number;
  washAndDryPrice: number;
  washOnlyPrice: number;
  dryOnlyPrice: number;
  dryAndFoldPrice: number;
  foldOnlyPrice: number;

  extraRinseFee: number;

  soapPrice: number;
  softenerPrice: number;

  pickupOnlyFee: number;
  deliveryOnlyFee: number;
  pickupAndDeliveryFee: number;

  maximumWeightPerLoad: number;
};

type PricingInput = {
  laundryWeight: number;
  serviceType: ServiceType;
  rinseCycles: number;
  soapQuantity: number;
  softenerQuantity: number;
  fulfillmentType: FulfillmentType;
};

function parsePositiveInteger(
  value:
    | string
    | string[]
    | number
    | null
    | undefined
) {
  const rawValue = Array.isArray(value)
    ? value[0]
    : value;

  const numericValue = Number(rawValue);

  if (
    !Number.isInteger(numericValue) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
}

function normalizeOptionalText(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  return value.trim() || null;
}

function parseBoolean(
  value: unknown,
  fallback = false
) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function isServiceType(
  value: unknown
): value is ServiceType {
  return (
    typeof value === "string" &&
    VALID_SERVICE_TYPES.has(
      value as ServiceType
    )
  );
}

function isFulfillmentType(
  value: unknown
): value is FulfillmentType {
  return (
    typeof value === "string" &&
    VALID_FULFILLMENT_TYPES.has(
      value as FulfillmentType
    )
  );
}

function isPaymentStatus(
  value: unknown
): value is PaymentStatus {
  return (
    typeof value === "string" &&
    VALID_PAYMENT_STATUSES.has(
      value as PaymentStatus
    )
  );
}

function isOrderStatus(
  value: unknown
): value is OrderStatus {
  return (
    typeof value === "string" &&
    VALID_ORDER_STATUSES.has(
      value as OrderStatus
    )
  );
}

function getServicePriceMap(
  settings: ShopPricingSettings
): Record<ServiceType, number> {
  return {
    [ServiceType.COMPLETE_SERVICE]:
      settings.completeServicePrice,

    [ServiceType.WASH_AND_DRY]:
      settings.washAndDryPrice,

    [ServiceType.WASH_ONLY]:
      settings.washOnlyPrice,

    [ServiceType.DRY_ONLY]:
      settings.dryOnlyPrice,

    [ServiceType.DRY_AND_FOLD]:
      settings.dryAndFoldPrice,

    [ServiceType.FOLD_ONLY]:
      settings.foldOnlyPrice,
  };
}

function getFulfillmentFeeMap(
  settings: ShopPricingSettings
): Record<FulfillmentType, number> {
  return {
    [FulfillmentType.NONE]: 0,

    [FulfillmentType.PICKUP_ONLY]:
      settings.pickupOnlyFee,

    [FulfillmentType.DELIVERY_ONLY]:
      settings.deliveryOnlyFee,

    [FulfillmentType.PICKUP_AND_DELIVERY]:
      settings.pickupAndDeliveryFee,
  };
}

function calculateOrderPricing(
  data: PricingInput,
  settings: ShopPricingSettings
) {
  if (
    !Number.isFinite(
      settings.maximumWeightPerLoad
    ) ||
    settings.maximumWeightPerLoad <= 0
  ) {
    throw new Error(
      "Maximum weight per load must be greater than zero"
    );
  }

  const servicePrices =
    getServicePriceMap(settings);

  const fulfillmentFees =
    getFulfillmentFeeMap(settings);

  const loadCount = Math.ceil(
    data.laundryWeight /
      settings.maximumWeightPerLoad
  );

  const servicePricePerLoad =
    servicePrices[data.serviceType];

  const serviceSubtotal =
    servicePricePerLoad *
    loadCount;

  const rinseFee =
    data.rinseCycles > 2
      ? settings.extraRinseFee
      : 0;

  const soapPrice =
    data.soapQuantity *
    settings.soapPrice;

  const softenerPrice =
    data.softenerQuantity *
    settings.softenerPrice;

  const deliveryFee =
    fulfillmentFees[
      data.fulfillmentType
    ];

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
  customerId?:
    | number
    | string
    | null;

  walkInCustomerName?:
    | string
    | null;

  walkInCustomerPhone?:
    | string
    | null;

  laundryWeight: number;
  soapQuantity: number;
  softenerQuantity: number;

  serviceType: unknown;
  rinseCycles: number;
  fulfillmentType: unknown;
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
    data.customerId !== null &&
    data.customerId !== undefined &&
    data.customerId !== "" &&
    !parsePositiveInteger(
      data.customerId
    )
  ) {
    return "Invalid customer ID";
  }

  if (
    data.walkInCustomerPhone &&
    !normalizePhilippinePhone(
      data.walkInCustomerPhone
    )
  ) {
    return (
      "Please enter a valid Philippine mobile number."
    );
  }

  if (
    !Number.isFinite(
      data.laundryWeight
    ) ||
    data.laundryWeight <= 0
  ) {
    return (
      "Laundry weight must be greater than 0"
    );
  }

  if (
    !isServiceType(
      data.serviceType
    )
  ) {
    return "Invalid service type";
  }

  if (
    !Number.isInteger(
      data.rinseCycles
    ) ||
    data.rinseCycles < 2 ||
    data.rinseCycles > 5
  ) {
    return (
      "Rinse cycles must be between 2 and 5"
    );
  }

  if (
    !isFulfillmentType(
      data.fulfillmentType
    )
  ) {
    return (
      "Invalid fulfillment type"
    );
  }

  if (
    !Number.isInteger(
      data.soapQuantity
    ) ||
    data.soapQuantity < 0
  ) {
    return (
      "Soap quantity must be a whole number of 0 or greater"
    );
  }

  if (
    !Number.isInteger(
      data.softenerQuantity
    ) ||
    data.softenerQuantity < 0
  ) {
    return (
      "Softener quantity must be a whole number of 0 or greater"
    );
  }

  return null;
}

function requiresDelivery(
  fulfillmentType: FulfillmentType
) {
  return (
    fulfillmentType ===
      FulfillmentType.DELIVERY_ONLY ||
    fulfillmentType ===
      FulfillmentType.PICKUP_AND_DELIVERY
  );
}

function getAllowedStatuses(
  currentStatus: OrderStatus,
  fulfillmentType: FulfillmentType
): OrderStatus[] {
  switch (currentStatus) {
    case OrderStatus.RECEIVED:
      return [
        OrderStatus.RECEIVED,
        OrderStatus.WASHING,
        OrderStatus.CANCELLED,
      ];

    case OrderStatus.WASHING:
      return [
        OrderStatus.WASHING,
        OrderStatus.DRYING,
        OrderStatus.CANCELLED,
      ];

    case OrderStatus.DRYING:
      return [
        OrderStatus.DRYING,
        OrderStatus.FOLDING,
        OrderStatus.CANCELLED,
      ];

    case OrderStatus.FOLDING:
      if (
        requiresDelivery(
          fulfillmentType
        )
      ) {
        return [
          OrderStatus.FOLDING,
          OrderStatus.OUT_FOR_DELIVERY,
          OrderStatus.CANCELLED,
        ];
      }

      return [
        OrderStatus.FOLDING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.CANCELLED,
      ];

    case OrderStatus.READY_FOR_PICKUP:
      return [
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ];

    case OrderStatus.OUT_FOR_DELIVERY:
      return [
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ];

    case OrderStatus.COMPLETED:
      return [
        OrderStatus.COMPLETED,
      ];

    case OrderStatus.CANCELLED:
      return [
        OrderStatus.CANCELLED,
      ];
  }
}

function validateStatusTransition(
  data: {
    currentStatus: OrderStatus;
    nextStatus: unknown;
    fulfillmentType: FulfillmentType;
  }
) {
  if (
    !isOrderStatus(
      data.nextStatus
    )
  ) {
    return "Invalid order status";
  }

  const allowedStatuses =
    getAllowedStatuses(
      data.currentStatus,
      data.fulfillmentType
    );

  if (
    !allowedStatuses.includes(
      data.nextStatus
    )
  ) {
    return (
      `Invalid status transition from ` +
      `${data.currentStatus} to ` +
      `${data.nextStatus}`
    );
  }

  return null;
}

function normalizeWalkInPhone(
  value: unknown
) {
  const text =
    normalizeOptionalText(value);

  return text
    ? normalizePhilippinePhone(
        text
      )
    : null;
}

function buildCancellationData(
  existingOrder: {
    paymentStatus: PaymentStatus;
    totalPrice: number;
  },

  cancellationReason: string,
  cancelledBy: string
) {
  const paid =
    existingOrder.paymentStatus ===
    PaymentStatus.PAID;

  const now = new Date();

  return {
    status:
      OrderStatus.CANCELLED,

    cancellationReason,
    cancelledAt: now,
    cancelledBy,

    refundStatus: paid
      ? RefundStatus.PENDING
      : RefundStatus.NOT_REQUIRED,

    refundAmount: paid
      ? existingOrder.totalPrice
      : 0,

    refundedAt: null,
    refundedBy: null,

    isArchived: true,
    archivedAt: now,
    archivedBy: cancelledBy,
  };
}

async function handleOperationalTransition(
  existingOrder: {
    id: number;
    status: OrderStatus;
    loadCount: number;
    soapQuantity: number;
    softenerQuantity: number;
  },

  nextStatus: OrderStatus,
  performedBy: string
) {
  if (
    existingOrder.status ===
      OrderStatus.RECEIVED &&
    nextStatus ===
      OrderStatus.WASHING
  ) {
    await inventoryService.deductOrderSupplies({
      orderId:
        existingOrder.id,

      soapQuantity:
        existingOrder.soapQuantity,

      softenerQuantity:
        existingOrder.softenerQuantity,

      performedBy,
    });

    await tankCycleService.countOrderLoads(
      existingOrder.id,
      existingOrder.loadCount,
      performedBy
    );
  }

  if (
    nextStatus ===
      OrderStatus.CANCELLED
  ) {
    await tankCycleService.reverseOrderLoads(
      existingOrder.id,
      performedBy,
      "Order was cancelled."
    );

    await inventoryService.reverseOrderSupplies(
      existingOrder.id,
      performedBy,
      "Supplies returned because the order was cancelled."
    );
  }
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

        fulfillmentType =
          FulfillmentType.NONE,

        hasMixedWhiteColor = false,
        instructions,
        receivedBy,
        claimedBy,

        paymentStatus =
          PaymentStatus.UNPAID,
      } = req.body;

      const numericLaundryWeight =
        Number(laundryWeight);

      const numericRinseCycles =
        Number(rinseCycles);

      const numericSoapQuantity =
        Number(soapQuantity);

      const numericSoftenerQuantity =
        Number(softenerQuantity);

      const normalizedWalkInPhone =
        normalizeWalkInPhone(
          walkInCustomerPhone
        );

      const validationError =
        validateOrderInput({
          customerId,
          walkInCustomerName,
          walkInCustomerPhone:
            normalizeOptionalText(
              walkInCustomerPhone
            ),

          laundryWeight:
            numericLaundryWeight,

          soapQuantity:
            numericSoapQuantity,

          softenerQuantity:
            numericSoftenerQuantity,

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

      if (
        !isPaymentStatus(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid payment status",
        });
      }

      const settings =
        await orderService.getShopSettings();

      const pricing =
        calculateOrderPricing(
          {
            laundryWeight:
              numericLaundryWeight,

            serviceType,

            rinseCycles:
              numericRinseCycles,

            soapQuantity:
              numericSoapQuantity,

            softenerQuantity:
              numericSoftenerQuantity,

            fulfillmentType,
          },
          settings
        );

      const paidAt =
        paymentStatus ===
        PaymentStatus.PAID
          ? new Date()
          : null;

      const result =
        await orderService.createOrder({
          customerId: customerId
            ? Number(customerId)
            : null,

          walkInCustomerName:
            normalizeOptionalText(
              walkInCustomerName
            ),

          walkInCustomerPhone:
            normalizedWalkInPhone,

          walkInCustomerAddress:
            normalizeOptionalText(
              walkInCustomerAddress
            ),

          laundryWeight:
            numericLaundryWeight,

          loadCount:
            pricing.loadCount,

          hasMixedWhiteColor:
            parseBoolean(
              hasMixedWhiteColor
            ),

          instructions:
            normalizeOptionalText(
              instructions
            ),

          serviceType,

          servicePricePerLoad:
            pricing.servicePricePerLoad,

          serviceSubtotal:
            pricing.serviceSubtotal,

          rinseCycles:
            numericRinseCycles,

          rinseFee:
            pricing.rinseFee,

          soapQuantity:
            numericSoapQuantity,

          soapPrice:
            pricing.soapPrice,

          softenerQuantity:
            numericSoftenerQuantity,

          softenerPrice:
            pricing.softenerPrice,

          fulfillmentType,

          deliveryFee:
            pricing.deliveryFee,

          receivedBy:
            normalizeOptionalText(
              receivedBy
            ),

          claimedBy:
            normalizeOptionalText(
              claimedBy
            ),

          totalPrice:
            pricing.totalPrice,

          status:
            OrderStatus.RECEIVED,

          paymentStatus,
          paidAt,
        });

      const {
        order,
        customerResult,
      } = result;

      const performedBy =
        getAuthenticatedUserName(req);

      if (
        customerResult.wasCreated
      ) {
        await auditLogService.recordAuditLogSafely({
          action:
            AuditAction.CREATE,

          entityType:
            AuditEntityType.CUSTOMER,

          entityId:
            customerResult
              .customer.id,

          entityName:
            customerResult
              .customer.name,

          description:
            `Customer ${customerResult.customer.name} was automatically created from walk-in order ${order.orderNumber}.`,

          performedBy,

          newData: {
            name:
              customerResult
                .customer.name,

            phone:
              customerResult
                .customer.phone,

            address:
              customerResult
                .customer.address,
          },
        });
      }

      await auditLogService.recordAuditLogSafely({
        action:
          AuditAction.CREATE,

        entityType:
          AuditEntityType.ORDER,

        entityId: order.id,

        entityName:
          order.orderNumber,

        description:
          `Order ${order.orderNumber} was created.`,

        performedBy,

        newData: {
          orderNumber:
            order.orderNumber,

          customerId:
            order.customerId,

          customerMatch:
            customerResult.matchedBy,

          laundryWeight:
            order.laundryWeight,

          loadCount:
            order.loadCount,

          serviceType:
            order.serviceType,

          servicePricePerLoad:
            order.servicePricePerLoad,

          totalPrice:
            order.totalPrice,

          paymentStatus:
            order.paymentStatus,

          status:
            order.status,
        },
      });

      return res
        .status(201)
        .json(order);
    } catch (error) {
      console.error(
        "Create order error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to create order";

      const statusCode =
        message.includes(
          "Philippine mobile"
        ) ||
        message.includes(
          "customer"
        )
          ? 400
          : 500;

      return res.status(
        statusCode
      ).json({
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
        message:
          "Failed to get orders",
      });
    }
  },

  getOrderById: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          req.params.id
        );

      if (!id) {
        return res.status(400).json({
          message:
            "Invalid order ID",
        });
      }

      const order =
        await orderService.getOrderById(
          id
        );

      if (!order) {
        return res.status(404).json({
          message:
            "Order not found",
        });
      }

      return res.json(order);
    } catch (error) {
      console.error(
        "Get order error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get order",
      });
    }
  },

  updateOrder: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id =
        parsePositiveInteger(
          req.params.id
        );

      if (!id) {
        return res.status(400).json({
          message:
            "Invalid order ID",
        });
      }

      const existingOrder =
        await orderService.getOrderById(
          id
        );

      if (!existingOrder) {
        return res.status(404).json({
          message:
            "Order not found",
        });
      }

      const customerId =
        req.body.customerId !==
        undefined
          ? req.body.customerId
          : existingOrder.customerId;

      const walkInCustomerName =
        req.body
          .walkInCustomerName !==
        undefined
          ? req.body
              .walkInCustomerName
          : existingOrder
              .walkInCustomerName;

      const walkInCustomerPhone =
        req.body
          .walkInCustomerPhone !==
        undefined
          ? req.body
              .walkInCustomerPhone
          : existingOrder
              .walkInCustomerPhone;

      const walkInCustomerAddress =
        req.body
          .walkInCustomerAddress !==
        undefined
          ? req.body
              .walkInCustomerAddress
          : existingOrder
              .walkInCustomerAddress;

      const laundryWeight =
        Number(
          req.body.laundryWeight ??
            existingOrder
              .laundryWeight
        );

      const serviceType =
        req.body.serviceType ??
        existingOrder.serviceType;

      const rinseCycles =
        Number(
          req.body.rinseCycles ??
            existingOrder
              .rinseCycles
        );

      const soapQuantity =
        Number(
          req.body.soapQuantity ??
            existingOrder
              .soapQuantity
        );

      const softenerQuantity =
        Number(
          req.body.softenerQuantity ??
            existingOrder
              .softenerQuantity
        );

      const fulfillmentType =
        req.body.fulfillmentType ??
        existingOrder
          .fulfillmentType;

      const nextStatus =
        req.body.status ??
        existingOrder.status;

      const nextPaymentStatus =
        req.body.paymentStatus ??
        existingOrder
          .paymentStatus;

      const normalizedWalkInPhone =
        normalizeWalkInPhone(
          walkInCustomerPhone
        );

      const validationError =
        validateOrderInput({
          customerId,

          walkInCustomerName:
            typeof walkInCustomerName ===
            "string"
              ? walkInCustomerName
              : null,

          walkInCustomerPhone:
            normalizeOptionalText(
              walkInCustomerPhone
            ),

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

      if (
        !isPaymentStatus(
          nextPaymentStatus
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid payment status",
        });
      }

      if (
        !isServiceType(
          serviceType
        ) ||
        !isFulfillmentType(
          fulfillmentType
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid order pricing options",
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

      if (
        !isOrderStatus(
          nextStatus
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid order status",
        });
      }

      if (
        existingOrder.status !==
          OrderStatus.RECEIVED &&
        (
          laundryWeight !==
            existingOrder
              .laundryWeight ||
          serviceType !==
            existingOrder
              .serviceType
        )
      ) {
        return res.status(400).json({
          message:
            "Laundry weight and service type cannot be changed after washing has started.",
        });
      }

      const performedBy =
        getAuthenticatedUserName(req);

      const cancellationReason =
        normalizeOptionalText(
          req.body
            .cancellationReason
        );

      if (
        nextStatus ===
          OrderStatus.CANCELLED &&
        existingOrder.status !==
          OrderStatus.CANCELLED &&
        !cancellationReason
      ) {
        return res.status(400).json({
          message:
            "Cancellation reason is required.",
        });
      }

      const settings =
        await orderService.getShopSettings();

      const pricing =
        calculateOrderPricing(
          {
            laundryWeight,
            serviceType,
            rinseCycles,
            soapQuantity,
            softenerQuantity,
            fulfillmentType,
          },
          settings
        );

      const paidAt =
        nextPaymentStatus ===
        PaymentStatus.PAID
          ? existingOrder.paidAt ??
            new Date()
          : null;

      const cancellationData =
        nextStatus ===
          OrderStatus.CANCELLED &&
        existingOrder.status !==
          OrderStatus.CANCELLED
          ? buildCancellationData(
              existingOrder,
              cancellationReason!,
              performedBy
            )
          : {};

      const order =
        await orderService.updateOrder(
          id,
          {
            customerId: customerId
              ? Number(customerId)
              : null,

            walkInCustomerName:
              normalizeOptionalText(
                walkInCustomerName
              ),

            walkInCustomerPhone:
              normalizedWalkInPhone,

            walkInCustomerAddress:
              normalizeOptionalText(
                walkInCustomerAddress
              ),

            laundryWeight,

            loadCount:
              pricing.loadCount,

            hasMixedWhiteColor:
              req.body
                .hasMixedWhiteColor !==
              undefined
                ? parseBoolean(
                    req.body
                      .hasMixedWhiteColor,
                    existingOrder
                      .hasMixedWhiteColor
                  )
                : existingOrder
                    .hasMixedWhiteColor,

            instructions:
              req.body.instructions !==
              undefined
                ? normalizeOptionalText(
                    req.body
                      .instructions
                  )
                : existingOrder
                    .instructions,

            serviceType,

            servicePricePerLoad:
              pricing.servicePricePerLoad,

            serviceSubtotal:
              pricing.serviceSubtotal,

            rinseCycles,

            rinseFee:
              pricing.rinseFee,

            soapQuantity,

            soapPrice:
              pricing.soapPrice,

            softenerQuantity,

            softenerPrice:
              pricing.softenerPrice,

            fulfillmentType,

            deliveryFee:
              pricing.deliveryFee,

            receivedBy:
              req.body.receivedBy !==
              undefined
                ? normalizeOptionalText(
                    req.body
                      .receivedBy
                  )
                : existingOrder
                    .receivedBy,

            claimedBy:
              req.body.claimedBy !==
              undefined
                ? normalizeOptionalText(
                    req.body.claimedBy
                  )
                : existingOrder
                    .claimedBy,

            totalPrice:
              pricing.totalPrice,

            status: nextStatus,

            paymentStatus:
              nextPaymentStatus,

            paidAt,

            ...cancellationData,
          }
        );

      await handleOperationalTransition(
        existingOrder,
        nextStatus,
        performedBy
      );

      const statusChanged =
        existingOrder.status !==
        order.status;

      const paymentChanged =
        existingOrder
          .paymentStatus !==
        order.paymentStatus;

      let auditAction:
        AuditAction =
        AuditAction.UPDATE;

      let description =
        `Order ${order.orderNumber} was updated.`;

      if (
        order.status ===
          OrderStatus.CANCELLED &&
        existingOrder.status !==
          OrderStatus.CANCELLED
      ) {
        auditAction =
          AuditAction.ARCHIVE;

        description =
          `Order ${order.orderNumber} was cancelled and archived. ` +
          `Its payment was excluded from revenue.`;
      } else if (paymentChanged) {
        auditAction =
          AuditAction.PAYMENT_CHANGE;

        description =
          `Payment status for ${order.orderNumber} ` +
          `changed from ${existingOrder.paymentStatus} ` +
          `to ${order.paymentStatus}.`;
      } else if (statusChanged) {
        auditAction =
          AuditAction.STATUS_CHANGE;

        description =
          `Order status for ${order.orderNumber} ` +
          `changed from ${existingOrder.status} ` +
          `to ${order.status}.`;
      }

      await auditLogService.recordAuditLogSafely({
        action: auditAction,

        entityType:
          AuditEntityType.ORDER,

        entityId: order.id,

        entityName:
          order.orderNumber,

        description,

        performedBy,

        previousData: {
          customerId:
            existingOrder.customerId,

          laundryWeight:
            existingOrder
              .laundryWeight,

          loadCount:
            existingOrder.loadCount,

          serviceType:
            existingOrder.serviceType,

          totalPrice:
            existingOrder.totalPrice,

          paymentStatus:
            existingOrder
              .paymentStatus,

          status:
            existingOrder.status,

          isArchived:
            existingOrder
              .isArchived,
        },

        newData: {
          customerId:
            order.customerId,

          laundryWeight:
            order.laundryWeight,

          loadCount:
            order.loadCount,

          serviceType:
            order.serviceType,

          totalPrice:
            order.totalPrice,

          paymentStatus:
            order.paymentStatus,

          status:
            order.status,

          refundStatus:
            order.refundStatus,

          refundAmount:
            order.refundAmount,

          cancellationReason:
            order.cancellationReason,

          isArchived:
            order.isArchived,
        },
      });

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
      const id =
        parsePositiveInteger(
          req.params.id
        );

      const { status } =
        req.body;

      if (!id) {
        return res.status(400).json({
          message:
            "Invalid order ID",
        });
      }

      if (!status) {
        return res.status(400).json({
          message:
            "Status is required",
        });
      }

      const existingOrder =
        await orderService.getOrderById(
          id
        );

      if (!existingOrder) {
        return res.status(404).json({
          message:
            "Order not found",
        });
      }

      const statusError =
        validateStatusTransition({
          currentStatus:
            existingOrder.status,

          nextStatus: status,

          fulfillmentType:
            existingOrder
              .fulfillmentType,
        });

      if (statusError) {
        return res.status(400).json({
          message: statusError,
        });
      }

      if (
        !isOrderStatus(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid order status",
        });
      }

      const performedBy =
        getAuthenticatedUserName(req);

      const cancellationReason =
        normalizeOptionalText(
          req.body
            .cancellationReason
        );

      if (
        status ===
          OrderStatus.CANCELLED &&
        !cancellationReason
      ) {
        return res.status(400).json({
          message:
            "Cancellation reason is required.",
        });
      }

      const additionalData =
        status ===
        OrderStatus.CANCELLED
          ? buildCancellationData(
              existingOrder,
              cancellationReason!,
              performedBy
            )
          : {};

      const order =
        await orderService.updateOrderStatus(
          id,
          status,
          additionalData
        );

      await handleOperationalTransition(
        existingOrder,
        status,
        performedBy
      );

      const cancelled =
        status ===
        OrderStatus.CANCELLED;

      await auditLogService.recordAuditLogSafely({
        action: cancelled
          ? AuditAction.ARCHIVE
          : AuditAction.STATUS_CHANGE,

        entityType:
          AuditEntityType.ORDER,

        entityId: order.id,

        entityName:
          order.orderNumber,

        description: cancelled
          ? `Order ${order.orderNumber} was cancelled and archived. Its payment was excluded from revenue.`
          : `Order status for ${order.orderNumber} changed from ${existingOrder.status} to ${order.status}.`,

        performedBy,

        previousData: {
          status:
            existingOrder.status,

          isArchived:
            existingOrder
              .isArchived,
        },

        newData: {
          status: order.status,

          isArchived:
            order.isArchived,

          cancellationReason:
            order.cancellationReason,

          refundStatus:
            order.refundStatus,

          refundAmount:
            order.refundAmount,
        },
      });

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
      const id =
        parsePositiveInteger(
          req.params.id
        );

      if (!id) {
        return res.status(400).json({
          message:
            "Invalid order ID",
        });
      }

      const existingOrder =
        await orderService.getOrderById(
          id
        );

      if (!existingOrder) {
        return res.status(404).json({
          message:
            "Order not found",
        });
      }

      const performedBy =
        getAuthenticatedUserName(req);

      const order =
        await orderService.archiveOrder(
          id,
          performedBy
        );

      await auditLogService.recordAuditLogSafely({
        action:
          AuditAction.ARCHIVE,

        entityType:
          AuditEntityType.ORDER,

        entityId:
          existingOrder.id,

        entityName:
          existingOrder
            .orderNumber,

        description:
          `Order ${existingOrder.orderNumber} was archived.`,

        performedBy,

        previousData: {
          status:
            existingOrder.status,

          paymentStatus:
            existingOrder
              .paymentStatus,

          isArchived:
            existingOrder
              .isArchived,
        },

        newData: {
          status:
            order.status,

          paymentStatus:
            order.paymentStatus,

          isArchived:
            order.isArchived,

          archivedAt:
            order.archivedAt
              ?.toISOString(),

          archivedBy:
            order.archivedBy,
        },
      });

      return res.json({
        message:
          "Order archived successfully",

        order,
      });
    } catch (error) {
      console.error(
        "Archive order error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to archive order",
      });
    }
  },
};

export default orderController;