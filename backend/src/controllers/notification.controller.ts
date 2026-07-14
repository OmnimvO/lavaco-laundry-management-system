import type {
  Request,
  Response,
} from "express";

import {
  UserRole,
} from "../generated/prisma/client.js";

import {
  notificationService,
} from "../services/notification.service.js";

import {
  getAuthenticatedUser,
  getAuthenticatedUserId,
} from "../utils/authUser.js";

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

function getAuthenticatedIdentity(
  request: Request
) {
  const userId =
    getAuthenticatedUserId(
      request
    );

  const role =
    getAuthenticatedUser(
      request
    )?.role;

  if (
    !userId ||
    !role ||
    !Object.values(
      UserRole
    ).includes(role)
  ) {
    return null;
  }

  return {
    userId,
    role,
  };
}

export const notificationController = {
  getMyNotifications:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const identity =
          getAuthenticatedIdentity(
            request
          );

        if (!identity) {
          return response.status(401).json({
            message:
              "Authenticated user details are unavailable.",
          });
        }

        const notifications =
          await notificationService
            .getNotificationsForUser(
              identity.userId,
              identity.role
            );

        const formattedNotifications =
          notifications.map(
            (notification) => {
              const isRead =
                notification.reads
                  .length > 0;

              const {
                reads:
                  _reads,
                ...notificationData
              } = notification;

              return {
                ...notificationData,
                isRead,
              };
            }
          );

        const unreadCount =
          formattedNotifications.filter(
            (notification) =>
              !notification.isRead
          ).length;

        return response.json({
          unreadCount,
          notifications:
            formattedNotifications,
        });
      } catch (error) {
        console.error(
          "Get notifications error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to get notifications.",
        });
      }
    },

  getUnreadCount:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const identity =
          getAuthenticatedIdentity(
            request
          );

        if (!identity) {
          return response.status(401).json({
            message:
              "Authenticated user details are unavailable.",
          });
        }

        const notifications =
          await notificationService
            .getNotificationsForUser(
              identity.userId,
              identity.role
            );

        const unreadCount =
          notifications.filter(
            (notification) =>
              notification.reads
                .length === 0
          ).length;

        return response.json({
          unreadCount,
        });
      } catch (error) {
        console.error(
          "Get unread notification count error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to get unread notification count.",
        });
      }
    },

  markAsRead:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const notificationId =
          parsePositiveInteger(
            request.params.id
          );

        const identity =
          getAuthenticatedIdentity(
            request
          );

        if (!notificationId) {
          return response.status(400).json({
            message:
              "Invalid notification ID.",
          });
        }

        if (!identity) {
          return response.status(401).json({
            message:
              "Authenticated user details are unavailable.",
          });
        }

        await notificationService
          .markAsRead(
            notificationId,
            identity.userId
          );

        return response.json({
          message:
            "Notification marked as read.",
        });
      } catch (error) {
        console.error(
          "Mark notification read error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "Failed to mark notification as read.";

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

  markAllAsRead:
    async (
      request: Request,
      response: Response
    ) => {
      try {
        const identity =
          getAuthenticatedIdentity(
            request
          );

        if (!identity) {
          return response.status(401).json({
            message:
              "Authenticated user details are unavailable.",
          });
        }

        const result =
          await notificationService
            .markAllAsRead(
              identity.userId,
              identity.role
            );

        return response.json({
          message:
            "Notifications marked as read.",

          ...result,
        });
      } catch (error) {
        console.error(
          "Mark all notifications read error:",
          error
        );

        return response.status(500).json({
          message:
            "Failed to mark notifications as read.",
        });
      }
    },
};

export default notificationController;