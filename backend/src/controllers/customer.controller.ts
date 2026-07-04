import type { Request, Response } from "express";
import { customerService } from "../services/customer.service.js";

export const customerController = {
  createCustomer: async (req: Request, res: Response) => {
    try {
      const { name, phone, address } = req.body;

      if (!name) {
        return res.status(400).json({
          message: "Customer name is required",
        });
      }

      const customer = await customerService.createCustomer({
        name,
        phone,
        address,
      });

      return res.status(201).json(customer);
    } catch (error) {
      return res.status(500).json({
        message: "Failed to create customer",
      });
    }
  },

  getAllCustomers: async (_req: Request, res: Response) => {
    try {
      const customers = await customerService.getAllCustomers();

      return res.json(customers);
    } catch (error) {
      return res.status(500).json({
        message: "Failed to get customers",
      });
    }
  },
};