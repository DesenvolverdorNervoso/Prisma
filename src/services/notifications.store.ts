
import { useState, useCallback, useEffect } from 'react';
import { profileService } from './profile.service';
import { UserProfile, Notification } from '../domain/types';
import { notificationsService } from './notifications.service';
import { ENV } from '../config/env';

const CACHE_PREFIX = 'notif_cache_';

export const useNotifications = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const isConfigured = ENV.USE_SUPABASE;

  const getCacheKey = useCallback((tenantId: string, userId: string) => 
    `${CACHE_PREFIX}${tenantId}_${userId}`, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const p = await profileService.getCurrentProfile();
        setProfile(p);
      } catch (err) {
        console.warn('Falha ao carregar perfil para notificações');
      }
    };
    loadProfile();
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isConfigured || !profile?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const cacheKey = getCacheKey(profile.tenant_id, profile.id);

    // Load from cache initially
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setNotifications(JSON.parse(cached));
    }

    try {
      const [data, count] = await Promise.all([
        notificationsService.list(),
        notificationsService.unreadCount()
      ]);

      setNotifications(data);
      setUnreadCount(count);
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err: any) {
      // Errors are already logged by the service with anti-spam
    } finally {
      setLoading(false);
    }
  }, [profile, isConfigured, getCacheKey]);

  // Initial load
  useEffect(() => {
    if (profile) {
      fetchNotifications();
    }
  }, [profile, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    if (!isConfigured) return;
    try {
      await notificationsService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // Logged by service
    }
  }, [isConfigured]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!isConfigured) return;
    try {
      await notificationsService.remove(id);
      setNotifications(prev => {
        const removed = prev.find(n => n.id === id);
        if (removed && !removed.read_at) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        return prev.filter(n => n.id !== id);
      });
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }, [isConfigured]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    loading,
    refresh: fetchNotifications,
    isConfigured
  };
};
