
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
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (error.message.includes('Refresh Token Not Found')) {
          await authService.signOut();
          return null;
        }
        throw error;
      }
      return data.session;
    } catch (e) {
      console.error("Error getting session:", e);
      return null;
    }
  },

  requireSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        if (error.message.includes('Refresh Token Not Found')) {
          await authService.signOut();
          throw new Error('Sessão inválida. Faça login novamente.');
        }
        throw error;
      }
      if (!session) {
        await authService.signOut();
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      return session;
    } catch (e) {
      await authService.signOut();
      throw e;
    }
  },

  getValidAccessToken: async (): Promise<string> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // Try to refresh
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          if (refreshError?.message.includes('Refresh Token Not Found')) {
            await authService.signOut();
          }
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        return refreshData.session.access_token;
      }

      // Proactive check: if expires in less than 60s, refresh
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      if (expiresAt - now < 60) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          if (refreshError?.message.includes('Refresh Token Not Found')) {
            await authService.signOut();
          }
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        return refreshData.session.access_token;
      }

      return session.access_token;
    } catch (e) {
      console.error("Error getting valid access token:", e);
      throw e;
    }
  },

  getUser: async (): Promise<UserProfile | null> => {
    return await profileService.getCurrentProfile();
  },

  isAuthenticated: async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && error.message.includes('Refresh Token Not Found')) {
        await authService.signOut();
        return false;
      }
      return !!data.session;
    } catch (e) {
      return false;
    }
  },
  
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

