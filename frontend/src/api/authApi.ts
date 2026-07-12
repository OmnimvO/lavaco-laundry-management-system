import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "../types/auth";

const API_URL =
  "http://localhost:3000/api/auth";

type CurrentUserResponse = {
  user: AuthResponse["user"];
};

type MessageResponse = {
  message: string;
};

type ChangePasswordData = {
  currentPassword: string;
  newPassword: string;
};

async function handleResponse<T>(
  response: Response
): Promise<T> {
  let data: unknown;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Authentication request failed.";

    throw new Error(message);
  }

  return data as T;
}

export async function login(
  data: LoginRequest
): Promise<AuthResponse> {
  const response = await fetch(
    `${API_URL}/login`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(data),
    }
  );

  return handleResponse<AuthResponse>(
    response
  );
}

export async function register(
  data: RegisterRequest
): Promise<AuthResponse> {
  const response = await fetch(
    `${API_URL}/register`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(data),
    }
  );

  return handleResponse<AuthResponse>(
    response
  );
}

export async function getCurrentUser(
  token: string
): Promise<CurrentUserResponse> {
  const response = await fetch(
    `${API_URL}/me`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return handleResponse<CurrentUserResponse>(
    response
  );
}

export async function changePassword(
  data: ChangePasswordData,
  token: string
): Promise<MessageResponse> {
  const response = await fetch(
    `${API_URL}/change-password`,
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify(data),
    }
  );

  return handleResponse<MessageResponse>(
    response
  );
}