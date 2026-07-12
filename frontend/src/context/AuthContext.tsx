import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
} from "../api/authApi";

import type {
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "../types/auth";

const TOKEN_STORAGE_KEY =
  "lavaco_auth_token";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;

  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;

  login: (
    credentials: LoginRequest
  ) => Promise<void>;

  register: (
    data: RegisterRequest
  ) => Promise<void>;

  logout: () => void;

  refreshUser: () => Promise<void>;
};

export const AuthContext =
  createContext<AuthContextValue | null>(
    null
  );

type AuthProviderProps = {
  children: ReactNode;
};

function getStoredToken() {
  return localStorage.getItem(
    TOKEN_STORAGE_KEY
  );
}

function storeToken(token: string) {
  localStorage.setItem(
    TOKEN_STORAGE_KEY,
    token
  );
}

function removeStoredToken() {
  localStorage.removeItem(
    TOKEN_STORAGE_KEY
  );
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [token, setToken] =
    useState<string | null>(() =>
      getStoredToken()
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function restoreSession() {
      const storedToken =
        getStoredToken();

      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const response =
          await getCurrentUser(
            storedToken
          );

        setToken(storedToken);
        setUser(response.user);
      } catch (error) {
        console.error(
          "Failed to restore session:",
          error
        );

        removeStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function login(
    credentials: LoginRequest
  ) {
    const response =
      await loginRequest(credentials);

    storeToken(response.token);

    setToken(response.token);
    setUser(response.user);
  }

  async function register(
    data: RegisterRequest
  ) {
    const response =
      await registerRequest(data);

    storeToken(response.token);

    setToken(response.token);
    setUser(response.user);
  }

  function logout() {
    removeStoredToken();

    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const response =
        await getCurrentUser(token);

      setUser(response.user);
    } catch (error) {
      console.error(
        "Failed to refresh user:",
        error
      );

      logout();

      throw error;
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,

      loading,

      isAuthenticated:
        Boolean(user && token),

      isAdmin:
        user?.role === "ADMIN",

      login,
      register,
      logout,
      refreshUser,
    }),
    [
      user,
      token,
      loading,
    ]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}