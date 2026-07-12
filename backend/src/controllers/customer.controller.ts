import type {
  Request,
  Response,
} from "express";

import {
  AuditAction,
  AuditEntityType,
} from "../generated/prisma/client.js";

import { customerService } from "../services/customer.service.js";
import { auditLogService } from "../services/auditLog.service.js";

function parseCustomerId(
  value: string | string[] | undefined
) {
  const rawValue = Array.isArray(value)
    ? value[0]
    : value;

  const id = Number(rawValue);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function normalizeOptionalString(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue || null;
}

export const customerController = {
  createCustomer: async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        name,
        phone,
        address,
      } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          message:
            "Customer name is required",
        });
      }

      const customer =
        await customerService.createCustomer({
          name: name.trim(),

          phone:
            normalizeOptionalString(
              phone
            ) ?? undefined,

          address:
            normalizeOptionalString(
              address
            ) ?? undefined,
        });

      await auditLogService.recordAuditLogSafely({
        action: AuditAction.CREATE,
        entityType:
          AuditEntityType.CUSTOMER,

        entityId: customer.id,
        entityName: customer.name,

        description:
          `Customer ${customer.name} was created.`,

        performedBy: "System",

        newData: {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
        },
      });

      return res
        .status(201)
        .json(customer);
    } catch (error) {
      console.error(
        "Create customer error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create customer",
      });
    }
  },

  getAllCustomers: async (
    _req: Request,
    res: Response
  ) => {
    try {
      const customers =
        await customerService.getAllCustomers();

      return res.json(customers);
    } catch (error) {
      console.error(
        "Get customers error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get customers",
      });
    }
  },

  getCustomerById: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = parseCustomerId(
        req.params.id
      );

      if (!id) {
        return res.status(400).json({
          message:
            "Invalid customer ID",
        });
      }

      const customer =
        await customerService.getCustomerById(
          id
        );

      if (!customer) {
        return res.status(404).json({
          message:
            "Customer not found",
        });
      }

      return res.json(customer);
    } catch (error) {
      console.error(
        "Get customer error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get customer",
      });
    }
  },

  updateCustomer: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = parseCustomerId(
        req.params.id
      );

      if (!id) {
        return res.status(400).json({
          message:
            "Invalid customer ID",
        });
      }

      const existingCustomer =
        await customerService.getCustomerById(
          id
        );

      if (!existingCustomer) {
        return res.status(404).json({
          message:
            "Customer not found",
        });
      }

      const {
        name,
        phone,
        address,
      } = req.body;

      if (
        name !== undefined &&
        (
          typeof name !== "string" ||
          !name.trim()
        )
      ) {
        return res.status(400).json({
          message:
            "Customer name cannot be empty",
        });
      }

      const customer =
        await customerService.updateCustomer(
          id,
          {
            name:
              name !== undefined
                ? name.trim()
                : undefined,

            phone:
              phone !== undefined
                ? normalizeOptionalString(
                    phone
                  ) ?? undefined
                : undefined,

            address:
              address !== undefined
                ? normalizeOptionalString(
                    address
                  ) ?? undefined
                : undefined,
          }
        );

      await auditLogService.recordAuditLogSafely({
        action: AuditAction.UPDATE,
        entityType:
          AuditEntityType.CUSTOMER,

        entityId: customer.id,
        entityName: customer.name,

        description:
          `Customer ${existingCustomer.name} was updated.`,

        performedBy: "System",

        previousData: {
          name:
            existingCustomer.name,
          phone:
            existingCustomer.phone,
          address:
            existingCustomer.address,
        },

        newData: {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
        },
      });

      return res.json(customer);
    } catch (error) {
      console.error(
        "Update customer error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update customer",
      });
    }
  },

  deleteCustomer: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = parseCustomerId(
        req.params.id
      );

      if (!id) {
        return res.status(400).json({
          message:
            "Invalid customer ID",
        });
      }

      const existingCustomer =
        await customerService.getCustomerById(
          id
        );

      if (!existingCustomer) {
        return res.status(404).json({
          message:
            "Customer not found",
        });
      }

      await customerService.deleteCustomer(
        id
      );

      await auditLogService.recordAuditLogSafely({
        action: AuditAction.DELETE,
        entityType:
          AuditEntityType.CUSTOMER,

        entityId:
          existingCustomer.id,

        entityName:
          existingCustomer.name,

        description:
          `Customer ${existingCustomer.name} was deleted.`,

        performedBy: "System",

        previousData: {
          name:
            existingCustomer.name,
          phone:
            existingCustomer.phone,
          address:
            existingCustomer.address,
        },
      });

      return res.json({
        message:
          "Customer deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete customer error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete customer",
      });
    }
  },
};