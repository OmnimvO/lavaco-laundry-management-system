import type { Request } from "express";
import { UserRole } from "../generated/prisma/client.js";

type AuthenticatedUser = {
  userId?: number;
  id?: number;
  name?: string;
  email?: string;
  role?: UserRole;
};

export function getAuthenticatedUser(
  request: Request
) {
  return request.user as
    | AuthenticatedUser
    | undefined;
}

export function getAuthenticatedUserId(
  request: Request
) {
  const user =
    getAuthenticatedUser(request);

  const id =
    user?.userId ?? user?.id;

  return Number.isInteger(id)
    ? Number(id)
    : null;
}

export function getAuthenticatedUserName(
  request: Request
) {
  const user =
    getAuthenticatedUser(request);

  return (
    user?.name?.trim() ||
    user?.email?.trim() ||
    "System"
  );
}

export function isAdminRequest(
  request: Request
) {
  return (
    getAuthenticatedUser(request)?.role ===
    UserRole.ADMIN
  );
}