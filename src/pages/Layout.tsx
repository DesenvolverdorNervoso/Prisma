
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';

const { Outlet } = ReactRouterDOM as any;

export const Layout: React.FC = () => {
  // Auth check moved to RequireAuth component in router.tsx
  return (
    <div className="min-h-screen bg-primary-50 font-sans dark:bg-dark-bg transition-colors duration-300">
      <Sidebar />
      <Topbar />
      <main className="ml-72 pt-24 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
