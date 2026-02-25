import React, { useEffect, useState } from 'react';
import { dashboardService, DashboardSummary, DailyOrders, OrdersByStatus, ServicesByRevenue } from '../services/dashboard.service';
import { Card, CardContent, Skeleton } from '../components/UI';
import { Clock, ShoppingCart, DollarSign, TrendingUp, Users2, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency } from '../utils/format';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [ordersLast30Days, setOrdersLast30Days] = useState<DailyOrders[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([]);
  const [servicesByRevenue, setServicesByRevenue] = useState<ServicesByRevenue[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await dashboardService.getStats();
        setSummary(data.summary);
        setOrdersLast30Days(data.ordersLast30Days);
        setOrdersByStatus(data.ordersByStatus);
        setServicesByRevenue(data.servicesByRevenue);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
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


      {/* SECTION: SUMMARY CARDS */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 dark:text-slate-500">Resumo do Mês</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard 
            title="Pedidos do Mês" 
            value={summary?.ordersMonth ?? 0} 
            icon={ShoppingCart} 
            colorClass="bg-blue-500 text-blue-500" 
          />
          <StatCard 
            title="Faturamento do Mês" 
            value={formatCurrency(summary?.revenueMonth ?? 0)} 
            icon={DollarSign} 
            colorClass="bg-emerald-500 text-emerald-500" 
          />
          <StatCard 
            title="Em Andamento" 
            value={summary?.ordersInProgress ?? 0} 
            icon={Clock} 
            colorClass="bg-amber-500 text-amber-500" 
          />
          <StatCard 
            title="Concluídos" 
            value={summary?.ordersCompleted ?? 0} 
            icon={CheckCircle} 
            colorClass="bg-green-500 text-green-500" 
          />
          <StatCard 
            title="A Receber" 
            value={formatCurrency(summary?.revenuePending ?? 0)} 
            icon={TrendingUp} 
            colorClass="bg-purple-500 text-purple-500" 
          />
          <StatCard 
            title="Total Clientes Ativos" 
            value={summary?.activeClients ?? 0} 
            icon={Users2} 
            colorClass="bg-pink-500 text-pink-500" 
          />
        </div>
      </div>

      {/* SECTION: CHARTS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pedidos Últimos 30 Dias - Line Chart */}
        <Card className="h-[350px] border-none shadow-xl dark:shadow-dark-medium">
          <CardContent className="p-6 h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 dark:text-slate-500">Pedidos Últimos 30 Dias</h3>
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersLast30Days} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, #fff)' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    formatter={(value: number, _: string) => [`${value} pedidos`, '']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Status - Pie Chart */}
        <Card className="h-[350px] border-none shadow-xl dark:shadow-dark-medium">
          <CardContent className="p-6 h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 dark:text-slate-500">Distribuição por Status</h3>
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {ordersByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#22c55e', '#ef4444', '#64748b'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, #fff)' }}
                    formatter={(value: number, _: string, props: any) => [`${value} pedidos`, props.payload.status]}
                  />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle" 
                    wrapperStyle={{ right: -10, top: '50%', transform: 'translateY(-50%)', lineHeight: '24px' }}
                    formatter={(_: string, entry: any) => <span className="text-sm text-slate-700 dark:text-slate-300">{entry.value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Serviços por Faturamento - Bar Chart */}
        <Card className="h-[350px] lg:col-span-2 border-none shadow-xl dark:shadow-dark-medium">
          <CardContent className="p-6 h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 dark:text-slate-500">Top 5 Serviços por Faturamento</h3>
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={servicesByRevenue} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                  <XAxis 
                    type="number" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis 
                    dataKey="serviceName" 
                    type="category" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, #fff)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};