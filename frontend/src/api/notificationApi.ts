import type {
  NotificationActionResponse,
  NotificationResponse,
  UnreadNotificationResponse,
} from "../types/notification";

const API_URL = "http://localhost:3000/api/notifications";

async function parseResponse<T>(response: Response): Promise<T> {
  let data: unknown;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "message" in data && typeof data.message === "string"
      ? data.message
      : "Request failed.";
    throw new Error(message);
  }
  return data as T;
}

function getAuthHeaders(token: string | undefined, includeJson = false): HeadersInit {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("Your session is unavailable. Please log in again.");
  }
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`,
  };
}

export async function getNotifications(token: string): Promise<NotificationResponse> {
  const response = await fetch(API_URL, { headers: getAuthHeaders(token) });
  return parseResponse<NotificationResponse>(response);
}

export async function getUnreadNotificationCount(token: string): Promise<UnreadNotificationResponse> {
  const response = await fetch(`${API_URL}/unread-count`, { headers: getAuthHeaders(token) });
  return parseResponse<UnreadNotificationResponse>(response);
}

export async function markNotificationAsRead(id: number, token: string): Promise<NotificationActionResponse> {
  const response = await fetch(`${API_URL}/${id}/read`, { method: "PUT", headers: getAuthHeaders(token) });
  return parseResponse<NotificationActionResponse>(response);
}

export async function markAllNotificationsAsRead(token: string): Promise<NotificationActionResponse> {
  const response = await fetch(`${API_URL}/read-all`, { method: "PUT", headers: getAuthHeaders(token) });
  return parseResponse<NotificationActionResponse>(response);
}