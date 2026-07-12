import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getSettings,
  updateSettings as updateSettingsRequest,
} from "../api/settingsApi";

import type {
  ShopSettings,
  UpdateShopSettingsData,
} from "../types/settings";

import { useAuth } from "../hooks/useAuth";

type SettingsContextValue = {
  settings: ShopSettings | null;

  loading: boolean;
  errorMessage: string | null;

  refreshSettings: () => Promise<void>;

  saveSettings: (
    data: UpdateShopSettingsData
  ) => Promise<ShopSettings>;
};

export const SettingsContext =
  createContext<SettingsContextValue | null>(
    null
  );

type SettingsProviderProps = {
  children: ReactNode;
};

export function SettingsProvider({
  children,
}: SettingsProviderProps) {
  const {
    token,
    isAuthenticated,
  } = useAuth();

  const [
    settings,
    setSettings,
  ] = useState<ShopSettings | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  const refreshSettings =
    useCallback(async () => {
      if (
        !token ||
        !isAuthenticated
      ) {
        setSettings(null);
        setErrorMessage(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);

        const settingsData =
          await getSettings(token);

        setSettings(settingsData);
      } catch (error) {
        console.error(
          "Failed to load settings:",
          error
        );

        setSettings(null);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load shop settings."
        );
      } finally {
        setLoading(false);
      }
    }, [
      token,
      isAuthenticated,
    ]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  async function saveSettings(
    data: UpdateShopSettingsData
  ) {
    if (!token) {
      throw new Error(
        "Your session is unavailable."
      );
    }

    const response =
      await updateSettingsRequest(
        data,
        token
      );

    setSettings(response.settings);

    return response.settings;
  }

  const value =
    useMemo<SettingsContextValue>(
      () => ({
        settings,
        loading,
        errorMessage,
        refreshSettings,
        saveSettings,
      }),
      [
        settings,
        loading,
        errorMessage,
        refreshSettings,
      ]
    );

  return (
    <SettingsContext.Provider
      value={value}
    >
      {children}
    </SettingsContext.Provider>
  );
}