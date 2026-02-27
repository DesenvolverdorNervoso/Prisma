
import { supabase } from '../lib/supabaseClient';
import { queryCache } from '../utils/queryCache';
import { format } from 'date-fns';
import { toAppError } from './appError';

interface DashboardStats {
  totalCandidates: number;
  totalOpenJobOpenings: number;
  monthlyOrdersCount: number;
  monthlyOrdersValue: number;
  pendingOrdersCount: number;
  monthlyRevenue: number;
  ordersValueSeries: { month: string; value: number }[];
  newCandidatesSeries: { date: string; count: number }[];
}

const DASHBOARD_CACHE_KEY = 'dashboard_stats';
const CACHE_TTL = 60000; // 60 seconds

export const dashboardService = {
  getDashboardStats: async (tenantId: string): Promise<DashboardStats> => {
    const fetcher = async (): Promise<DashboardStats> => {
      const today = new Date();
      const startOfMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
      const endOfMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');
      const fourteenDaysAgo = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14), 'yyyy-MM-dd');
      const sixMonthsAgo = format(new Date(today.getFullYear(), today.getMonth() - 5, 1), 'yyyy-MM-dd');

      // Helper to handle individual query results safely
      const handleResult = (result: PromiseSettledResult<any>, fallback: any = null) => {
        if (result.status === 'fulfilled') return result.value;
        console.warn("Dashboard query failed:", result.reason);
        return fallback;
      };

      const [
        candidatesCountRes,
        recentCandidatesRes,
        jobOpeningsRes,
        ordersRes,
        financeRes
      ] = await Promise.allSettled([
        supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('candidates').select('created_at').eq('tenant_id', tenantId).gte('created_at', fourteenDaysAgo),
        supabase.from('job_openings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'Aberta'),
        supabase.from('orders').select('id, value, status, date').eq('tenant_id', tenantId).gte('date', sixMonthsAgo),
        supabase.from('finance_transactions').select('amount, type, created_at').eq('tenant_id', tenantId).gte('created_at', sixMonthsAgo)
      ]);

      const candidatesCount = handleResult(candidatesCountRes, { count: 0 });
      const recentCandidates = handleResult(recentCandidatesRes, { data: [] });
      const jobOpenings = handleResult(jobOpeningsRes, { count: 0 });
      const orders = handleResult(ordersRes, { data: [] });
      const finance = handleResult(financeRes, { data: [] });

      // Check if all queries failed (might indicate a major issue like RLS or connection)
      const allFailed = [candidatesCountRes, recentCandidatesRes, jobOpeningsRes, ordersRes, financeRes]
        .every(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
      
      if (allFailed) {
        // If everything failed, throw the first error found to trigger the UI error state
        const firstError = [candidatesCountRes, recentCandidatesRes, jobOpeningsRes, ordersRes, financeRes]
          .find(r => (r.status === 'rejected') || (r.status === 'fulfilled' && r.value.error));
        
        const errorToThrow = firstError?.status === 'fulfilled' ? firstError.value.error : firstError?.reason;
        throw toAppError(errorToThrow || new Error("Falha total ao carregar dados do dashboard."));
      }

      const totalCandidates = candidatesCount.count ?? 0;
      const safeRecentCandidatesData = recentCandidates.data ?? [];
      const totalOpenJobOpenings = jobOpenings.count ?? 0;
      const safeOrdersData = orders.data ?? [];
      const safeFinanceData = finance.data ?? [];

      let monthlyOrdersCount = 0;
      let monthlyOrdersValue = 0;
      let pendingOrdersCount = 0;
      let monthlyRevenue = 0;

      const ordersValueByMonth: { [key: string]: number } = {};
      const newCandidatesByDay: { [key: string]: number } = {};

      safeOrdersData.forEach((order: any) => {
        if (order.date >= startOfMonth && order.date <= endOfMonth) {
          monthlyOrdersCount++;
          monthlyOrdersValue += order.value;
        }
        if (order.status === 'Em andamento') {
          pendingOrdersCount++;
        }
        const orderMonth = format(new Date(order.date), 'yyyy-MM');
        ordersValueByMonth[orderMonth] = (ordersValueByMonth[orderMonth] || 0) + order.value;
      });

      safeFinanceData.forEach((ft: any) => {
        const ftDate = format(new Date(ft.created_at), 'yyyy-MM-dd');
        if (ft.type === 'entrada' && ftDate >= startOfMonth && ftDate <= endOfMonth) {
          monthlyRevenue += ft.amount;
        }
      });

      safeRecentCandidatesData.forEach((candidate: any) => {
        const candidateDate = format(new Date(candidate.created_at), 'yyyy-MM-dd');
        newCandidatesByDay[candidateDate] = (newCandidatesByDay[candidateDate] || 0) + 1;
      });

      const ordersValueSeries = Array.from({ length: 6 }).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthKey = format(date, 'yyyy-MM');
        return { month: format(date, 'MMM/yy'), value: ordersValueByMonth[monthKey] || 0 };
      });

      const newCandidatesSeries = Array.from({ length: 14 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i));
        date.setHours(0, 0, 0, 0);
        const dateKey = format(date, 'yyyy-MM-dd');
        return { date: format(date, 'dd/MM'), count: newCandidatesByDay[dateKey] || 0 };
      });

      return {
        totalCandidates,
        totalOpenJobOpenings,
        monthlyOrdersCount,
        monthlyOrdersValue,
        pendingOrdersCount,
        monthlyRevenue,
        ordersValueSeries,
        newCandidatesSeries,
      };
    };

    return queryCache.fetch(DASHBOARD_CACHE_KEY, fetcher, CACHE_TTL);
  },

  invalidateCache: () => {
    queryCache.invalidate(DASHBOARD_CACHE_KEY);
  }
};
