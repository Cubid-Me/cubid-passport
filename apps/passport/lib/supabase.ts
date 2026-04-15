import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL

const clientSupabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const serverSupabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? clientSupabaseKey

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL")
}

const supabaseKey =
  typeof window === "undefined" ? serverSupabaseKey : clientSupabaseKey

if (!supabaseKey) {
  throw new Error(
    "Missing Supabase key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY"
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
