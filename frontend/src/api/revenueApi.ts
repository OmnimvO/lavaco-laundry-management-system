import type {
  Order,
} from "../types/order";

const API_URL =
  "http://localhost:3000/api/revenue";

export type RevenueSummary = {
  totalRevenue: number;
  paidOrders: number;
  totalWeight: number;
  totalLoads: number;
  averageSale: number;
};

export type RevenueResponse = {
  startDate: string | null;
  endDate: string | null;
  summary: RevenueSummary;
  orders: Order[];
};

function getHeaders(
  token:
    | string
    | undefined
): HeadersInit {
  if (
    typeof token !== "string" ||
    !token.trim()
  ) {
    throw new Error(
      "Authorization token is required."
    );
  }

  return {
    Authorization:
      `Bearer ${token}`,
  };
}

async function parseResponse<T>(
  response: Response
): Promise<T> {
  const body =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof body?.message ===
        "string"
        ? body.message
        : "Revenue request failed."
    );
  }

  return body as T;
}

export async function getRevenue(
  token: string,
  startDate?: string,
  endDate?: string
): Promise<RevenueResponse> {
  const parameters =
    new URLSearchParams();

  if (
    startDate &&
    endDate
  ) {
    parameters.set(
      "startDate",
      startDate
    );

    parameters.set(
      "endDate",
      endDate
    );
  }

  const query =
    parameters.toString();

  const response =
    await fetch(
      query
        ? `${API_URL}?${query}`
        : API_URL,
      {
        method: "GET",

        headers:
          getHeaders(token),
      }
    );

  const result =
    await parseResponse<
      RevenueResponse
    >(response);

  return {
    startDate:
      result.startDate ??
      null,

    endDate:
      result.endDate ??
      null,

    summary: {
      totalRevenue:
        Number(
          result.summary
            ?.totalRevenue
        ) || 0,

      paidOrders:
        Number(
          result.summary
            ?.paidOrders
        ) || 0,

      totalWeight:
        Number(
          result.summary
            ?.totalWeight
        ) || 0,

      totalLoads:
        Number(
          result.summary
            ?.totalLoads
        ) || 0,

      averageSale:
        Number(
          result.summary
            ?.averageSale
        ) || 0,
    },

    orders:
      Array.isArray(
        result.orders
      )
        ? result.orders
        : [],
  };
}