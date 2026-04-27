import { getSupabaseServiceRoleConfig } from '@cubid/config';
import { createClient } from '@supabase/supabase-js';

type AdminSupabaseClient = ReturnType<typeof createClient<any>>;

let supabaseClient: AdminSupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabaseClient) {
    const config = getSupabaseServiceRoleConfig();
    supabaseClient = createClient<any>(
      config.url,
      config.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return supabaseClient;
};
