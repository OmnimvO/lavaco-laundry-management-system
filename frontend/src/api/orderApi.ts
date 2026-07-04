import type { Order } from "../types/order";

const API_URL = "http://localhost:3000/orders";

export async function getOrders(): Promise<Order[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch orders");
  }

  return response.json();
}

export async function createOrder(data: {
  customerId?: number | null;
  walkInCustomerName?: string;
  walkInCustomerPhone?: string;
  walkInCustomerAddress?: string;
  basketCount: number;
  serviceType: string;
  washType?: string;
  dryExtend?: boolean;
  serviceFee?: number;
  soap?: string;
  soapPrice?: number;
  softener?: string;
  softenerPrice?: number;
  fulfillmentType?: string;
  deliveryFee?: number;
  hasMixedWhiteColor?: boolean;
  receivedBy?: string;
  claimedBy?: string;
  instructions?: string;
  totalPrice: number;
  status?: string;
  paymentStatus?: string;
}): Promise<Order> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create order");
  }

  return response.json();
}

export async function deleteOrder(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete order");
  }
}