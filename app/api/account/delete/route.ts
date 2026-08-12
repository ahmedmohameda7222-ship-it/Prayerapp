import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Account service unavailable" }, { status: 503 });

  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = data.user.id;
  const { error: subscriptionError } = await client
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId);
  if (subscriptionError) {
    console.error("[account delete] subscription cleanup failed", subscriptionError.message);
    return NextResponse.json({ error: "Could not clean account notifications" }, { status: 500 });
  }

  const { error: deleteError } = await client.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("[account delete] auth deletion failed", deleteError.message);
    return NextResponse.json({ error: "Could not delete account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
