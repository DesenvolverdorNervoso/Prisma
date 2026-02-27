
import { useEffect, useState } from 'react';
import { dashboardService } from '../services/dashboard.service';
import { useToast } from '../components/UI';
import { formatCurrency } from '../utils/format';
import { toAppError } from '../services/appError';
import { 
  Users, 
  Briefcase, 
  ShoppingCart, 
  DollarSign, 
  ListTodo, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { profileService } from '../services/profile.service'; // Import profileService directly
import { cn } from '../ui';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  className?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, change, changeType, className }) => (
  <div className={cn("bg-white dark:bg-dark-card p-6 rounded-xl shadow-medium dark:shadow-dark-medium flex flex-col justify-between", className)}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium text-primary-500 dark:text-dark-muted uppercase tracking-wide">{title}</h3>
      <Icon className="w-5 h-5 text-primary-400 dark:text-dark-border" />
    </div>
    <div className="flex items-end justify-between">
      <p className="text-3xl font-bold text-primary-900 dark:text-dark-text">{value}</p>
      {change && (
        <span className={cn(
          "flex items-center gap-1 text-sm font-medium",
          changeType === 'increase' && 'text-emerald-600',
          changeType === 'decrease' && 'text-red-600',
          changeType === 'neutral' && 'text-primary-500'
        )}>
          {changeType === 'increase' && <ArrowUpRight className="w-4 h-4" />}
          {changeType === 'decrease' && <ArrowDownRight className="w-4 h-4" />}
          {change}
        </span>
      )}
    </div>
  </div>
);

interface BarChartProps {
  data: { month: string; value: number }[];
  title: string;
  maxValue?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, title, maxValue: propMaxValue }) => {
  const maxValue = propMaxValue || Math.max(...data.map(d => d.value)) * 1.2 || 100;

  return (
    <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-medium dark:shadow-dark-medium">
      <h3 className="text-lg font-semibold text-primary-900 dark:text-dark-text mb-4">{title}</h3>
      <div className="flex items-end h-48 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div 
              className="w-full bg-brand-500 rounded-t-md transition-all duration-300 ease-out hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-300"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            />
            <span className="text-xs text-primary-500 dark:text-dark-muted mt-2">{item.month}</span>
            <div className="absolute bottom-full mb-2 p-1 px-2 bg-primary-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap dark:bg-slate-700">
              {formatCurrency(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SparklineProps {
  data: { date: string; count: number }[];
  title: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data, title }) => {
  const maxCount = Math.max(...data.map(d => d.count)) || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.count / maxCount) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-medium dark:shadow-dark-medium">
      <h3 className="text-lg font-semibold text-primary-900 dark:text-dark-text mb-4">{title}</h3>
      <div className="h-24 w-full relative">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <polyline 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="2" 
            points={points}
            className="dark:stroke-brand-400"
          />
          {/* Optional: Add dots for each data point */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (d.count / maxCount) * 100;
            return (
              <circle 
                key={i} 
                cx={x} 
                cy={y} 
                r="2" 
                fill="#3b82f6" 
                className="dark:fill-brand-400"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-primary-500 dark:text-dark-muted mt-2">
        {data.map((d, i) => (
          <span key={i}>{d.date}</span>
        ))}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const loadProfileAndStats = async () => {
      setLoading(true);
      setError(null);
      setProfileLoading(true);
      let currentProfile = null;
      try {
        currentProfile = await profileService.getCurrentProfile();
      } catch (e) {
        console.error("Failed to load profile:", e);
        setError({ message: "Erro ao carregar perfil do usuário." });
        setProfileLoading(false);
        setLoading(false);
        return;
      } finally {
        setProfileLoading(false);
      }

      if (!currentProfile?.tenant_id) {
        setStats(null);
        setLoading(false);
        if (currentProfile) {
          setError({ message: "Tenant não definido. Faça logout/login ou confira seu perfil." });
        } else {
          setError({ message: "Usuário não logado ou perfil não encontrado." });
        }
        return;
      }

      try {
        const data = await dashboardService.getDashboardStats(currentProfile.tenant_id);
        setStats(data);
      } catch (e: any) {
        const appError = toAppError(e);
        console.error("Dashboard error real:", e);
        console.error("Dashboard app error:", appError);
        
        setError({ 
          message: appError.message, 
          code: appError.code, 
          details: appError.details, 
          originalError: e 
        });
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfileAndStats();
  }, [addToast]);

  if (loading || profileLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-medium dark:shadow-dark-medium h-40 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-medium dark:shadow-dark-medium h-80 animate-pulse" />
          <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-medium dark:shadow-dark-medium h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 text-center p-10">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h2>
        <p className="text-primary-500 dark:text-dark-muted">{error?.message || "Não foi possível carregar os dados do dashboard. Verifique sua conexão ou tente novamente mais tarde."}</p>
        {error && import.meta.env.DEV && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm text-left">
            <p className="font-semibold">Detalhes (dev):</p>
            <p><strong>Mensagem:</strong> {String(error.message)}</p>
            {error.code && <p><strong>Código:</strong> {String(error.code)}</p>}
            {error.details && <p><strong>Detalhes:</strong> {typeof error.details === 'object' ? JSON.stringify(error.details) : String(error.details)}</p>}
            {error.originalError && <p><strong>Erro Original:</strong> {JSON.stringify(error.originalError)}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <KpiCard 
          title="Total de Candidatos" 
          value={stats.totalCandidates}
          icon={Users}
          change="+2.5%"
          changeType="increase"
        />
        <KpiCard 
          title="Vagas Abertas" 
          value={stats.totalOpenJobOpenings}
          icon={Briefcase}
          change="-0.5%"
          changeType="decrease"
        />
        <KpiCard 
          title="Pedidos do Mês" 
          value={stats.monthlyOrdersCount}
          icon={ShoppingCart}
          change={formatCurrency(stats.monthlyOrdersValue)}
          changeType="neutral"
        />
        <KpiCard 
          title="Receita do Mês" 
          value={formatCurrency(stats.monthlyRevenue)}
          icon={DollarSign}
          change="+5.1%"
          changeType="increase"
        />
        <KpiCard 
          title="Pedidos Pendentes" 
          value={stats.pendingOrdersCount}
          icon={ListTodo}
          change="-1.2%"
          changeType="decrease"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart 
          title="Valor de Pedidos (Últimos 6 Meses)" 
          data={stats.ordersValueSeries}
        />
        <Sparkline 
          title="Novos Candidatos (Últimos 14 Dias)" 
          data={stats.newCandidatesSeries}
        />
      </div>
    </div>
  );
};
