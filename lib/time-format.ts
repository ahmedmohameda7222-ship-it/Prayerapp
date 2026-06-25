export function to12Hour(time: string): string {
  const [hoursRaw, minutes] = time.split(":");
  const hours = Number(hoursRaw);
  if (Number.isNaN(hours)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
}

export function formatTime(time: string, format: "24-hour" | "12-hour"): string {
  if (!time || format === "24-hour") return time;
  return to12Hour(time);
}

export function formatTimeRange(start: string, end: string, format: "24-hour" | "12-hour"): string {
  if (format === "24-hour") return `${start}–${end}`;
  return `${to12Hour(start)}–${to12Hour(end)}`;
}
