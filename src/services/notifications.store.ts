
import { useState, useCallback, useEffect } from 'react';
import { profileService } from './profile.service';
import { UserProfile } from '../domain/types';
import { notificationsMock } from './notifications.mock';

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
      setLoading(false);
      return;
    }

    setLoading(true);
    // Use Mock instead of Supabase
    try {
      const data = notificationsMock.list(profile.tenant_id, profile.id);
      setNotifications(data);
    } catch (err) {
      // Zero log as requested, or minimal
      setNotifications([]);
    }
    setLoading(false);
  }, [profile, loading]);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
    } else {
      // If no profile yet, don't stay in loading forever if it's already checked
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [profile, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const markAsRead = useCallback(async (id: string) => {
    if (!profile?.id || !profile?.tenant_id) return;
    const updated = notificationsMock.markAsRead(profile.tenant_id, profile.id, id);
    setNotifications(updated);
  }, [profile]);

  const markAllAsRead = useCallback(async () => {
    if (!profile?.id || !profile?.tenant_id) return;
    const updated = notificationsMock.markAllAsRead(profile.tenant_id, profile.id);
    setNotifications(updated);
  }, [profile]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!profile?.id || !profile?.tenant_id) return;
    const updated = notificationsMock.dismiss(profile.tenant_id, profile.id, id);
    setNotifications(updated);
    return { error: null };
  }, [profile]);

  const clearAllNotifications = useCallback(async () => {
    if (!profile?.id || !profile?.tenant_id) return;
    const updated = notificationsMock.dismissAll(profile.tenant_id, profile.id);
    setNotifications(updated);
    return { error: null };
  }, [profile]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    loading
  };
};
