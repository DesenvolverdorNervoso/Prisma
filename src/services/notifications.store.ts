
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { profileService } from './profile.service';
import { UserProfile } from '../domain/types';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: 'info' | 'success' | 'warning' | 'error';
  read_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
  href?: string;
}

export const useNotifications = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const p = await profileService.getCurrentProfile();
      setProfile(p);
    };
    loadProfile();
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id || !profile?.tenant_id) {
      if (!loading) setNotifications([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } else {
      setNotifications(data as Notification[]);
    }
    setLoading(false);
  }, [profile, loading]);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [profile, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const markAsRead = useCallback(async (id: string) => {
    if (!profile?.id || !profile?.tenant_id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', profile.id)
      .eq('tenant_id', profile.tenant_id);

    if (!error) {
      // Optimistic update or re-fetch
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    }
  }, [profile]);

  const markAllAsRead = useCallback(async () => {
    if (!profile?.id || !profile?.tenant_id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .eq('tenant_id', profile.tenant_id)
      .is('read_at', null);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    }
  }, [profile]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading
  };
};