import { getRequiredEnv } from '@cubid/config';
import { createClient } from '@supabase/supabase-js';

type AdminSupabaseClient = ReturnType<typeof createClient<any>>;

let supabaseClient: AdminSupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabaseClient) {
    supabaseClient = createClient<any>(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
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
