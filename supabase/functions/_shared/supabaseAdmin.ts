import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Admin Supabase client that uses the service-role key.
 * Bypasses all Row Level Security policies.
 * Use only in Edge Functions — never expose the service-role key to the client.
 */
export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
