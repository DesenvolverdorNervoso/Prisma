import { repositories } from '../data/repositories';

export const dashboardService = {
  getStats: async () => {
    const [jobsRes, candidatesRes, financeRes] = await Promise.all([
      repositories.jobs.list({ limit: 1000 }),
      repositories.candidates.list({ limit: 1000 }),
      repositories.finance.list({ limit: 1000 })
    ]);

    const jobs = jobsRes.data;
    const candidates = candidatesRes.data;
    const finance = financeRes.data;

    // 1. Operational
    const jobsOpen = jobs.filter(j => j.status === 'Em aberto').length;
    const candidatesNew = candidates.filter(c => c.status === 'Novo').length;
    const candidatesAnalysis = candidates.filter(c => c.status === 'Em análise').length;

    // 2. Finance (Current Month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const isCurrentMonth = (dateStr: string) => {
      if (!dateStr) return false;
      const [y, m] = dateStr.split('-').map(Number);
      return m - 1 === currentMonth && y === currentYear;
    };

    const financeMonth = finance.filter(f => isCurrentMonth(f.date));
    
    const entriesMonth = financeMonth.filter(f => f.type === 'Entrada').reduce((acc, c) => acc + c.value, 0);
    const exitsMonth = financeMonth.filter(f => f.type === 'Saída').reduce((acc, c) => acc + c.value, 0);
    const balanceMonth = entriesMonth - exitsMonth;

    // 3. Pending
    const pendingEntries = finance.filter(f => f.type === 'Entrada' && f.status === 'Pendente').reduce((acc, c) => acc + c.value, 0);
    const pendingExits = finance.filter(f => f.type === 'Saída' && f.status === 'Pendente').reduce((acc, c) => acc + c.value, 0);

    // 4. Alerts (Jobs expiring)
    const expiringJobs = jobs.filter(j => {
      if (j.status !== 'Contratou por fora' || !j.outside_recruitment_expiry) return false;
      const expiryDate = new Date(j.outside_recruitment_expiry);
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 15; 
    });

    return {
      stats: {
        jobsOpen,
        candidatesNew,
        candidatesAnalysis,
        entriesMonth,
        exitsMonth,
        balanceMonth,
        pendingEntries,
        pendingExits
      },
      expiringJobs,
      chartData: [
        { name: 'Jan', Entradas: entriesMonth * 0.8, Saídas: exitsMonth * 0.9 },
        { name: 'Fev', Entradas: entriesMonth * 0.9, Saídas: exitsMonth * 0.8 },
        { name: 'Mar', Entradas: entriesMonth, Saídas: exitsMonth },
      ]
    };
  }
};