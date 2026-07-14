import type {
  CreateInventoryItemData,
  InventoryItem,
  InventoryMovement,
  InventoryMovementData,
  InventoryMovementResponse,
  UpdateInventoryItemData,
} from "../types/inventory";

const API_URL =
  "http://localhost:3000/api/inventory";

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
        : "Inventory request failed.";

    throw new Error(message);
  }

  return data as T;
}

function getHeaders(
  token: string,
  includeJson = false
) {
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

export async function getInventoryItems(
  token: string
): Promise<InventoryItem[]> {
  const response =
    await fetch(API_URL, {
      headers:
        getHeaders(token),
    });

  return parseResponse<
    InventoryItem[]
  >(response);
}

export async function getInventoryItem(
  id: number,
  token: string
): Promise<InventoryItem> {
  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        headers:
          getHeaders(token),
      }
    );

  return parseResponse<
    InventoryItem
  >(response);
}

export async function getLowStockItems(
  token: string
): Promise<InventoryItem[]> {
  const response =
    await fetch(
      `${API_URL}/low-stock`,
      {
        headers:
          getHeaders(token),
      }
    );

  return parseResponse<
    InventoryItem[]
  >(response);
}

export async function createInventoryItem(
  data:
    CreateInventoryItemData,
  token: string
): Promise<InventoryItem> {
  const response =
    await fetch(API_URL, {
      method: "POST",

      headers:
        getHeaders(
          token,
          true
        ),

      body:
        JSON.stringify(data),
    });

  return parseResponse<
    InventoryItem
  >(response);
}

export async function updateInventoryItem(
  id: number,
  data:
    UpdateInventoryItemData,
  token: string
): Promise<InventoryItem> {
  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        method: "PUT",

        headers:
          getHeaders(
            token,
            true
          ),

        body:
          JSON.stringify(data),
      }
    );

  return parseResponse<
    InventoryItem
  >(response);
}

export async function archiveInventoryItem(
  id: number,
  token: string
): Promise<{
  message: string;
  item: InventoryItem;
}> {
  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        method: "DELETE",

        headers:
          getHeaders(token),
      }
    );

  return parseResponse(response);
}

export async function stockInInventoryItem(
  id: number,
  data:
    InventoryMovementData,
  token: string
): Promise<InventoryMovementResponse> {
  const response =
    await fetch(
      `${API_URL}/${id}/stock-in`,
      {
        method: "POST",

        headers:
          getHeaders(
            token,
            true
          ),

        body:
          JSON.stringify(data),
      }
    );

  return parseResponse(response);
}

export async function stockOutInventoryItem(
  id: number,
  data:
    InventoryMovementData,
  token: string
): Promise<InventoryMovementResponse> {
  const response =
    await fetch(
      `${API_URL}/${id}/stock-out`,
      {
        method: "POST",

        headers:
          getHeaders(
            token,
            true
          ),

        body:
          JSON.stringify(data),
      }
    );

  return parseResponse(response);
}

export async function adjustInventoryItem(
  id: number,
  data:
    InventoryMovementData,
  token: string
): Promise<InventoryMovementResponse> {
  const response =
    await fetch(
      `${API_URL}/${id}/adjust`,
      {
        method: "POST",

        headers:
          getHeaders(
            token,
            true
          ),

        body:
          JSON.stringify(data),
      }
    );

  return parseResponse(response);
}

export async function getInventoryMovements(
  id: number,
  token: string
): Promise<InventoryMovement[]> {
  const response =
    await fetch(
      `${API_URL}/${id}/movements`,
      {
        headers:
          getHeaders(token),
      }
    );

  return parseResponse<
    InventoryMovement[]
  >(response);
}