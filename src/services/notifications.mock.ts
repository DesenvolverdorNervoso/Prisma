
import { Notification } from './notifications.store';

const STORAGE_PREFIX = 'prisma_notifications';

const getStorageKey = (tenantId: string, userId: string) => `${STORAGE_PREFIX}:${tenantId}:${userId}`;

export const notificationsMock = {
  list: (tenantId: string, userId: string): Notification[] => {
    const key = getStorageKey(tenantId, userId);
    const stored = localStorage.getItem(key);
    if (!stored) {
      // Initial mock data if empty
      const initial: Notification[] = [
        {
          id: 'mock-1',
          tenant_id: tenantId,
          user_id: userId,
          title: 'Bem-vindo ao Prisma RH',
          body: 'Explore as funcionalidades de gestão de candidatos e pedidos.',
          type: 'success',
          read_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 'mock-2',
          tenant_id: tenantId,
          user_id: userId,
          title: 'Dica de Uso',
          body: 'Você pode filtrar candidatos por categoria e status na tela de Candidatos.',
          type: 'info',
          read_at: null,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        }
      ];
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(stored);
  },

  save: (tenantId: string, userId: string, notifications: Notification[]) => {
    const key = getStorageKey(tenantId, userId);
    localStorage.setItem(key, JSON.stringify(notifications));
  },

  markAsRead: (tenantId: string, userId: string, id: string) => {
    const list = notificationsMock.list(tenantId, userId);
    const updated = list.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n);
    notificationsMock.save(tenantId, userId, updated);
    return updated;
  },

  markAllAsRead: (tenantId: string, userId: string) => {
    const list = notificationsMock.list(tenantId, userId);
    const updated = list.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }));
    notificationsMock.save(tenantId, userId, updated);
    return updated;
  },

  dismiss: (tenantId: string, userId: string, id: string) => {
    const list = notificationsMock.list(tenantId, userId);
    const updated = list.filter(n => n.id !== id);
    notificationsMock.save(tenantId, userId, updated);
    return updated;
  },

  dismissAll: (tenantId: string, userId: string) => {
    const key = getStorageKey(tenantId, userId);
    localStorage.setItem(key, JSON.stringify([]));
    return [];
  }
};
