import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./auth";
import { supabase } from "./supabase";
import type { UserSettings } from "../types/database";

const defaultSettings = (userId: string): UserSettings => ({
  user_id: userId,
  alert_at_80_percent: true,
  alert_at_100_percent: true,
  weekly_summary_enabled: true,
  is_premium: false,
});

type ToggleableSetting =
  | "alert_at_80_percent"
  | "alert_at_100_percent"
  | "weekly_summary_enabled";

type SettingsContextValue = {
  settings: UserSettings | null;
  isLoading: boolean;
  /** optymistyczna zmiana ustawienia + zapis do user_settings */
  updateSetting: (key: ToggleableSetting, value: boolean) => void;
  settingsErrorMessage: string | null;
  clearSettingsError: () => void;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  isLoading: true,
  updateSetting: () => {},
  settingsErrorMessage: null,
  clearSettingsError: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!userId) {
      setSettings(null);
      setIsLoading(true);
      return;
    }

    let cancelled = false;
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          // Brak wiersza (nie powinien się zdarzyć — tworzy go trigger)
          // nie blokuje aplikacji: działamy na domyślnych wartościach.
          setSettings(data ?? defaultSettings(userId));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const updateSetting = useCallback(
    (key: ToggleableSetting, value: boolean) => {
      if (!userId) {
        return;
      }

      let previous: UserSettings | null = null;
      setSettings((current) => {
        previous = current;
        return current ? { ...current, [key]: value } : current;
      });

      const patch = { [key]: value } as Partial<
        Pick<UserSettings, ToggleableSetting>
      >;
      supabase
        .from("user_settings")
        .update(patch)
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) {
            setSettings(previous);
            setSettingsErrorMessage(
              "Nie udało się zapisać ustawienia. Spróbuj ponownie."
            );
          }
        });
    },
    [userId]
  );

  const clearSettingsError = useCallback(
    () => setSettingsErrorMessage(null),
    []
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSetting,
        settingsErrorMessage,
        clearSettingsError,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
