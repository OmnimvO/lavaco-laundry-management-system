import type {
  ShopSettings,
  UpdateShopSettingsData,
} from "../types/settings";

const API_URL =
  "http://localhost:3000/api/settings";

type UpdateSettingsResponse = {
  message: string;
  settings: ShopSettings;
};

async function parseResponse<T>(
  response: Response
): Promise<T> {
  let data: unknown;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message ===
        "string"
        ? data.message
        : "Settings request failed.";

    throw new Error(message);
  }

  return data as T;
}

function getAuthHeaders(
  token:
    | string
    | undefined,
  includeJson = false
): HeadersInit {
  if (
    typeof token !== "string" ||
    !token.trim()
  ) {
    throw new Error(
      "Your session is unavailable. Please log in again."
    );
  }

  return {
    ...(includeJson
      ? {
          "Content-Type":
            "application/json",
        }
      : {}),

    Authorization:
      `Bearer ${token}`,
  };
}

export async function getSettings(
  token: string
): Promise<ShopSettings> {
  const response =
    await fetch(API_URL, {
      headers:
        getAuthHeaders(token),
    });

  return parseResponse<
    ShopSettings
  >(response);
}

export async function updateSettings(
  data:
    UpdateShopSettingsData,
  token: string
): Promise<UpdateSettingsResponse> {
  const response =
    await fetch(API_URL, {
      method: "PUT",

      headers:
        getAuthHeaders(
          token,
          true
        ),

      body:
        JSON.stringify(data),
    });

  return parseResponse<
    UpdateSettingsResponse
  >(response);
}