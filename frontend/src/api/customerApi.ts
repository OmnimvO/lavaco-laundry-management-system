import type {
  Customer,
} from "../types/customer";

const API_URL =
  "http://localhost:3000/api/customers";

export type CustomerPayload = {
  name: string;
  phone?: string;
  address?: string;
};

export type UpdateCustomerPayload = {
  name?: string;
  phone?: string;
  address?: string;
};

export type CustomerLookupResponse = {
  found: boolean;
  customer: Customer | null;
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
        : "Customer request failed.";

    throw new Error(message);
  }

  return data as T;
}

function getHeaders(
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


export async function lookupCustomerByPhone(
  phone: string,
  token: string
): Promise<CustomerLookupResponse> {
  const normalizedPhone =
    phone.trim();

  if (!normalizedPhone) {
    return {
      found: false,
      customer: null,
    };
  }

  const params =
    new URLSearchParams({
      phone:
        normalizedPhone,
    });

  const response =
    await fetch(
      `${API_URL}/lookup?${params.toString()}`,
      {
        headers:
          getHeaders(token),
      }
    );

  return parseResponse<
    CustomerLookupResponse
  >(response);
}

export async function getCustomers(
  token: string
): Promise<Customer[]> {
  const response =
    await fetch(API_URL, {
      headers:
        getHeaders(token),
    });

  return parseResponse<
    Customer[]
  >(response);
}

export async function createCustomer(
  data: CustomerPayload,
  token: string
): Promise<Customer> {
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
    Customer
  >(response);
}

export async function deleteCustomer(
  id: number,
  token: string
): Promise<{
  message?: string;
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

export async function updateCustomer(
  id: number,
  data:
    UpdateCustomerPayload,
  token: string
): Promise<Customer> {
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
    Customer
  >(response);
}