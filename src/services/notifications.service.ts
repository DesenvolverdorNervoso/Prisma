
import { supabase } from '../lib/supabaseClient';
import { Notification } from './notifications.store';

export const notificationsService = {
  list: async (userId: string, tenantId: string, options: { limit?: number; cursor?: string } = {}) => {
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
  },

  markAsRead: async (id: string, userId: string, tenantId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },

  markAllAsRead: async (userId: string, tenantId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .is('read_at', null);
    if (error) throw error;
  },

  remove: async (id: string, userId: string, tenantId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },

  removeAll: async (userId: string, tenantId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  }
};
