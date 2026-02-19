import { mockDb } from './mockDb';
import { Candidate, Company, Job, ServiceItem, Order, FinanceTransaction, PersonClient, Label, JobCandidate, CandidateCategory, FinanceCategory, PaginatedResult, QueryParams, Tenant } from '../domain/types';
import { authService } from '../services/auth.service';

/**
 * Creates a repository wrapper that strictly enforces tenant isolation.
 * Automatically injects tenant_id on create/list and verifies it on update/delete/get.
 */
const createRepo = <T extends { id: string, tenant_id?: string }>(collectionKey: string) => ({
  
  list: async (params?: QueryParams): Promise<PaginatedResult<T>> => {
    const tenantId = authService.requireTenantId();
    
    // Force Tenant Filter
    const secureParams = {
      ...params,
      filters: {
        ...(params?.filters || {}),
        tenant_id: tenantId
      }
    };
    
    return mockDb.list<T>(collectionKey, secureParams);
  },
    
  create: async (data: Partial<T>): Promise<T> => {
    const tenantId = authService.requireTenantId();
    
    // Inject Tenant ID, ignoring any tenant_id passed in data
    const secureData = {
      ...data,
      tenant_id: tenantId
    };
    
    return mockDb.create<T>(collectionKey, secureData);
  },
    
  update: async (id: string, data: Partial<T>): Promise<T> => {
    const tenantId = authService.requireTenantId();
    
    // 1. Verify ownership before update
    const existing = await mockDb.getById<T>(collectionKey, id);
    if (!existing) throw new Error('Item not found');
    if (existing.tenant_id !== tenantId) throw new Error('Unauthorized access to this item');

    // 2. Prevent changing tenant_id
    const { tenant_id, ...safeData } = data as any;
    
    return mockDb.update<T>(collectionKey, id, safeData);
  },
    
  remove: async (id: string): Promise<void> => {
    const tenantId = authService.requireTenantId();

    // 1. Verify ownership before remove
    const existing = await mockDb.getById<T>(collectionKey, id);
    if (!existing) throw new Error('Item not found');
    if (existing.tenant_id !== tenantId) throw new Error('Unauthorized access to this item');

    return mockDb.remove<T>(collectionKey, id);
  },

  get: async (id: string): Promise<T | null> => {
    const tenantId = authService.requireTenantId();
    
    const item = await mockDb.getById<T>(collectionKey, id);
    if (!item) return null;
    
    // Verify ownership
    if (item.tenant_id !== tenantId) return null; // Or throw error? Returning null behaves like 404
    
    return item;
  }
});

// Admin-only repository for managing Tenants directly (bypasses tenant check on itself)
const createTenantRepo = () => ({
  list: (params?: QueryParams) => mockDb.list<Tenant>(mockDb.KEYS.TENANTS, params),
  create: (data: Partial<Tenant>) => mockDb.create<Tenant>(mockDb.KEYS.TENANTS, data),
  update: (id: string, data: Partial<Tenant>) => mockDb.update<Tenant>(mockDb.KEYS.TENANTS, id, data),
  remove: (id: string) => mockDb.remove<Tenant>(mockDb.KEYS.TENANTS, id),
  get: (id: string) => mockDb.getById<Tenant>(mockDb.KEYS.TENANTS, id)
});

export const repositories = {
  candidates: createRepo<Candidate>(mockDb.KEYS.CANDIDATES),
  companies: createRepo<Company>(mockDb.KEYS.COMPANIES),
  jobs: createRepo<Job>(mockDb.KEYS.JOBS),
  jobCandidates: createRepo<JobCandidate>(mockDb.KEYS.JOB_CANDIDATES),
  personClients: createRepo<PersonClient>(mockDb.KEYS.PERSON_CLIENTS),
  services: createRepo<ServiceItem>(mockDb.KEYS.SERVICES),
  orders: createRepo<Order>(mockDb.KEYS.ORDERS),
  finance: createRepo<FinanceTransaction>(mockDb.KEYS.FINANCE),
  labels: createRepo<Label>(mockDb.KEYS.LABELS),
  candidateCategories: createRepo<CandidateCategory>(mockDb.KEYS.CANDIDATE_CATEGORIES),
  financeCategories: createRepo<FinanceCategory>(mockDb.KEYS.FINANCE_CATEGORIES),
  
  // Special Repo
  tenants: createTenantRepo()
};