export function ceilInstantToLocalMinute(
  instant: Date,
  timeZone: string,
): string {
  if (Number.isNaN(instant.getTime())) throw new Error("Invalid instant");

  const remainderMs = instant.getUTCSeconds() * 1000 + instant.getUTCMilliseconds();
  const rounded =
    remainderMs === 0
      ? new Date(instant.getTime())
      : new Date(instant.getTime() + (60_000 - remainderMs));

  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(rounded);
}
