
import { useState, useCallback, useEffect, useRef } from 'react';
import { profileService } from './profile.service';
import { UserProfile } from '../domain/types';
import { notificationsService } from './notifications.service';

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

const CACHE_PREFIX = 'notif_cache_';

export const useNotifications = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCacheKey = useCallback((tenantId: string, userId: string) => 
    `${CACHE_PREFIX}${tenantId}_${userId}`, []);

  useEffect(() => {
    const loadProfile = async () => {
      const p = await profileService.getCurrentProfile();
      setProfile(p);
    };
    loadProfile();
  }, []);

  const fetchNotifications = useCallback(async (isLoadMore = false) => {
    if (!profile?.id || !profile?.tenant_id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    const cacheKey = getCacheKey(profile.tenant_id, profile.id);

    // Load from cache if not loading more
    if (!isLoadMore) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setNotifications(JSON.parse(cached));
      }
    }

    try {
      const cursor = isLoadMore && notifications.length > 0 
        ? notifications[notifications.length - 1].created_at 
        : undefined;

      const data = await notificationsService.list(profile.id, profile.tenant_id, { 
        limit: 15, 
        cursor 
      });

      if (isLoadMore) {
        setNotifications(prev => [...prev, ...data]);
      } else {
        setNotifications(data);
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      }

      setHasMore(data.length === 15);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      // Minimal log
      console.warn('Falha ao atualizar notificações:', err.message);
      
      // If we have cache, we keep it. If not, empty.
    } finally {
      setLoading(false);
    }
  }, [profile, notifications, getCacheKey]);

  // Initial load
  useEffect(() => {
    if (profile) {
      fetchNotifications();
    }
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [profile]); // Only on profile change

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const markAsRead = useCallback(async (id: string) => {
    if (!profile?.id || !profile?.tenant_id) return;
    try {
      await notificationsService.markAsRead(id, profile.id, profile.tenant_id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch (err) {
      console.warn('Erro ao marcar como lida:', err);
    }
  }, [profile]);

  const markAllAsRead = useCallback(async () => {
    if (!profile?.id || !profile?.tenant_id) return;
    try {
      await notificationsService.markAllAsRead(profile.id, profile.tenant_id);
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch (err) {
      console.warn('Erro ao marcar todas como lidas:', err);
    }
  }, [profile]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!profile?.id || !profile?.tenant_id) return;
    try {
      await notificationsService.remove(id, profile.id, profile.tenant_id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      return { error: null };
    } catch (err: any) {
      console.warn('Erro ao excluir notificação:', err);
      return { error: err };
    }
  }, [profile]);

  const clearAllNotifications = useCallback(async () => {
    if (!profile?.id || !profile?.tenant_id) return;
    try {
      await notificationsService.removeAll(profile.id, profile.tenant_id);
      setNotifications([]);
      return { error: null };
    } catch (err: any) {
      console.warn('Erro ao limpar notificações:', err);
      return { error: err };
    }
  }, [profile]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    loading,
    hasMore,
    loadMore: () => fetchNotifications(true),
    refresh: () => fetchNotifications(false)
  };
};
