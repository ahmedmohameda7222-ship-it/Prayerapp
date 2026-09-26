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
  const matchesDesiredWallTime = (timestamp: number) => {
    const parts = dateParts(new Date(timestamp), timeZone);
    return (
      Number(parts.year) === year &&
      Number(parts.month) === month &&
      Number(parts.day) === day &&
      Number(parts.hour) === hour &&
      Number(parts.minute) === minute
    );
  };

  // Match the root Prayerapp and Android policy for every accepted IANA zone:
  // when a fall-back overlap produces two valid instants, choose the later
  // instant. This is equivalent to java.time's withLaterOffsetAtOverlap().
  const probeDeltas = [-48, -24, 0, 24, 48].map((hours) => hours * 60 * 60 * 1000);
  const offsets = new Set(probeDeltas.map((delta) => offsetAt(desiredUtc + delta)));
  const exactCandidates = Array.from(offsets)
    .map((offset) => desiredUtc - offset)
    .filter(matchesDesiredWallTime);

  if (exactCandidates.length > 0) {
    return new Date(Math.max(...exactCandidates));
  }

  // For a spring-forward gap, match java.time ZonedDateTime.of by shifting
  // the nonexistent wall time forward by the gap (resolve with pre-gap offset).
  const beforeOffset = offsetAt(desiredUtc - 48 * 60 * 60 * 1000);
  const afterOffset = offsetAt(desiredUtc + 48 * 60 * 60 * 1000);
  if (afterOffset > beforeOffset) {
    return new Date(desiredUtc - beforeOffset);
  }

  // Defensive fallback for unusual historical transitions not captured by
  // the probes above.
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
