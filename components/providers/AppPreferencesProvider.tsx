"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";
export type NotificationPreferenceKey = "prayer" | "iqama" | "jumuah" | "announcements" | "azkar";
type Preferences = Record<NotificationPreferenceKey, boolean>;

const defaultPreferences: Preferences = { prayer: true, iqama: true, jumuah: true, announcements: true, azkar: false };
const STORAGE_KEY = "deggendorf-app-preferences-v1";

type ContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  notifications: Preferences;
  setNotification: (key: NotificationPreferenceKey, enabled: boolean) => void;
  permission: NotificationPermission | "unsupported";
  requestNotificationPermission: () => Promise<void>;
};

const AppPreferencesContext = createContext<ContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const loadStored = () => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as { theme?: Theme; notifications?: Partial<Preferences> } | null;
    } catch { return null; }
  };
  const [theme, setThemeState] = useState<Theme>(() => loadStored()?.theme === "dark" ? "dark" : "light");
  const [notifications, setNotifications] = useState<Preferences>(() => ({ ...defaultPreferences, ...(loadStored()?.notifications || {}) }));
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, notifications }));
  }, [theme, notifications]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const setNotification = useCallback((key: NotificationPreferenceKey, enabled: boolean) => {
    setNotifications((current) => ({ ...current, [key]: enabled }));
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return setPermission("unsupported");
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      const registration = await navigator.serviceWorker?.ready;
      await registration?.showNotification("Deggendorf Prayer", { body: "Notifications are enabled.", icon: "/assets/app-icon-main.png" });
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme, notifications, setNotification, permission, requestNotificationPermission }), [theme, setTheme, notifications, setNotification, permission, requestNotificationPermission]);
  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const value = useContext(AppPreferencesContext);
  if (!value) throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  return value;
}
