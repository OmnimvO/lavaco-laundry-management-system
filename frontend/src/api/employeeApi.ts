import type { Employee } from "../types/employee";

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

async function parseErrorMessage(
  response: Response
) {
  try {
    const errorData =
      await response.json();

    return (
      errorData.message ||
      "Something went wrong while processing the employee."
    );
  } catch {
    return (
      "Something went wrong while processing the employee."
    );
  }
}

export async function getEmployees(): Promise<
  Employee[]
> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    const message =
      await parseErrorMessage(response);

    throw new Error(message);
  }

  return response.json();
}

export async function getEmployeeById(
  id: number
): Promise<Employee> {
  const response = await fetch(
    `${API_URL}/${id}`
  );

  if (!response.ok) {
    const message =
      await parseErrorMessage(response);

    throw new Error(message);
  }

  return response.json();
}

export async function createEmployee(
  data: EmployeePayload
): Promise<Employee> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message =
      await parseErrorMessage(response);

    throw new Error(message);
  }

  return response.json();
}

export async function updateEmployee(
  id: number,
  data: EmployeePayload
): Promise<Employee> {
  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const message =
      await parseErrorMessage(response);

    throw new Error(message);
  }

  return response.json();
}

export async function deleteEmployee(
  id: number
) {
  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const message =
      await parseErrorMessage(response);

    throw new Error(message);
  }

  return response.json();
}