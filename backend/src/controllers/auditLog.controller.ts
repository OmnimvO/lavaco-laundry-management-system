import type {
  Request,
  Response,
} from "express";

import {
  AuditAction,
  AuditEntityType,
  Prisma,
} from "../generated/prisma/client.js";

import { auditLogService } from "../services/auditLog.service.js";

const VALID_ACTIONS = new Set<AuditAction>(
  Object.values(AuditAction)
);

const VALID_ENTITY_TYPES =
  new Set<AuditEntityType>(
    Object.values(AuditEntityType)
  );

function getFirstParamValue(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parsePositiveInteger(
  value: string | string[] | undefined
) {
  const rawValue =
    getFirstParamValue(value);

  if (!rawValue) {
    return null;
  }

  const id = Number(rawValue);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function isAuditAction(
  value: unknown
): value is AuditAction {
  return (
    typeof value === "string" &&
    VALID_ACTIONS.has(
      value as AuditAction
    )
  );
}

function isAuditEntityType(
  value: unknown
): value is AuditEntityType {
  return (
    typeof value === "string" &&
    VALID_ENTITY_TYPES.has(
      value as AuditEntityType
    )
  );
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

function normalizeJsonValue(
  value: unknown
): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

export const auditLogController = {
  createAuditLog: async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        action,
        entityType,
        entityId,
        entityName,
        description,
        performedBy,
        previousData,
        newData,
      } = req.body;

      if (!isAuditAction(action)) {
        return res.status(400).json({
          message: "Invalid audit action",
        });
      }

      if (
        !isAuditEntityType(entityType)
      ) {
        return res.status(400).json({
          message:
            "Invalid audit entity type",
        });
      }

      if (
        typeof description !==
          "string" ||
        !description.trim()
      ) {
        return res.status(400).json({
          message:
            "Audit log description is required",
        });
      }

      let numericEntityId:
        | number
        | null = null;

      if (
        entityId !== undefined &&
        entityId !== null &&
        entityId !== ""
      ) {
        numericEntityId =
          Number(entityId);

        if (
          !Number.isInteger(
            numericEntityId
          ) ||
          numericEntityId <= 0
        ) {
          return res.status(400).json({
            message:
              "Invalid audit entity ID",
          });
        }
      }

      const auditLog =
        await auditLogService.createAuditLog(
          {
            action,
            entityType,

            entityId:
              numericEntityId,

            entityName:
              normalizeOptionalString(
                entityName
              ),

            description:
              description.trim(),

            performedBy:
              normalizeOptionalString(
                performedBy
              ),

            previousData:
              normalizeJsonValue(
                previousData
              ),

            newData:
              normalizeJsonValue(
                newData
              ),
          }
        );

      return res
        .status(201)
        .json(auditLog);
    } catch (error) {
      console.error(
        "Create audit log error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create audit log",
      });
    }
  },

  getAllAuditLogs: async (
    _req: Request,
    res: Response
  ) => {
    try {
      const auditLogs =
        await auditLogService.getAllAuditLogs();

      return res.json(auditLogs);
    } catch (error) {
      console.error(
        "Get audit logs error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get audit logs",
      });
    }
  },

  getAuditLogById: async (
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
            "Invalid audit log ID",
        });
      }

      const auditLog =
        await auditLogService.getAuditLogById(
          id
        );

      if (!auditLog) {
        return res.status(404).json({
          message:
            "Audit log not found",
        });
      }

      return res.json(auditLog);
    } catch (error) {
      console.error(
        "Get audit log error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get audit log",
      });
    }
  },

  getAuditLogsByEntity: async (
    req: Request,
    res: Response
  ) => {
    try {
      const rawEntityType =
        getFirstParamValue(
          req.params.entityType
        );

      if (
        !isAuditEntityType(
          rawEntityType
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid audit entity type",
        });
      }

      const entityId =
        parsePositiveInteger(
          req.params.entityId
        );

      if (!entityId) {
        return res.status(400).json({
          message:
            "Invalid audit entity ID",
        });
      }

      const auditLogs =
        await auditLogService.getAuditLogsByEntity(
          rawEntityType,
          entityId
        );

      return res.json(auditLogs);
    } catch (error) {
      console.error(
        "Get entity audit logs error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get entity audit logs",
      });
    }
  },

  deleteAuditLog: async (
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
            "Invalid audit log ID",
        });
      }

      const existingAuditLog =
        await auditLogService.getAuditLogById(
          id
        );

      if (!existingAuditLog) {
        return res.status(404).json({
          message:
            "Audit log not found",
        });
      }

      await auditLogService.deleteAuditLog(
        id
      );

      return res.json({
        message:
          "Audit log deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete audit log error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete audit log",
      });
    }
  },
};