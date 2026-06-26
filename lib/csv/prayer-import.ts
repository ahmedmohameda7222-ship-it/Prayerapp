const requiredHeaders = ["date", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

function parseLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(current.trim()); current = ""; }
    else current += character;
  }
  values.push(current.trim());
  return values;
}

export function parsePrayerTimesCsv(input: string) {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSV must include a header and at least one row");
  const headers = parseLine(lines[0]).map((item) => item.trim());
  for (const header of requiredHeaders) if (!headers.includes(header)) throw new Error(`Missing CSV column: ${header}`);
  if (lines.length > 367) throw new Error("CSV import is limited to 366 days");
  return lines.slice(1).map((line, rowIndex) => {
    const values = parseLine(line);
    if (values.length !== headers.length) throw new Error(`CSV row ${rowIndex + 2} has the wrong number of columns`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}
