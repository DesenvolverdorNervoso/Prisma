import { supabase } from '../lib/supabaseClient';
import { tenantService } from './tenant.service';
import { toAppError } from './appError';
import { profileService } from './profile.service';
import { UserProfile } from '../domain/types';

export const authService = {
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      // Clear tenant cache to ensure fresh data on next request
      tenantService.clearCache();
      
      return { data, error: null };
    } catch (e) {
      return { error: toAppError(e) };
    }
  },

  signOut: async () => {
    tenantService.clearCache();
    await supabase.auth.signOut();
    window.location.href = '/#/login';
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (error) throw error;
      return { error: null };
    } catch (e) {
      return { error: toAppError(e) };
    }
  },

  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  getValidAccessToken: async (): Promise<string | null> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      // Try to refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) return null;
      return refreshData.session.access_token;
    }

    // Check if expired (with a 30s buffer)
    const expiresAt = session.expires_at || 0;
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt - now < 30) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) return null;
      return refreshData.session.access_token;
    }

    return session.access_token;
  },

  getUser: async (): Promise<UserProfile | null> => {
    return await profileService.getCurrentProfile();
  },

  isAuthenticated: async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },
  
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};