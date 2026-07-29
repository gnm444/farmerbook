import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/env";

export function createAdminClient() {
  const config = getPublicSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!config || !serviceRoleKey) {
    throw new Error(
      "Administrator operations require Supabase configuration and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(config.url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
