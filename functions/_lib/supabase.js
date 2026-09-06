import { createClient } from "@supabase/supabase-js";

export function getSupabase(env) {
  const {
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
  } = env;

  if (
    !SUPABASE_URL ||
    !SUPABASE_SECRET_KEY
  ) {
    throw new Error(
      "Supabase configuration is missing."
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}
