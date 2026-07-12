import prisma from "../lib/prisma.js";
import {
  AuditAction,
  AuditEntityType,
  Prisma,
} from "../generated/prisma/client.js";

type CreateAuditLogData = {
  action: AuditAction;
  entityType: AuditEntityType;

  entityId?: number | null;
  entityName?: string | null;

  description: string;
  performedBy?: string | null;

  previousData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
};

function buildAuditLogData(
  data: CreateAuditLogData
) {
  return {
    action: data.action,
    entityType: data.entityType,

    entityId: data.entityId ?? null,

    entityName:
      data.entityName?.trim() || null,

    description:
      data.description.trim(),

    performedBy:
      data.performedBy?.trim() || null,

    previousData:
      data.previousData,

    newData:
      data.newData,
  };
}

export const auditLogService = {
  createAuditLog: async (
    data: CreateAuditLogData
  ) => {
    return prisma.auditLog.create({
      data: buildAuditLogData(data),
    });
  },

  recordAuditLogSafely: async (
    data: CreateAuditLogData
  ) => {
    try {
      return await prisma.auditLog.create({
        data: buildAuditLogData(data),
      });
    } catch (error) {
      console.error(
        "Failed to record audit log:",
        error
      );

      return null;
    }
  },

  getAllAuditLogs: async () => {
    return prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  getAuditLogById: async (
    id: number
  ) => {
    return prisma.auditLog.findUnique({
      where: {
        id,
      },
    });
  },

  getAuditLogsByEntity: async (
    entityType: AuditEntityType,
    entityId: number
  ) => {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  },

  deleteAuditLog: async (
    id: number
  ) => {
    return prisma.auditLog.delete({
      where: {
        id,
      },
    });
  },
};