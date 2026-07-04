import type { Request, Response } from "express";
import { orderService } from "../services/order.service.js";

export const orderController = {
  createOrder: async (req: Request, res: Response) => {
    try {
      const {
        customerId,
        walkInCustomerName,
        walkInCustomerPhone,
        walkInCustomerAddress,
        basketCount,
        serviceType,
        washType,
        dryExtend,
        serviceFee,
        soap,
        soapPrice,
        softener,
        softenerPrice,
        fulfillmentType,
        deliveryFee,
        hasMixedWhiteColor,
        receivedBy,
        claimedBy,
        instructions,
        totalPrice,
        status,
        paymentStatus,
      } = req.body;

      if (!basketCount || !serviceType || totalPrice === undefined) {
        return res.status(400).json({
          message: "Basket count, service type, and total price are required",
        });
      }

      if (!customerId && !walkInCustomerName) {
        return res.status(400).json({
          message: "Select an existing customer or enter a walk-in customer name",
        });
      }

      const order = await orderService.createOrder({
        customerId: customerId ? Number(customerId) : null,
        walkInCustomerName,
        walkInCustomerPhone,
        walkInCustomerAddress,
        basketCount: Number(basketCount),
        serviceType,
        washType: washType || null,
        dryExtend: Boolean(dryExtend),
        serviceFee: Number(serviceFee ?? 0),
        soap: soap ?? "NONE",
        soapPrice: Number(soapPrice ?? 0),
        softener: softener ?? "NONE",
        softenerPrice: Number(softenerPrice ?? 0),
        fulfillmentType: fulfillmentType ?? "PICKUP",
        deliveryFee: Number(deliveryFee ?? 0),
        hasMixedWhiteColor: Boolean(hasMixedWhiteColor),
        receivedBy,
        claimedBy,
        instructions,
        totalPrice: Number(totalPrice),
        status: status ?? "RECEIVED",
        paymentStatus: paymentStatus ?? "UNPAID",
      });

      return res.status(201).json(order);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to create order",
      });
    }
  },

  getAllOrders: async (_req: Request, res: Response) => {
    try {
      const orders = await orderService.getAllOrders();
      return res.json(orders);
    } catch {
      return res.status(500).json({
        message: "Failed to get orders",
      });
    }
  },

  getOrderById: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      const order = await orderService.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      return res.json(order);
    } catch {
      return res.status(500).json({
        message: "Failed to get order",
      });
    }
  },

  updateOrder: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      const order = await orderService.updateOrder(id, req.body);

      return res.json(order);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to update order",
      });
    }
  },

  updateOrderStatus: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      if (!status) {
        return res.status(400).json({
          message: "Status is required",
        });
      }

      const order = await orderService.updateOrderStatus(id, status);

      return res.json(order);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to update order status",
      });
    }
  },

  deleteOrder: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      await orderService.deleteOrder(id);

      return res.json({
        message: "Order deleted successfully",
      });
    } catch {
      return res.status(500).json({
        message: "Failed to delete order",
      });
    }
  },
};