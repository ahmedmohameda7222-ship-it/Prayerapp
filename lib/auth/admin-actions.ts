"use server";

import { getAllowedAdminIdentity } from "./admin-server";
import { createServerClient } from "@/lib/supabase/server";

export async function verifyAdminAction(token: string): Promise<{ allowed: boolean; email?: string }> {
  const identity = await getAllowedAdminIdentity(token);
  if (!identity) return { allowed: false };

  return { allowed: true, email: identity.email };
}

export async function establishAdminSessionAction(
  token: string
): Promise<{ allowed: boolean; email?: string }> {
  const identity = await getAllowedAdminIdentity(token);
  if (!identity) return { allowed: false };

  const client = createServerClient();
  if (client) {
    const { error } = await client.from("admin_users").upsert(
      {
        user_id: identity.userId,
        email: identity.email,
        display_name: identity.displayName,
        role: "Admin",
      },
      { onConflict: "email" }
    );

    if (error) {
      console.error("Admin profile synchronization failed", { code: error.code });
    }
  }

  return { allowed: true, email: identity.email };
}
