"use server";

import { getAllowedAdminEmail } from "./admin-server";
import { createServerClient } from "@/lib/supabase/server";

export async function verifyAdminAction(token: string): Promise<{ allowed: boolean; email?: string }> {
  const email = await getAllowedAdminEmail(token);
  if (!email) return { allowed: false };

  const client = createServerClient();
  if (client) {
    const { data } = await client.auth.getUser(token);
    await client.from("admin_users").upsert(
      {
        user_id: data.user?.id || null,
        email,
        display_name: data.user?.user_metadata?.display_name || email.split("@")[0],
        role: "Admin",
      },
      { onConflict: "email" }
    );
  }

  return { allowed: true, email };
}
