import type {
  Order,
} from "../types/order";

const API_URL =
  "http://localhost:3000/api/orders";

export type OrderPayload = {
  customerId?:
    | number
    | null;

  walkInCustomerName?: string;
  walkInCustomerPhone?: string;
  walkInCustomerAddress?: string;

  laundryWeight: number;
  hasMixedWhiteColor: boolean;
  instructions?: string;

  serviceType: string;
  rinseCycles: number;

  soapQuantity: number;
  softenerQuantity: number;

  fulfillmentType: string;

  receivedBy?: string;
  claimedBy?: string;

  paymentStatus: string;
  status: string;
};

type DeleteOrderResponse = {
  message: string;
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
        : "Something went wrong while processing the order.";

    throw new Error(message);
  }

  return data as T;
}

function getHeaders(
  token: string,
  includeJson = false
): HeadersInit {
  if (!token.trim()) {
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

export async function getOrders(
  token: string
): Promise<Order[]> {
  const response =
    await fetch(API_URL, {
      headers:
        getHeaders(token),
    });

  return parseResponse<
    Order[]
  >(response);
}

export async function createOrder(
  data: OrderPayload,
  token: string
): Promise<Order> {
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
    Order
  >(response);
}

export async function updateOrder(
  id: number,
  data: OrderPayload,
  token: string
): Promise<Order> {
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
    Order
  >(response);
}

export async function deleteOrder(
  id: number,
  token: string
): Promise<DeleteOrderResponse> {
  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        method: "DELETE",

        headers:
          getHeaders(token),
      }
    );

  return parseResponse<
    DeleteOrderResponse
  >(response);
}