"use client";

import { formatTime } from "@/lib/time-format";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";

export function FormattedTime({ time }: { time: string }) {
  const { timeFormat } = useTimeFormat();
  return <>{formatTime(time, timeFormat)}</>;
}

export function FormattedTimeRange({ start, end }: { start: string; end: string }) {
  const { timeFormat } = useTimeFormat();
  return <>{formatTime(start, timeFormat)}–{formatTime(end, timeFormat)}</>;
}
