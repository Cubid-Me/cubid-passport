import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseServiceRoleConfig } from "@cubid/config"

let supabaseClient: SupabaseClient | null = null

export const setPassportSupabaseForTests = (
  client: SupabaseClient | null
) => {
  supabaseClient = client
}

export const getPassportSupabase = () => {
  if (!supabaseClient) {
    const config = getSupabaseServiceRoleConfig()
    supabaseClient = createClient(
      config.url,
      config.serviceRoleKey,
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
