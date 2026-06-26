export const ADMIN_EMAILS: string[] = (() => {
  const raw =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ADMIN_EMAILS) ||
    (typeof process !== "undefined" && process.env?.ADMIN_EMAILS) ||
    "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
})();

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.ADMIN_EMAILS
  );
}
