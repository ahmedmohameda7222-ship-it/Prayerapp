function ceilInstantToMinute(instant: Date): Date {
  if (Number.isNaN(instant.getTime())) throw new Error("Invalid instant");

  const remainderMs = instant.getUTCSeconds() * 1000 + instant.getUTCMilliseconds();
  return remainderMs === 0
    ? new Date(instant.getTime())
    : new Date(instant.getTime() + (60_000 - remainderMs));
}

function localIsoDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!values.year || !values.month || !values.day) {
    throw new Error("Unable to resolve local date");
  }
  return `${values.year}-${values.month}-${values.day}`;
}

export function ceilInstantToLocalMinuteWithDate(
  instant: Date,
  timeZone: string,
): { date: string; time: string } {
  const rounded = ceilInstantToMinute(instant);
  return {
    date: localIsoDate(rounded, timeZone),
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(rounded),
  };
}

export function ceilInstantToLocalMinute(
  instant: Date,
  timeZone: string,
): string {
  return ceilInstantToLocalMinuteWithDate(instant, timeZone).time;
}
