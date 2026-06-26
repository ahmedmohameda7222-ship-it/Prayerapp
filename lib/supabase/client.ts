import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  if (!url || !key) return null;
  try {
    return createSupabaseClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch {
    return null;
  }
}
