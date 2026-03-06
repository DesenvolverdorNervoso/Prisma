
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "../config/env";

// Safe storage detection for browser/mobile environments
const isBrowser = typeof window !== 'undefined';
const storage = isBrowser ? window.localStorage : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: storage,
  },
});

// Conditional logging for development only
if (import.meta.env.DEV) {
  console.log("Supabase URL carregada:", supabaseUrl);
}
