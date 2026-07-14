import type {
  Employee,
} from "../types/employee";

const API_URL =
  "http://localhost:3000/api/employees";

export type EmployeePayload = {
  firstName: string;
  lastName: string;

  phone?: string;
  address?: string;

  position: string;
  status: string;

  dateHired: string;
  notes?: string;
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
        : "Something went wrong while processing the employee.";

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

export async function getEmployees(
  token: string
): Promise<Employee[]> {
  const response =
    await fetch(API_URL, {
      headers:
        getHeaders(token),
    });

  return parseResponse<
    Employee[]
  >(response);
}

export async function getEmployeeById(
  id: number,
  token: string
): Promise<Employee> {
  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        headers:
          getHeaders(token),
      }
    );

  return parseResponse<
    Employee
  >(response);
}

export async function createEmployee(
  data: EmployeePayload,
  token: string
): Promise<Employee> {
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
    Employee
  >(response);
}

export async function updateEmployee(
  id: number,
  data: EmployeePayload,
  token: string
): Promise<Employee> {
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
    Employee
  >(response);
}

export async function deleteEmployee(
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