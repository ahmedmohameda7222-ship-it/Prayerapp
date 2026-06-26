"use client";

import { createContext, useContext, useState, useCallback } from "react";

const COOKIE_NAME = "timeFormat";

type TimeFormat = "24-hour" | "12-hour";

function getCookieFormat(): TimeFormat | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
  if (match) {
    const value = match[2];
    if (value === "24-hour" || value === "12-hour") return value;
  }
  return null;
}

function resolveInitialFormat(): TimeFormat {
  if (typeof window === "undefined") return "24-hour";
  return getCookieFormat() || "24-hour";
}

const TimeFormatContext = createContext<{
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
}>({
  timeFormat: "24-hour",
  setTimeFormat: () => {},
});

export function TimeFormatProvider({ children }: { children: React.ReactNode }) {
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(() => resolveInitialFormat());

  const setTimeFormat = useCallback((format: TimeFormat) => {
    setTimeFormatState(format);
    document.cookie = `${COOKIE_NAME}=${format}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, []);

  return (
    <TimeFormatContext.Provider value={{ timeFormat, setTimeFormat }}>
      {children}
    </TimeFormatContext.Provider>
  );
}

export function useTimeFormat() {
  return useContext(TimeFormatContext);
}
