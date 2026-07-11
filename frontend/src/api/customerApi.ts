import type { Customer } from "../types/customer";

const API_URL = "http://localhost:3000/api/customers";

export async function getCustomers(): Promise<Customer[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch customers");
  }

  return response.json();
}

export async function createCustomer(data: {
  name: string;
  phone?: string;
  address?: string;
}): Promise<Customer> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create customer");
  }

  return response.json();
}

export async function deleteCustomer(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete customer");
  }
}

export async function updateCustomer(
  id: number,
  data: {
    name?: string;
    phone?: string;
    address?: string;
  }
): Promise<Customer> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update customer");
  }

  return response.json();
}