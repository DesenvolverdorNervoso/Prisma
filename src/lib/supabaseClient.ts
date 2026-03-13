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

// Handle auth state changes and potential refresh errors
if (isBrowser) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      // Clear local storage just in case
      window.localStorage.removeItem('supabase.auth.token');
    }
    
    // If a session is present but we get a refresh error later, 
    // the client usually handles it, but we can be proactive.
  });
}

if (import.meta.env.DEV) {
  console.log("Supabase URL carregada:", supabaseUrl);
}
