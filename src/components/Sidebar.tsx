import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { 
  LayoutDashboard, Users, Building2, UserCircle, Briefcase, 
  Files, ShoppingCart, DollarSign, Settings, User
} from 'lucide-react';
import { cn } from './UI';
import { authService } from '../services/auth.service';

const { NavLink } = ReactRouterDOM as any;

export const Sidebar: React.FC = () => {
  const user = authService.getUser();
  
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/candidates', label: 'Candidatos', icon: Users },
    { to: '/jobs', label: 'Vagas', icon: Briefcase },
    { to: '/companies', label: 'Empresas', icon: Building2 },
    { to: '/person-clients', label: 'Clientes PF', icon: UserCircle },
    { to: '/services', label: 'Serviços', icon: Files },
    { to: '/orders', label: 'Pedidos', icon: ShoppingCart },
    { to: '/finance', label: 'Financeiro', icon: DollarSign },
    { to: '/settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-primary-900 text-white flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-primary-800 shadow-xl dark:bg-dark-sidebar dark:border-dark-border">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
            <span className="font-bold text-white text-lg">P</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Prisma RH</h1>
            <p className="text-[10px] text-primary-400 font-medium uppercase tracking-wider dark:text-slate-500">Workspace</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-primary-500 uppercase tracking-widest mb-3 dark:text-slate-500">Menu Principal</p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }: any) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
              isActive 
                ? "bg-brand-600 text-white shadow-lg shadow-brand-900/20 dark:bg-brand-600" 
                : "text-primary-300 hover:bg-primary-800 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            )}
          >
            <link.icon className={cn("w-5 h-5 transition-colors", ({ isActive }: any) => isActive ? "text-white" : "text-primary-400 group-hover:text-white dark:text-slate-500 dark:group-hover:text-white")} />
            <span className="relative z-10">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-primary-800 bg-primary-950/30 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary-800 transition-colors cursor-pointer dark:hover:bg-slate-800">
          <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center border-2 border-primary-600 dark:bg-slate-800 dark:border-slate-700">
            <User className="w-5 h-5 text-primary-300 dark:text-slate-400" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate dark:text-slate-200">{user.name}</p>
            <p className="text-xs text-primary-400 truncate dark:text-slate-500">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};