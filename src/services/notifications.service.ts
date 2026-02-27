
import { supabase } from '../lib/supabaseClient';
import { Notification } from '../domain/types';

let lastErrorTime = 0;
const logError = (msg: string, err: any) => {
  const now = Date.now();
  if (now - lastErrorTime > 60000) { // 1 minute
    console.error(msg, err);
    lastErrorTime = now;
  }
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 2, delays = [300, 900]): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    const isNetworkError = err instanceof TypeError || err.message?.includes('Failed to fetch');
    if (retries > 0 && isNetworkError) {
      await new Promise(resolve => setTimeout(resolve, delays[delays.length - retries]));
      return withRetry(fn, retries - 1, delays);
    }
    throw err;
  }
};

export const notificationsService = {
  list: async (): Promise<Notification[]> => {
    try {
      return await withRetry(async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, body, type, read_at, created_at, href')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        return data as Notification[];
      });
    } catch (err) {
      logError('Error fetching notifications:', err);
      throw err;
    }
  },

  unreadCount: async (): Promise<number> => {
    try {
      return await withRetry(async () => {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .is('read_at', null);
        
        if (error) throw error;
        return count || 0;
      });
    } catch (err) {
      logError('Error fetching unread count:', err);
      throw err;
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      logError('Error marking notification as read:', err);
      throw err;
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      logError('Error removing notification:', err);
      throw err;
    }
  }
};
