
import React, { useState, useEffect } from 'react';
import { LogOut, Sun, Moon, Monitor, ShieldCheck } from 'lucide-react';
import { authService } from '../services/auth.service';
import { themeService, Theme } from '../services/theme.service';
import { Button, cn } from '../ui';
import { DebugModal } from './DebugModal';
import { GlobalSearch } from './GlobalSearch';
import { NotificationMenu } from './NotificationMenu';

export const Topbar: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    themeService.init();
    setCurrentTheme(themeService.getTheme());
  }, []);

  const handleThemeChange = (theme: Theme) => {
    themeService.setTheme(theme);
    setCurrentTheme(theme);
    setShowThemeMenu(false);
  };

  const handleLogout = async () => {
    await authService.signOut();
  };

  const getThemeIcon = () => {
    if (currentTheme === 'dark') return <Moon className="w-5 h-5" />;
    if (currentTheme === 'light') return <Sun className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-primary-200 flex items-center justify-between px-8 fixed top-0 right-0 left-72 z-30 transition-all duration-300 dark:bg-dark-bg/80 dark:border-dark-border">
      <div className="flex items-center gap-6 flex-1">
        <GlobalSearch />
      </div>
      
      <div className="flex items-center gap-5">
        {/* Debug Button */}
        <button 
          onClick={() => setShowDebug(true)}
          className="p-2 text-primary-500 hover:bg-primary-50 rounded-full transition-colors dark:text-dark-muted dark:hover:text-brand-400 dark:hover:bg-slate-800"
          title="Debug Multi-tenant"
        >
          <ShieldCheck className="w-5 h-5" />
        </button>

        {/* Theme Switcher */}
        <div className="relative">
          <button 
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 text-primary-500 hover:bg-primary-50 rounded-full transition-colors dark:text-dark-muted dark:hover:text-dark-text dark:hover:bg-slate-800"
          >
            {getThemeIcon()}
          </button>
          
          {showThemeMenu && (
            <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-xl border border-primary-100 overflow-hidden dark:bg-dark-card dark:border-dark-border dark:shadow-black/20">
              <button onClick={() => handleThemeChange('light')} className={cn("w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-primary-50 dark:text-dark-text dark:hover:bg-slate-800", currentTheme === 'light' && "text-brand-600 font-medium dark:text-brand-400")}>
                <Sun className="w-4 h-4" /> Claro
              </button>
              <button onClick={() => handleThemeChange('dark')} className={cn("w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-primary-50 dark:text-dark-text dark:hover:bg-slate-800", currentTheme === 'dark' && "text-brand-600 font-medium dark:text-brand-400")}>
                <Moon className="w-4 h-4" /> Escuro
              </button>
              <button onClick={() => handleThemeChange('system')} className={cn("w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-primary-50 dark:text-dark-text dark:hover:bg-slate-800", currentTheme === 'system' && "text-brand-600 font-medium dark:text-brand-400")}>
                <Monitor className="w-4 h-4" /> Sistema
              </button>
            </div>
          )}
        </div>

        <NotificationMenu />
        
        <div className="h-8 w-px bg-primary-200 dark:bg-dark-border"></div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary-500 hover:text-error dark:text-dark-muted dark:hover:text-red-400">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      <DebugModal isOpen={showDebug} onClose={() => setShowDebug(false)} />
    </header>
  );
};


