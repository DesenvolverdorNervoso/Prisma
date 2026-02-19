import React, { useEffect, useState } from 'react';
import { dashboardService } from '../services/dashboard.service';
import { Card, CardContent, Skeleton } from '../components/UI';
import { Users, Briefcase, Clock, Wallet, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Job } from '../domain/types';
import { formatCurrency } from '../utils/format';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    jobsOpen: 0,
    candidatesNew: 0,
    candidatesAnalysis: 0,
    entriesMonth: 0,
    exitsMonth: 0,
    balanceMonth: 0,
    pendingEntries: 0,
    pendingExits: 0
  });

  const [expiringJobs, setExpiringJobs] = useState<Job[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const data = await dashboardService.getStats();
      setStats(data.stats);
      setExpiringJobs(data.expiringJobs);
      setChartData(data.chartData);
      setLoading(false);
    };

    loadData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, colorClass, subtext }: any) => (
    <Card className="hover:shadow-medium transition-shadow duration-300 border-none shadow-soft dark:shadow-dark-soft">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-primary-500 mb-1 dark:text-dark-muted">{title}</p>
            {loading ? <Skeleton className="h-8 w-24 mb-2" /> : <h3 className="text-3xl font-bold text-primary-900 tracking-tight dark:text-dark-text">{value}</h3>}
            {subtext && <p className="text-xs text-primary-400 mt-1 dark:text-slate-500">{subtext}</p>}
          </div>
          <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
            <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary-900 dark:text-dark-text">Visão Geral</h2>
          <p className="text-primary-500 mt-1 dark:text-dark-muted">Acompanhe os principais indicadores do seu negócio.</p>
        </div>
      </div>

      {/* ALERTAS */}
      {expiringJobs.length > 0 && !loading && (
        <div className="bg-warning/10 border-l-4 border-warning rounded-r-lg p-4 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4 dark:bg-amber-900/20">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5 dark:text-amber-500" />
          <div>
            <h3 className="font-semibold text-primary-900 dark:text-amber-100">Atenção: Vagas Externas a Vencer</h3>
            <ul className="mt-1 text-sm text-primary-700 space-y-1 dark:text-amber-200/80">
              {expiringJobs.map(j => {
                const expiry = new Date(j.outside_recruitment_expiry!);
                const days = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <li key={j.id}>
                    Vaga <span className="font-medium">{j.title}</span> vence em {expiry.toLocaleDateString('pt-BR')} ({days <= 0 ? 'Vencido' : `${days} dias`}).
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      
      {/* SECTION: KPI CARDS */}
      <div>
        <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4 dark:text-slate-500">Operacional</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard 
            title="Vagas em Aberto" 
            value={stats.jobsOpen} 
            icon={Briefcase} 
            colorClass="bg-brand-500 text-brand-500" 
            subtext="Processos ativos agora"
          />
          <StatCard 
            title="Novos Candidatos" 
            value={stats.candidatesNew} 
            icon={Users} 
            colorClass="bg-emerald-500 text-emerald-500" 
            subtext="Aguardando triagem"
          />
          <StatCard 
            title="Em Análise" 
            value={stats.candidatesAnalysis} 
            icon={Clock} 
            colorClass="bg-amber-500 text-amber-500" 
            subtext="Processos em andamento"
          />
        </div>
      </div>

      {/* SECTION: FINANCE & CHART */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Finance Stats */}
        <div className="space-y-6">
           <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest dark:text-slate-500">Financeiro (Mês)</h3>
           <Card className="bg-gradient-to-br from-primary-900 to-primary-800 text-white border-none shadow-medium dark:from-slate-900 dark:to-slate-800 dark:shadow-dark-medium">
             <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4 opacity-80">
                  <Wallet className="w-5 h-5" />
                  <span className="text-sm font-medium">Saldo Líquido</span>
                </div>
                {loading ? <Skeleton className="h-10 w-32 bg-primary-700" /> : <div className="text-4xl font-bold">{formatCurrency(stats.balanceMonth)}</div>}
                <div className="mt-6 flex justify-between text-sm">
                   <div>
                      <p className="text-primary-300 mb-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-emerald-400"/> Entradas</p>
                      <p className="font-semibold">{formatCurrency(stats.entriesMonth)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-primary-300 mb-1 flex items-center gap-1 justify-end"><ArrowDownRight className="w-3 h-3 text-red-400"/> Saídas</p>
                      <p className="font-semibold">{formatCurrency(stats.exitsMonth)}</p>
                   </div>
                </div>
             </CardContent>
           </Card>

           <div className="grid grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-brand-500">
                <CardContent className="p-4">
                  <p className="text-xs text-primary-500 font-medium dark:text-dark-muted">A Receber</p>
                  <p className="text-lg font-bold text-primary-900 mt-1 dark:text-dark-text">{formatCurrency(stats.pendingEntries)}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-warning">
                <CardContent className="p-4">
                  <p className="text-xs text-primary-500 font-medium dark:text-dark-muted">A Pagar</p>
                  <p className="text-lg font-bold text-primary-900 mt-1 dark:text-dark-text">{formatCurrency(stats.pendingExits)}</p>
                </CardContent>
              </Card>
           </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4 dark:text-slate-500">Fluxo de Caixa</h3>
          <Card className="h-[300px]">
            <CardContent className="p-6 h-full">
              {loading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, #fff)'}}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="Entradas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};