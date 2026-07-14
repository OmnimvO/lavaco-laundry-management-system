import type {
  ReplaceTankResponse,
  TankHistoryResponse,
  TankStatus,
} from "../types/tankCycle";

const API_URL = "http://localhost:3000/api/tank-cycles";

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

export async function getTankStatus(token: string): Promise<TankStatus> {
  const response = await fetch(`${API_URL}/status`, { headers: getAuthHeaders(token) });
  return parseResponse<TankStatus>(response);
}

export async function getTankHistory(token: string): Promise<TankHistoryResponse> {
  const response = await fetch(`${API_URL}/history`, { headers: getAuthHeaders(token) });
  return parseResponse<TankHistoryResponse>(response);
}

export async function replaceTank(
  notes: string | null,
  token: string
): Promise<ReplaceTankResponse> {
  const response = await fetch(`${API_URL}/replace`, {
    method: "POST",
    headers: getAuthHeaders(token, true),
    body: JSON.stringify({ notes }),
  });
  return parseResponse<ReplaceTankResponse>(response);
}