
import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
  href?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Novo candidato cadastrado',
    description: 'Um novo candidato acaba de se inscrever pelo link público.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
    isRead: false,
    href: '/candidates'
  },
  {
    id: '2',
    title: 'Vaga sem candidatos',
    description: 'A vaga "Desenvolvedor Frontend" não recebeu inscritos nos últimos 3 dias.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    isRead: false,
    href: '/jobs'
  },
  {
    id: '3',
    title: 'Candidato expirando em 7 dias',
    description: 'O cadastro de João Silva expirará em breve. Considere renovar.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isRead: true,
    href: '/candidates'
  },
  {
    id: '4',
    title: 'Currículo anexado',
    description: 'Maria Oliveira anexou um novo currículo ao seu perfil.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    isRead: false,
    href: '/candidates'
  },
  {
    id: '5',
    title: 'Nova vaga criada',
    description: 'Uma nova oportunidade para "Gerente de Projetos" foi aberta.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    isRead: true,
    href: '/jobs'
  },
  {
    id: '6',
    title: 'Nova empresa cadastrada',
    description: 'Tech Solutions Ltda foi adicionada ao sistema.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    isRead: false,
    href: '/companies'
  }
];

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
};
