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

import {
  normalizePhilippinePhone,
  normalizeSearchText,
} from "../utils/philippinePhone.js";

import {
  getAuthenticatedUserName,
} from "../utils/authUser.js";

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

function prepareCustomerData(
  data: {
    name: string;
    phone?: unknown;
    address?: unknown;
  }
) {
  const name = data.name.trim();

  const rawPhone =
    normalizeOptionalString(
      data.phone
    );

  const normalizedPhone =
    normalizePhilippinePhone(
      rawPhone
    );

  if (
    rawPhone &&
    !normalizedPhone
  ) {
    throw new Error(
      "Please enter a valid Philippine mobile number."
    );
  }

  const address =
    normalizeOptionalString(
      data.address
    );

  return {
    name,

    phone:
      normalizedPhone,

    normalizedPhone,

    normalizedName:
      normalizeSearchText(name),

    address,

    normalizedAddress:
      normalizeSearchText(
        address
      ),
  };
}

export const customerController = {

  lookupCustomerByPhone: async (
    req: Request,
    res: Response
  ) => {
    try {
      const rawPhone =
        Array.isArray(req.query.phone)
          ? req.query.phone[0]
          : req.query.phone;

      if (
        typeof rawPhone !== "string" ||
        !rawPhone.trim()
      ) {
        return res.status(400).json({
          message:
            "Phone number is required.",
        });
      }

      const normalizedPhone =
        normalizePhilippinePhone(
          rawPhone
        );

      if (!normalizedPhone) {
        return res.status(400).json({
          message:
            "Please enter a valid Philippine mobile number.",
        });
      }

      const customer =
        await customerService.findCustomerByNormalizedPhone(
          normalizedPhone
        );

      return res.json({
        found:
          Boolean(customer),

        customer:
          customer ?? null,
      });
    } catch (error) {
      console.error(
        "Customer lookup error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to look up customer.",
      });
    }
  },

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

      const customerData =
        prepareCustomerData({
          name,
          phone,
          address,
        });

      const duplicate =
        await customerService.findDuplicateCustomer(
          {
            normalizedPhone:
              customerData
                .normalizedPhone,

            normalizedName:
              customerData
                .normalizedName,

            normalizedAddress:
              customerData
                .normalizedAddress,
          }
        );

      if (duplicate) {
        return res.status(409).json({
          message:
            "This customer already exists.",

          customer: duplicate,
        });
      }

      const customer =
        await customerService.createCustomer(
          customerData
        );

      const performedBy =
        getAuthenticatedUserName(req);

      await auditLogService.recordAuditLogSafely({
        action: AuditAction.CREATE,

        entityType:
          AuditEntityType.CUSTOMER,

        entityId: customer.id,
        entityName: customer.name,

        description:
          `Customer ${customer.name} was created.`,

        performedBy,

        newData: {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          normalizedPhone:
            customer.normalizedPhone,
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

      const message =
        error instanceof Error
          ? error.message
          : "Failed to create customer";

      return res.status(400).json({
        message,
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

      const nextName =
        req.body.name !== undefined
          ? req.body.name
          : existingCustomer.name;

      if (
        typeof nextName !==
          "string" ||
        !nextName.trim()
      ) {
        return res.status(400).json({
          message:
            "Customer name cannot be empty",
        });
      }

      const nextPhone =
        req.body.phone !== undefined
          ? req.body.phone
          : existingCustomer.phone;

      const nextAddress =
        req.body.address !== undefined
          ? req.body.address
          : existingCustomer.address;

      const customerData =
        prepareCustomerData({
          name: nextName,
          phone: nextPhone,
          address:
            nextAddress,
        });

      const duplicate =
        await customerService.findDuplicateCustomer(
          {
            normalizedPhone:
              customerData
                .normalizedPhone,

            normalizedName:
              customerData
                .normalizedName,

            normalizedAddress:
              customerData
                .normalizedAddress,

            excludeCustomerId: id,
          }
        );

      if (duplicate) {
        return res.status(409).json({
          message:
            "Another customer already uses these details.",

          customer: duplicate,
        });
      }

      const customer =
        await customerService.updateCustomer(
          id,
          customerData
        );

      const performedBy =
        getAuthenticatedUserName(req);

      await auditLogService.recordAuditLogSafely({
        action: AuditAction.UPDATE,

        entityType:
          AuditEntityType.CUSTOMER,

        entityId: customer.id,
        entityName: customer.name,

        description:
          `Customer ${existingCustomer.name} was updated.`,

        performedBy,

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

      const message =
        error instanceof Error
          ? error.message
          : "Failed to update customer";

      return res.status(400).json({
        message,
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

      const performedBy =
        getAuthenticatedUserName(req);

      const archivedCustomer =
        await customerService.archiveCustomer(
          id,
          performedBy
        );

      await auditLogService.recordAuditLogSafely({
        action:
          AuditAction.ARCHIVE,

        entityType:
          AuditEntityType.CUSTOMER,

        entityId:
          existingCustomer.id,

        entityName:
          existingCustomer.name,

        description:
          `Customer ${existingCustomer.name} was archived.`,

        performedBy,

        previousData: {
          name:
            existingCustomer.name,

          phone:
            existingCustomer.phone,

          address:
            existingCustomer.address,

          isArchived:
            existingCustomer
              .isArchived,
        },

        newData: {
          name:
            archivedCustomer.name,

          phone:
            archivedCustomer.phone,

          address:
            archivedCustomer.address,

          isArchived:
            archivedCustomer
              .isArchived,

          archivedAt:
            archivedCustomer
              .archivedAt
              ?.toISOString(),

          archivedBy:
            archivedCustomer
              .archivedBy,
        },
      });

      return res.json({
        message:
          "Customer archived successfully",

        customer:
          archivedCustomer,
      });
    } catch (error) {
      console.error(
        "Archive customer error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to archive customer",
      });
    }
  },
};

export default customerController;