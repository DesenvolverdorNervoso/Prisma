
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, ExternalLink, X, Loader2, Trash2 } from 'lucide-react';
import { useNotifications, Notification } from '../services/notifications.store';
import { cn, useToast } from '../ui';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotificationMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications, 
    loading,
    hasMore,
    loadMore,
    refresh
  } = useNotifications();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) markAsRead(notification.id);
    setIsOpen(false);
    if (notification.href) {
      navigate(notification.href);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await deleteNotification(id) || {};
    if (!error) {
      addToast('success', 'Notificação removida');
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await markAsRead(id);
  };

  const handleClearAll = async () => {
    if (confirm('Deseja limpar todas as notificações?')) {
      const { error } = await clearAllNotifications() || {};
      if (!error) {
        addToast('success', 'Notificações limpas');
      }
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 text-primary-500 hover:bg-primary-50 rounded-full transition-colors dark:text-dark-muted dark:hover:text-dark-text dark:hover:bg-slate-800",
          isOpen && "bg-primary-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-error text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-dark-bg flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-primary-100 overflow-hidden z-50 dark:bg-dark-card dark:border-dark-border animate-in fade-in zoom-in-95 duration-200">
          <div className="px-5 py-4 border-b border-primary-100 flex items-center justify-between dark:border-dark-border">
            <h3 className="font-bold text-primary-900 dark:text-dark-text">Notificações</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <button 
                    onClick={handleClearAll}
                    className="text-xs font-medium text-error hover:text-red-700 dark:text-red-400 flex items-center gap-1"
                    title="Limpar todas"
                  >
                    Limpar
                  </button>
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Lidas
                  </button>
                </>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-primary-100 rounded-full dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-primary-400" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length > 0 ? (
              <div className="divide-y divide-primary-50 dark:divide-dark-border/50">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full px-5 py-4 text-left hover:bg-primary-50/50 transition-colors flex gap-4 dark:hover:bg-slate-800/50 cursor-pointer",
                      !notification.read_at && "bg-brand-50/30 dark:bg-brand-900/10"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      !notification.read_at ? "bg-brand-500" : "bg-transparent"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className={cn(
                          "text-sm font-semibold text-primary-900 truncate dark:text-dark-text",
                          !notification.read_at && "text-brand-900 dark:text-brand-400"
                        )}>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1">
                          {!notification.read_at && (
                            <button 
                              onClick={(e) => handleMarkAsRead(e, notification.id)}
                              className="p-1 text-primary-300 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors dark:text-dark-muted dark:hover:bg-brand-900/20"
                              title="Marcar como lida"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="p-1 text-primary-300 hover:text-error hover:bg-red-50 rounded transition-colors dark:text-dark-muted dark:hover:bg-red-900/20"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-primary-600 line-clamp-2 dark:text-dark-muted">
                        {notification.body}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-primary-400 flex items-center gap-1 whitespace-nowrap dark:text-dark-muted">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                        {notification.href && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-brand-600 uppercase tracking-wider dark:text-brand-400">
                            Ver detalhes <ExternalLink className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {hasMore && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); loadMore(); }}
                    disabled={loading}
                    className="w-full py-3 text-xs font-semibold text-primary-500 hover:text-brand-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 dark:text-dark-muted dark:hover:text-brand-400 dark:hover:bg-slate-800"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Carregar mais
                  </button>
                )}
              </div>
            ) : loading ? (
              <div className="p-10 text-center">
                <Loader2 className="w-10 h-10 text-primary-200 mx-auto mb-3 animate-spin dark:text-dark-border" />
                <p className="text-sm text-primary-500 dark:text-dark-muted">Carregando notificações...</p>
              </div>
            ) : (
              <div className="p-10 text-center">
                <Bell className="w-10 h-10 text-primary-200 mx-auto mb-3 dark:text-dark-border" />
                <p className="text-sm text-primary-500 dark:text-dark-muted">Nenhuma notificação por aqui.</p>
              </div>
            )}
          </div>

          <div className="px-5 py-3 bg-primary-50/50 border-t border-primary-100 text-center dark:bg-slate-900/30 dark:border-dark-border">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="text-xs font-semibold text-primary-600 hover:text-primary-900 dark:text-dark-muted dark:hover:text-dark-text"
            >
              Configurações de Notificações
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
