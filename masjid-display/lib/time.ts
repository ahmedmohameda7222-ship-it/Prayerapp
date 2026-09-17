function dateParts(instant: Date, timeZone: string) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
}

export function zonedDateTime(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);

  const offsetAt = (timestamp: number) => {
    const parts = dateParts(new Date(timestamp), timeZone);
    return (
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
      ) - timestamp
    );
  };

  let timestamp = desiredUtc - offsetAt(desiredUtc);
  timestamp = desiredUtc - offsetAt(timestamp);
  return new Date(timestamp);
}

export function localDateIso(instant: Date, timeZone: string): string {
  const parts = dateParts(instant, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isFridayIso(date: string): boolean {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 5;
}
