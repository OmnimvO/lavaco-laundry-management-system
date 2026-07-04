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
    } catch {
      return res.status(500).json({
        message: "Failed to create customer",
      });
    }
  },

  getAllCustomers: async (_req: Request, res: Response) => {
    try {
      const customers = await customerService.getAllCustomers();
      return res.json(customers);
    } catch {
      return res.status(500).json({
        message: "Failed to get customers",
      });
    }
  },

  getCustomerById: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      const customer = await customerService.getCustomerById(id);

      if (!customer) {
        return res.status(404).json({
          message: "Customer not found",
        });
      }

      return res.json(customer);
    } catch {
      return res.status(500).json({
        message: "Failed to get customer",
      });
    }
  },

  updateCustomer: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { name, phone, address } = req.body;

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      const customer = await customerService.updateCustomer(id, {
        name,
        phone,
        address,
      });

      return res.json(customer);
    } catch {
      return res.status(500).json({
        message: "Failed to update customer",
      });
    }
  },

  deleteCustomer: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      await customerService.deleteCustomer(id);

      return res.json({
        message: "Customer deleted successfully",
      });
    } catch {
      return res.status(500).json({
        message: "Failed to delete customer",
      });
    }
  },
};