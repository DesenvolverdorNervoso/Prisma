import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "../config/env";

// Safe storage detection for browser/mobile environments
const isBrowser = typeof window !== "undefined";
const storage = isBrowser ? window.localStorage : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Para apps com HashRouter (#/...), isso evita parsing indevido no hash
    detectSessionInUrl: false,
    storage,
    // NÃO usar storageKey custom, senão quebra a sessão em pontos diferentes do app
  },
});

if (import.meta.env.DEV) {
  console.log("Supabase URL carregada:", supabaseUrl);
}