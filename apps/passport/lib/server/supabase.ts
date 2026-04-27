import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { getRequiredEnv } from "@cubid/config"

let supabaseClient: SupabaseClient | null = null

export const setPassportSupabaseForTests = (
  client: SupabaseClient | null
) => {
  supabaseClient = client
}

export const getPassportSupabase = () => {
  if (!supabaseClient) {
    supabaseClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  return supabaseClient
}
