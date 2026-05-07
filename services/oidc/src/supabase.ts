import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getOidcRuntimeConfig } from "./config";

let supabaseClient: SupabaseClient | null = null;

export function getOidcSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const config = getOidcRuntimeConfig();

    supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}