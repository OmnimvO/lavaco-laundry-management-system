import type {
  Request,
  Response,
} from "express";

import {
  AuditAction,
  AuditEntityType,
  UserRole,
  UserStatus,
} from "../generated/prisma/client.js";

import {
  archiveService,
  type ArchiveEntityType,
} from "../services/archive.service.js";

import {
  auditLogService,
} from "../services/auditLog.service.js";

import {
  getAuthenticatedUserId,
  getAuthenticatedUserName,
} from "../utils/authUser.js";

import {
  userService,
} from "../services/user.service.js";

const VALID_ENTITY_TYPES =
  new Set<ArchiveEntityType>([
    "CUSTOMER",
    "EMPLOYEE",
    "ORDER",
    "INVENTORY",
    "USER",
  ]);

function parseEntityType(
  value:
    | string
    | string[]
    | undefined
) {
  const rawValue =
    Array.isArray(value)
      ? value[0]
      : value;

  if (
    !rawValue ||
    !VALID_ENTITY_TYPES.has(
      rawValue as ArchiveEntityType
    )
  ) {
    return null;
  }

  return rawValue as ArchiveEntityType;
}

function parsePositiveInteger(
  value:
    | string
    | string[]
    | undefined
) {
  const rawValue =
    Array.isArray(value)
      ? value[0]
      : value;

  const id = Number(rawValue);

  return (
    Number.isInteger(id) &&
    id > 0
      ? id
      : null
  );
}

function toAuditEntityType(
  entityType: ArchiveEntityType
) {
  switch (entityType) {
    case "CUSTOMER":
      return AuditEntityType.CUSTOMER;

    case "EMPLOYEE":
      return AuditEntityType.EMPLOYEE;

    case "ORDER":
      return AuditEntityType.ORDER;

    case "INVENTORY":
      return AuditEntityType.INVENTORY;

    case "USER":
      return AuditEntityType.USER;
  }
}

export const archiveController = {
  getArchiveSummary:
    async (
      _request: Request,
      response: Response
    ) => {
      try {
        const summary =
          await archiveService
            .getArchiveSummary();

        return response.json(
          summary
        );
      } catch (error) {
        console.error(
          "Get archive summary error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to get archive summary.",
        });
      }
    },

  getArchivedRecords:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const entityType =
          parseEntityType(
            request.params.entityType
          );

        if (!entityType) {
          return response.status(400).json({
            message:
              "Invalid archive entity type.",
          });
        }

        const records =
          await archiveService
            .getArchivedRecords(
              entityType
            );

        return response.json({
          entityType,
          count:
            records.length,
          records,
        });
      } catch (error) {
        console.error(
          "Get archived records error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to get archived records.",
        });
      }
    },

  archiveRecord:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const entityType =
          parseEntityType(
            request.params.entityType
          );

        const id =
          parsePositiveInteger(
            request.params.id
          );

        if (
          !entityType ||
          !id
        ) {
          return response.status(400).json({
            message:
              "Invalid archive request.",
          });
        }

        const authenticatedUserId =
          getAuthenticatedUserId(
            request
          );

        if (
          entityType === "USER" &&
          authenticatedUserId === id
        ) {
          return response.status(400).json({
            message:
              "You cannot archive your own account.",
          });
        }

        const existingRecord =
          await archiveService
            .getArchivedRecordById(
              entityType,
              id
            );

        if (existingRecord) {
          return response.status(409).json({
            message:
              "This record is already archived.",
          });
        }

        if (
          entityType === "USER"
        ) {
          const user =
            await userService.getUserById(
              id
            );

          if (!user) {
            return response.status(404).json({
              message:
                "User account was not found.",
            });
          }

          if (
            user.role ===
              UserRole.ADMIN &&
            user.status ===
              UserStatus.ACTIVE
          ) {
            const remainingAdmins =
              await userService
                .countActiveAdmins(
                  id
                );

            if (
              remainingAdmins < 1
            ) {
              return response.status(400).json({
                message:
                  "The last active administrator cannot be archived.",
              });
            }
          }
        }

        const performedBy =
          getAuthenticatedUserName(
            request
          );

        const record =
          await archiveService
            .archiveRecord(
              entityType,
              id,
              performedBy
            );

        await auditLogService
          .recordAuditLogSafely({
            action:
              AuditAction.ARCHIVE,

            entityType:
              toAuditEntityType(
                entityType
              ),

            entityId: id,

            entityName:
              `${entityType} #${id}`,

            description:
              `${entityType} #${id} was archived.`,

            performedBy,

            newData:
              record as never,
          });

        return response.json({
          message:
            "Record archived successfully.",

          entityType,
          record,
        });
      } catch (error) {
        console.error(
          "Archive record error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "Failed to archive record.";

        return response.status(
          message.includes(
            "not found"
          )
            ? 404
            : 500
        ).json({
          message,
        });
      }
    },

  restoreRecord:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const entityType =
          parseEntityType(
            request.params.entityType
          );

        const id =
          parsePositiveInteger(
            request.params.id
          );

        if (
          !entityType ||
          !id
        ) {
          return response.status(400).json({
            message:
              "Invalid restore request.",
          });
        }

        const archivedRecord =
          await archiveService
            .getArchivedRecordById(
              entityType,
              id
            );

        if (!archivedRecord) {
          return response.status(404).json({
            message:
              "Archived record was not found.",
          });
        }

        const performedBy =
          getAuthenticatedUserName(
            request
          );

        const record =
          await archiveService
            .restoreRecord(
              entityType,
              id
            );

        const restoredOrderCountsAsRevenue =
          entityType === "ORDER"
            ? await archiveService
                .canRestoredOrderCountAsRevenue(
                  id
                )
            : null;

        await auditLogService
          .recordAuditLogSafely({
            action:
              AuditAction.RESTORE,

            entityType:
              toAuditEntityType(
                entityType
              ),

            entityId: id,

            entityName:
              `${entityType} #${id}`,

            description:
              entityType === "ORDER" &&
              restoredOrderCountsAsRevenue ===
                false
                ? `Cancelled order #${id} was restored to the archive-visible state but remains excluded from revenue.`
                : `${entityType} #${id} was restored.`,

            performedBy,

            newData:
              record as never,
          });

        return response.json({
          message:
            entityType === "ORDER" &&
            restoredOrderCountsAsRevenue ===
              false
              ? "Cancelled order restored. It remains excluded from revenue."
              : "Record restored successfully.",

          entityType,
          record,

          revenueEligible:
            restoredOrderCountsAsRevenue,
        });
      } catch (error) {
        console.error(
          "Restore record error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "Failed to restore record.";

        return response.status(
          message.includes(
            "not found"
          )
            ? 404
            : 500
        ).json({
          message,
        });
      }
    },
};

export default archiveController;