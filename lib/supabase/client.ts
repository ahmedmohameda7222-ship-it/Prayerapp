import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let clientInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!url || !key) return null;
  if (clientInstance) return clientInstance;
  try {
    clientInstance = createSupabaseClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return clientInstance;
  } catch {
    return null;
  }
}

export function getSupabaseClient() {
  return createClient();
}
