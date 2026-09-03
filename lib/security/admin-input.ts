const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;
const MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/u;
const ADMIN_LOCALES = new Set(["ar", "en", "de", "tr"]);

export class AdminInputError extends Error {
  constructor(public readonly field: string) {
    super("admin.errors.invalidInput");
    this.name = "AdminInputError";
  }
}

function invalid(field: string): never {
  throw new AdminInputError(field);
}

export function parseAdminText(
  value: unknown,
  options: { field: string; max: number; required?: boolean; min?: number },
): string {
  if (typeof value !== "string" || !Number.isInteger(options.max) || options.max < 1) {
    return invalid(options.field);
  }
  const parsed = value.trim();
  const min = options.required ? Math.max(1, options.min ?? 1) : Math.max(0, options.min ?? 0);
  if (parsed.length < min || parsed.length > options.max) return invalid(options.field);
  return parsed;
}

export function parseAdminOptionalText(
  value: unknown,
  options: { field: string; max: number },
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseAdminText(value, options);
  return parsed || null;
}

export function parseAdminUuid(value: unknown, field: string): string {
  const parsed = parseAdminText(value, { field, max: 36, required: true });
  if (!UUID_PATTERN.test(parsed)) return invalid(field);
  return parsed.toLowerCase();
}

export function parseAdminLocale(value: unknown, field: string): "ar" | "en" | "de" | "tr" {
  const parsed = parseAdminText(value, { field, max: 2, required: true }).toLowerCase();
  if (!ADMIN_LOCALES.has(parsed)) return invalid(field);
  return parsed as "ar" | "en" | "de" | "tr";
}

export function parseAdminDate(value: unknown, field: string): string {
  const parsed = parseAdminText(value, { field, max: 10, required: true });
  const match = DATE_PATTERN.exec(parsed);
  if (!match) return invalid(field);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return invalid(field);
  return parsed;
}

export function parseAdminMonth(value: unknown, field: string): string {
  const parsed = parseAdminText(value, { field, max: 7, required: true });
  if (!MONTH_PATTERN.test(parsed)) return invalid(field);
  return parsed;
}

export function parseAdminTime(value: unknown, field: string): string {
  const parsed = parseAdminText(value, { field, max: 5, required: true });
  if (!TIME_PATTERN.test(parsed)) return invalid(field);
  return parsed;
}

export function parseAdminOptionalTime(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  return parseAdminTime(value, field);
}

export function parseAdminHttpsUrl(
  value: unknown,
  options: { field: string; max: number; required?: boolean },
): string {
  const parsed = parseAdminText(value, options);
  if (!parsed && !options.required) return "";
  try {
    const url = new URL(parsed);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return invalid(options.field);
    return url.toString();
  } catch {
    return invalid(options.field);
  }
}

export function parseAdminOptionalHttpsUrl(
  value: unknown,
  options: { field: string; max: number },
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return parseAdminHttpsUrl(value, options);
}

export function parseAdminEmail(value: unknown, field: string, required = false): string | null {
  if ((value === null || value === undefined || value === "") && !required) return null;
  const parsed = parseAdminText(value, { field, max: 320, required: true });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(parsed)) return invalid(field);
  return parsed.toLowerCase();
}

export function parseAdminNumber(
  value: unknown,
  options: { field: string; min: number; max: number; integer?: boolean },
): number {
  if (typeof value !== "string" && typeof value !== "number") return invalid(options.field);
  if (typeof value === "string" && !value.trim()) return invalid(options.field);
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < options.min || parsed > options.max) return invalid(options.field);
  if (options.integer && !Number.isInteger(parsed)) return invalid(options.field);
  return parsed;
}

export function parseAdminBoolean(value: unknown, field: string): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return invalid(field);
}

export function parseAdminEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  const parsed = parseAdminText(value, { field, max: 64, required: true });
  if (!(allowed as readonly string[]).includes(parsed)) return invalid(field);
  return parsed as T;
}
