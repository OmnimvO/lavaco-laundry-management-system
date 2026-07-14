import type {
  Request,
  Response,
} from "express";

import {
  AuditAction,
  AuditEntityType,
} from "../generated/prisma/client.js";

import {
  tankCycleService,
} from "../services/tankCycle.service.js";

import {
  auditLogService,
} from "../services/auditLog.service.js";

import {
  getAuthenticatedUserName,
} from "../utils/authUser.js";

export const tankCycleController = {
  getStatus: async (
    _request: Request,
    response: Response
  ) => {
    try {
      const status =
        await tankCycleService.getTankStatus();

      return response.json(
        status
      );
    } catch (error) {
      console.error(
        "Get tank status error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to get tank status.",
      });
    }
  },

  getHistory: async (
    _request: Request,
    response: Response
  ) => {
    try {
      const history =
        await tankCycleService.getHistory();

      return response.json({
        count:
          history.length,

        history,
      });
    } catch (error) {
      console.error(
        "Get tank history error:",
        error
      );

      return response.status(500).json({
        message:
          "Failed to get tank replacement history.",
      });
    }
  },

  replaceTank: async (
    request: Request,
    response: Response
  ) => {
    try {
      const notes =
        typeof request.body?.notes ===
        "string"
          ? request.body.notes.trim() || null
          : null;

      const performedBy =
        getAuthenticatedUserName(
          request
        );

      const currentStatus =
        await tankCycleService.getTankStatus();

      const result =
        await tankCycleService.replaceTank(
          performedBy,
          notes
        );

      await auditLogService
        .recordAuditLogSafely({
          action:
            AuditAction.TANK_REPLACEMENT,

          entityType:
            AuditEntityType.TANK_CYCLE,

          entityId:
            result.replacedCycle.id,

          entityName:
            `Tank Cycle #${result.replacedCycle.id}`,

          description:
            `Tank was replaced after ${result.replacedCycle.currentLoads} loads.`,

          performedBy,

          previousData: {
            currentLoads:
              currentStatus.currentLoads,

            maximumLoads:
              currentStatus.maximumLoads,

            startedAt:
              currentStatus.startedAt
                .toISOString(),

            replacementRequired:
              currentStatus
                .replacementRequired,
          },

          newData: {
            replacedAt:
              result.replacedCycle
                .replacedAt
                ?.toISOString(),

            replacedBy:
              result.replacedCycle
                .replacedBy,

            replacementNotes:
              result.replacedCycle
                .replacementNotes,

            nextTankCycleId:
              result.nextCycle.id,

            currentLoads: 0,

            maximumLoads:
              result.nextCycle
                .maximumLoads,
          },
        });

      return response.json({
        message:
          "Tank replacement confirmed successfully.",

        replacedCycle:
          result.replacedCycle,

        currentCycle:
          result.nextCycle,
      });
    } catch (error) {
      console.error(
        "Replace tank error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to confirm tank replacement.";

      return response.status(500).json({
        message,
      });
    }
  },
};

export default tankCycleController;