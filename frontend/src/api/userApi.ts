import type {
  CreateUserData,
  ResetPasswordData,
  UpdateUserData,
  UserAccount,
} from "../types/user";

const API_URL =
  "http://localhost:3000/api/users";

function getAuthHeaders(
  token: string | undefined,
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
    Authorization:
      `Bearer ${token}`,

    ...(includeJson
      ? {
          "Content-Type":
            "application/json",
        }
      : {}),
  };
}

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
        : "User account request failed.";

    throw new Error(message);
  }

  return data as T;
}

export async function getUsers(
  token: string
): Promise<UserAccount[]> {
  const response =
    await fetch(API_URL, {
      headers:
        getAuthHeaders(token),
    });

  return parseResponse<
    UserAccount[]
  >(response);
}

export async function getUserById(
  id: number,
  token: string
): Promise<UserAccount> {
  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        headers:
          getAuthHeaders(token),
      }
    );

  return parseResponse<
    UserAccount
  >(response);
}

export async function createUser(
  data: CreateUserData,
  token: string
): Promise<{
  message: string;
  user: UserAccount;
}> {
  const response =
    await fetch(API_URL, {
      method: "POST",

      headers:
        getAuthHeaders(
          token,
          true
        ),

      body:
        JSON.stringify(data),
    });

  return parseResponse(response);
}

export async function updateUser(
  id: number,
  data: UpdateUserData,
  token: string
): Promise<{
  message: string;
  user: UserAccount;
}> {
  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        method: "PUT",

        headers:
          getAuthHeaders(
            token,
            true
          ),

        body:
          JSON.stringify(data),
      }
    );

  return parseResponse(response);
}

export async function resetUserPassword(
  id: number,
  data: ResetPasswordData,
  token: string
): Promise<{
  message: string;
}> {
  const response =
    await fetch(
      `${API_URL}/${id}/reset-password`,
      {
        method: "PATCH",

        headers:
          getAuthHeaders(
            token,
            true
          ),

        body:
          JSON.stringify(data),
      }
    );

  return parseResponse(response);
}

export async function deleteUser(
  id: number,
  token: string
): Promise<{
  message: string;
}> {
  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        method: "DELETE",

        headers:
          getAuthHeaders(token),
      }
    );

  return parseResponse(response);
}