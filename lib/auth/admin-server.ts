import "server-only";

import { createServerClient } from "@/lib/supabase/server";

export type AllowedAdminIdentity = {
  userId: string;
  email: string;
};

function getServerAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAllowedAdminIdentity(token: string): Promise<AllowedAdminIdentity | null> {
  if (!token) return null;

  const client = createServerClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user?.id || !data.user.email) return null;

    const email = data.user.email.toLowerCase();
    const allowed = getServerAdminEmails();
    if (!allowed.includes(email)) return null;

    return { userId: data.user.id, email };
  } catch {
    return null;
  }
}

export async function getAllowedAdminEmail(token: string): Promise<string | null> {
  return (await getAllowedAdminIdentity(token))?.email ?? null;
}

export async function requireAllowedAdminIdentity(token: string): Promise<AllowedAdminIdentity> {
  const identity = await getAllowedAdminIdentity(token);
  if (!identity) {
    throw new Error("admin.errors.unauthorized");
  }
  return identity;
}

export async function requireAllowedAdmin(token: string): Promise<string> {
  return (await requireAllowedAdminIdentity(token)).email;
}
