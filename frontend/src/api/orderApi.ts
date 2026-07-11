import type { Order } from "../types/order";

const API_URL = "http://localhost:3000/api/orders";

export type OrderPayload = {
  customerId?: number | null;

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

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = (await response.json()) as {
      message?: string;
    };

    return (
      errorData.message ??
      "Something went wrong while processing the order."
    );
  } catch {
    return "Something went wrong while processing the order.";
  }
}

export async function getOrders(): Promise<Order[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as Order[];
}

export async function createOrder(
  data: OrderPayload
): Promise<Order> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as Order;
}

export async function updateOrder(
  id: number,
  data: OrderPayload
): Promise<Order> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as Order;
}

export async function deleteOrder(
  id: number
): Promise<DeleteOrderResponse> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as DeleteOrderResponse;
}