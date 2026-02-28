import React, { useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { themeService } from '../services/theme.service';

const { Outlet } = ReactRouterDOM as any;

export const PublicLayout: React.FC = () => {
  useEffect(() => {
    themeService.init();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <main className="min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};
