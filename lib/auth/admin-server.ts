import "server-only";

import { createServerClient } from "@/lib/supabase/server";

function getServerAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAllowedAdminEmail(token: string): Promise<string | null> {
  if (!token) return null;

  const client = createServerClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user?.email) return null;

    const email = data.user.email.toLowerCase();
    const allowed = getServerAdminEmails();
    if (!allowed.includes(email)) return null;

    return email;
  } catch {
    return null;
  }
}

export async function requireAllowedAdmin(token: string): Promise<string> {
  const email = await getAllowedAdminEmail(token);
  if (!email) {
    throw new Error("admin.errors.unauthorized");
  }
  return email;
}
