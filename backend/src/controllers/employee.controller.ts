import type {
  Request,
  Response,
} from "express";

import {
  AuditAction,
  AuditEntityType,
  EmployeePosition,
  EmployeeStatus,
} from "../generated/prisma/client.js";

import { employeeService } from "../services/employee.service.js";
import { auditLogService } from "../services/auditLog.service.js";

const VALID_POSITIONS = new Set(
  Object.values(EmployeePosition)
);

const VALID_STATUSES = new Set(
  Object.values(EmployeeStatus)
);

function parseEmployeeId(
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

function parseDateHired(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export const employeeController = {
  createEmployee: async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        firstName,
        lastName,
        phone,
        address,
        position,
        status = "ACTIVE",
        dateHired,
        notes,
      } = req.body;

      if (
        typeof firstName !== "string" ||
        !firstName.trim()
      ) {
        return res.status(400).json({
          message:
            "Employee first name is required",
        });
      }

      if (
        typeof lastName !== "string" ||
        !lastName.trim()
      ) {
        return res.status(400).json({
          message:
            "Employee last name is required",
        });
      }

      if (
        !VALID_POSITIONS.has(position)
      ) {
        return res.status(400).json({
          message:
            "Invalid employee position",
        });
      }

      if (
        !VALID_STATUSES.has(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid employee status",
        });
      }

      const parsedDateHired =
        parseDateHired(dateHired);

      if (!parsedDateHired) {
        return res.status(400).json({
          message:
            "A valid date hired is required",
        });
      }

      const employee =
        await employeeService.createEmployee({
          firstName: firstName.trim(),
          lastName: lastName.trim(),

          phone:
            typeof phone === "string"
              ? phone.trim() || null
              : null,

          address:
            typeof address === "string"
              ? address.trim() || null
              : null,

          position,
          status,
          dateHired: parsedDateHired,

          notes:
            typeof notes === "string"
              ? notes.trim() || null
              : null,
        });

      const fullName =
        `${employee.firstName} ${employee.lastName}`;

      await auditLogService.recordAuditLogSafely({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.EMPLOYEE,

        entityId: employee.id,
        entityName: fullName,

        description:
          `Employee ${fullName} was created.`,

        performedBy: "System",

        newData: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          phone: employee.phone,
          address: employee.address,
          position: employee.position,
          status: employee.status,
          dateHired:
            employee.dateHired.toISOString(),
          notes: employee.notes,
        },
      });

      return res.status(201).json(employee);
    } catch (error) {
      console.error(
        "Create employee error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create employee",
      });
    }
  },

  getAllEmployees: async (
    _req: Request,
    res: Response
  ) => {
    try {
      const employees =
        await employeeService.getAllEmployees();

      return res.json(employees);
    } catch (error) {
      console.error(
        "Get employees error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get employees",
      });
    }
  },

  getEmployeeById: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = parseEmployeeId(
        req.params.id
      );

      if (!id) {
        return res.status(400).json({
          message: "Invalid employee ID",
        });
      }

      const employee =
        await employeeService.getEmployeeById(
          id
        );

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      return res.json(employee);
    } catch (error) {
      console.error(
        "Get employee error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get employee",
      });
    }
  },

  updateEmployee: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = parseEmployeeId(
        req.params.id
      );

      if (!id) {
        return res.status(400).json({
          message: "Invalid employee ID",
        });
      }

      const existingEmployee =
        await employeeService.getEmployeeById(
          id
        );

      if (!existingEmployee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      const {
        firstName,
        lastName,
        phone,
        address,
        position,
        status,
        dateHired,
        notes,
      } = req.body;

      if (
        firstName !== undefined &&
        (
          typeof firstName !== "string" ||
          !firstName.trim()
        )
      ) {
        return res.status(400).json({
          message:
            "Employee first name cannot be empty",
        });
      }

      if (
        lastName !== undefined &&
        (
          typeof lastName !== "string" ||
          !lastName.trim()
        )
      ) {
        return res.status(400).json({
          message:
            "Employee last name cannot be empty",
        });
      }

      if (
        position !== undefined &&
        !VALID_POSITIONS.has(position)
      ) {
        return res.status(400).json({
          message:
            "Invalid employee position",
        });
      }

      if (
        status !== undefined &&
        !VALID_STATUSES.has(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid employee status",
        });
      }

      let parsedDateHired:
        | Date
        | undefined;

      if (dateHired !== undefined) {
        const parsed =
          parseDateHired(dateHired);

        if (!parsed) {
          return res.status(400).json({
            message:
              "A valid date hired is required",
          });
        }

        parsedDateHired = parsed;
      }

      const employee =
        await employeeService.updateEmployee(
          id,
          {
            firstName:
              firstName !== undefined
                ? firstName.trim()
                : undefined,

            lastName:
              lastName !== undefined
                ? lastName.trim()
                : undefined,

            phone:
              phone !== undefined
                ? typeof phone === "string"
                  ? phone.trim() || null
                  : null
                : undefined,

            address:
              address !== undefined
                ? typeof address === "string"
                  ? address.trim() || null
                  : null
                : undefined,

            position,
            status,

            dateHired:
              parsedDateHired,

            notes:
              notes !== undefined
                ? typeof notes === "string"
                  ? notes.trim() || null
                  : null
                : undefined,
          }
        );

      const previousFullName =
        `${existingEmployee.firstName} ${existingEmployee.lastName}`;

      const newFullName =
        `${employee.firstName} ${employee.lastName}`;

      await auditLogService.recordAuditLogSafely({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.EMPLOYEE,

        entityId: employee.id,
        entityName: newFullName,

        description:
          `Employee ${previousFullName} was updated.`,

        performedBy: "System",

        previousData: {
          firstName:
            existingEmployee.firstName,
          lastName:
            existingEmployee.lastName,
          phone:
            existingEmployee.phone,
          address:
            existingEmployee.address,
          position:
            existingEmployee.position,
          status:
            existingEmployee.status,
          dateHired:
            existingEmployee.dateHired.toISOString(),
          notes:
            existingEmployee.notes,
        },

        newData: {
          firstName:
            employee.firstName,
          lastName:
            employee.lastName,
          phone:
            employee.phone,
          address:
            employee.address,
          position:
            employee.position,
          status:
            employee.status,
          dateHired:
            employee.dateHired.toISOString(),
          notes:
            employee.notes,
        },
      });

      return res.json(employee);
    } catch (error) {
      console.error(
        "Update employee error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update employee",
      });
    }
  },

  deleteEmployee: async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = parseEmployeeId(
        req.params.id
      );

      if (!id) {
        return res.status(400).json({
          message: "Invalid employee ID",
        });
      }

      const existingEmployee =
        await employeeService.getEmployeeById(
          id
        );

      if (!existingEmployee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      await employeeService.deleteEmployee(
        id
      );

      const fullName =
        `${existingEmployee.firstName} ${existingEmployee.lastName}`;

      await auditLogService.recordAuditLogSafely({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.EMPLOYEE,

        entityId:
          existingEmployee.id,

        entityName: fullName,

        description:
          `Employee ${fullName} was deleted.`,

        performedBy: "System",

        previousData: {
          firstName:
            existingEmployee.firstName,
          lastName:
            existingEmployee.lastName,
          phone:
            existingEmployee.phone,
          address:
            existingEmployee.address,
          position:
            existingEmployee.position,
          status:
            existingEmployee.status,
          dateHired:
            existingEmployee.dateHired.toISOString(),
          notes:
            existingEmployee.notes,
        },
      });

      return res.json({
        message:
          "Employee deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete employee error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete employee",
      });
    }
  },
};