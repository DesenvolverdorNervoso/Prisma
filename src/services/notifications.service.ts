
import { supabase } from '../lib/supabaseClient';
import { Notification } from './notifications.store';
import { queryCache } from '../utils/queryCache';

const NOTIFICATIONS_CACHE_KEY_PREFIX = 'notifications_list_';
const CACHE_TTL = 60000; // 60 seconds

export const notificationsService = {
  list: async (userId: string, tenantId: string, options: { limit?: number; cursor?: string } = {}) => {
    const cacheKey = `${NOTIFICATIONS_CACHE_KEY_PREFIX}${tenantId}_${userId}_${options.limit || 'all'}_${options.cursor || 'no_cursor'}`;

    const fetcher = async (): Promise<Notification[]> => {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.cursor) {
        query = query.lt('created_at', options.cursor);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    };

    return queryCache.fetch(cacheKey, fetcher, CACHE_TTL);
  },

  markAsRead: async (id: string, userId: string, tenantId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);
    if (error) throw error;
    queryCache.invalidate(`${NOTIFICATIONS_CACHE_KEY_PREFIX}${tenantId}_${userId}_all_no_cursor`); // Invalidate main list cache
  },

  markAllAsRead: async (userId: string, tenantId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .is('read_at', null);
    if (error) throw error;
    queryCache.invalidate(`${NOTIFICATIONS_CACHE_KEY_PREFIX}${tenantId}_${userId}_all_no_cursor`); // Invalidate main list cache
  },

  remove: async (id: string, userId: string, tenantId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);
    if (error) throw error;
    queryCache.invalidate(`${NOTIFICATIONS_CACHE_KEY_PREFIX}${tenantId}_${userId}_all_no_cursor`); // Invalidate main list cache
  },

  removeAll: async (userId: string, tenantId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);
    if (error) throw error;
    queryCache.invalidate(`${NOTIFICATIONS_CACHE_KEY_PREFIX}${tenantId}_${userId}_all_no_cursor`); // Invalidate main list cache
  },

  invalidateCache: (tenantId: string, userId: string) => {
    // Invalidate all caches related to this user/tenant
    queryCache.invalidate(`${NOTIFICATIONS_CACHE_KEY_PREFIX}${tenantId}_${userId}_all_no_cursor`);
    // More specific invalidations can be added if needed for different limit/cursor combinations
  }
};
