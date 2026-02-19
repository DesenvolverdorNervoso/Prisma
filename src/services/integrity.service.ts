import { repositories } from '../data/repositories';
import { Candidate } from '../domain/types';

export const integrityService = {
  /**
   * Verifica se a empresa pode ser excluída.
   * Regra: Bloquear se houver vagas ativas.
   */
  checkCompanyDeletion: async (companyId: string) => {
    const res = await repositories.jobs.list({ limit: 1000 });
    const jobs = res.data;
    const activeJobs = jobs.filter(j => 
      j.company_id === companyId && 
      j.status !== 'Encerrada' && 
      j.status !== 'Cancelada'
    );

    if (activeJobs.length > 0) {
      throw new Error("Não é possível excluir: A empresa possui vagas ativas.");
    }
  },

  /**
   * Verifica se o candidato pode ser excluído.
   * Regra: Bloquear se estiver vinculado a vaga ativa.
   */
  checkCandidateDeletion: async (candidate: Candidate) => {
    const activeStatuses = ['Em análise', 'Encaminhado'];
    if (activeStatuses.includes(candidate.status)) {
      throw new Error(`Não é possível excluir: O candidato está em processo ativo (${candidate.status}).`);
    }
  },

  /**
   * Verifica se o pedido pode ser excluído.
   */
  checkOrderDeletion: async (orderId: string) => {
    const res = await repositories.finance.list({ limit: 10000 });
    const finance = res.data;
    const idPart = orderId.slice(0, 4);
    const linkedTransaction = finance.find(f => 
      f.description && f.description.includes(`Pedido #${idPart}`)
    );

    if (linkedTransaction) {
      throw new Error("Não é possível excluir: Existe uma movimentação financeira associada.");
    }
  },

  /**
   * SETTINGS INTEGRITY CHECKS
   */

  checkCandidateCategoryDeletion: async (categoryName: string) => {
    // Check if any candidate uses this category
    const res = await repositories.candidates.list({ 
      limit: 1, 
      filters: { category: categoryName } 
    });
    
    if (res.total > 0) {
      throw new Error(`Não é possível excluir: Existem ${res.total} candidatos nesta categoria.`);
    }
  },

  checkServiceDeletion: async (serviceId: string) => {
    const res = await repositories.orders.list({ 
      limit: 1, 
      filters: { service_id: serviceId } 
    });

    if (res.total > 0) {
      throw new Error(`Não é possível excluir: Existem atendimentos registrados com este serviço.`);
    }
  },

  checkFinanceCategoryDeletion: async (categoryName: string) => {
    const res = await repositories.finance.list({ 
      limit: 1, 
      filters: { category: categoryName } 
    });

    if (res.total > 0) {
      throw new Error(`Não é possível excluir: Existem movimentações financeiras nesta categoria.`);
    }
  }
};