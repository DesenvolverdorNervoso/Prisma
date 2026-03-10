import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "../config/env";

const isBrowser = typeof window !== "undefined";
const storage = isBrowser ? window.localStorage : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage,
    lock: ((_name: string, _acquireTimeout: number, acquire: () => Promise<any>) => acquire()) as any
  },
});

if (import.meta.env.DEV) {
  console.log("Supabase URL carregada:", supabaseUrl);
}
