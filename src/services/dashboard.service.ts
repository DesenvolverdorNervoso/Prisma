import { ordersService } from '../services/orders.service';
import { FinanceTransaction } from '../domain/types';
import { repositories } from '../data/repositories';
import { formatISO, subDays } from 'date-fns';

export interface DashboardSummary {
  ordersMonth: number;
  revenueMonth: number;
  ordersInProgress: number;
  ordersCompleted: number;
  revenuePending: number;
  activeClients: number;
}

export interface DailyOrders {
  date: string;
  count: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface ServicesByRevenue {
  serviceName: string;
  revenue: number;
}

export const dashboardService = {
  getStats: async (): Promise<{
    summary: DashboardSummary;
    ordersLast30Days: DailyOrders[];
    ordersByStatus: OrdersByStatus[];
    servicesByRevenue: ServicesByRevenue[];
  }> => {
    const [allOrders, financeRes] = await Promise.all([
      ordersService.listEnriched(),
      repositories.finance.list({ limit: 1000 }),
    ]);

    const allFinance: FinanceTransaction[] = financeRes.data;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = subDays(now, 30);

    // Orders of the month
    const ordersMonth = allOrders.filter(o => new Date(o.date) >= startOfMonth).length;

    // Revenue of the month (only 'Entrada' and 'Pago')
    const revenueMonth = allFinance
      .filter((f: FinanceTransaction) => f.type === 'Entrada' && f.status === 'Pago' && new Date(f.date) >= startOfMonth)
      .reduce((sum: number, f: FinanceTransaction) => sum + f.value, 0);

    // Orders in progress
    const ordersInProgress = allOrders.filter(o => o.status === 'Em andamento').length;

    // Orders completed
    const ordersCompleted = allOrders.filter(o => o.status === 'Concluído').length;

    // Revenue pending (only 'Entrada' and 'Pendente')
    const revenuePending = allFinance
      .filter((f: FinanceTransaction) => f.type === 'Entrada' && f.status === 'Pendente')
      .reduce((sum: number, f: FinanceTransaction) => sum + f.value, 0);

    // Active clients (unique person_client_id or company_id from all orders)
    const uniqueClientIds = new Set<string>();
    allOrders.forEach(o => {
      if (o.person_client_id) uniqueClientIds.add(o.person_client_id);
      if (o.company_id) uniqueClientIds.add(o.company_id);
    });
    const activeClients = uniqueClientIds.size;

    const summary: DashboardSummary = {
      ordersMonth,
      revenueMonth,
      ordersInProgress,
      ordersCompleted,
      revenuePending,
      activeClients,
    };

    // Orders last 30 days (for line chart)
    const ordersLast30DaysMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const date = subDays(now, 29 - i);
      ordersLast30DaysMap.set(formatISO(date, { representation: 'date' }), 0);
    }

    allOrders.forEach(o => {
      const orderDate = new Date(o.date);
      if (orderDate >= thirtyDaysAgo && orderDate <= now) {
        const formattedDate = formatISO(orderDate, { representation: 'date' });
        ordersLast30DaysMap.set(formattedDate, (ordersLast30DaysMap.get(formattedDate) || 0) + 1);
      }
    });
    const ordersLast30Days: DailyOrders[] = Array.from(ordersLast30DaysMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Orders by status (for pie/bar chart)
    const ordersByStatusMap = new Map<string, number>();
    allOrders.forEach(o => {
      ordersByStatusMap.set(o.status, (ordersByStatusMap.get(o.status) || 0) + 1);
    });
    const ordersByStatus: OrdersByStatus[] = Array.from(ordersByStatusMap.entries())
      .map(([status, count]) => ({ status, count }));

    // Top 5 services by revenue (for horizontal bar chart)
    const servicesRevenueMap = new Map<string, number>();
    allOrders.filter(o => o.status === 'Concluído').forEach(o => {
      if (o.service_name && o.value) {
        servicesRevenueMap.set(o.service_name, (servicesRevenueMap.get(o.service_name) || 0) + o.value);
      }
    });
    const servicesByRevenue: ServicesByRevenue[] = Array.from(servicesRevenueMap.entries())
      .map(([serviceName, revenue]) => ({ serviceName, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      summary,
      ordersLast30Days,
      ordersByStatus,
      servicesByRevenue,
    };
  },
};