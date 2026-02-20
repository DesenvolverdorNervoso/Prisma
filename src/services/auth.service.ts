
import { supabase } from '../lib/supabaseClient';
import { UserProfile } from '../domain/types';
import { profileService } from './profile.service';
import { tenantService } from './tenant.service';
import { debugInfo } from '../config/env';

// Cache for current user profile to avoid redundant fetches
let cachedProfile: UserProfile | null = null;

export const authService = {
  
  signIn: async (email: string, password: string) => {
    if (!debugInfo.hasUrl || !debugInfo.hasAnonKey) {
      return { error: { message: 'Supabase não configurado. Verifique as variáveis de ambiente.' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.user && !error) {
      try {
        // Ensure profile exists on login
        cachedProfile = await profileService.getOrCreateProfile(data.user);
        tenantService.clearCache(); // Ensure fresh tenant cache
      } catch (e) {
        console.error("Erro ao carregar perfil:", e);
        // Logout if profile fails to load to prevent inconsistent state
        await supabase.auth.signOut();
        return { error: { message: 'Erro ao carregar perfil do usuário.' } };
      }
    }

    return { data, error };
  },

  signOut: async () => {
    cachedProfile = null;
    tenantService.clearCache();
    await supabase.auth.signOut();
    window.location.href = '/#/login';
  },

  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  getUser: async (): Promise<UserProfile | null> => {
    if (cachedProfile) return cachedProfile;
    
    // If not cached, try to fetch
    const profile = await profileService.getCurrentProfile();
    if (profile) {
      cachedProfile = profile;
    }
    return profile;
  },

  isAuthenticated: async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },
  
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

