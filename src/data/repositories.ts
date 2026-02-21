import { supabase } from '../lib/supabaseClient';
import { Candidate, Company, Job, ServiceItem, Order, FinanceTransaction, PersonClient, Tag, JobCandidate, CandidateCategory, FinanceCategory, PaginatedResult, QueryParams, Tenant } from '../domain/types';
import { tenantService } from '../services/tenant.service';
import { tagService } from '../services/tag.service';

const DB_KEYS = {
  TENANTS: 'tenants',
  CANDIDATES: 'candidates',
  COMPANIES: 'companies',
  PERSON_CLIENTS: 'person_clients',
  JOBS: 'jobs',
  JOB_CANDIDATES: 'job_candidates',
  SERVICES: 'services',
  ORDERS: 'orders',
  FINANCE: 'finance_transactions',
  LABELS: 'tags',
  CANDIDATE_CATEGORIES: 'candidate_categories',
  FINANCE_CATEGORIES: 'finance_categories'
};

/**
 * Creates a repository wrapper that strictly enforces tenant isolation in Supabase.
 */
const createRepo = <T extends { id: string, tenant_id?: string, tags?: string[] }>(
  tableName: string, 
  options?: { beforeCreate?: (data: Partial<T>) => Promise<Partial<T>> }
) => ({
  
  list: async (params?: QueryParams): Promise<PaginatedResult<T>> => {
    const tenantId = await tenantService.requireTenantId();
    const { page = 1, limit = 10, search, filters } = params || {};
    
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply Filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === '' || value === 'all' || key === 'tenant_id') return;
        
        if (key === 'tags' && Array.isArray(value)) {
          query = query.contains('tags', value);
        } else {
          query = query.eq(key, value);
        }
      });
    }

    // Apply Search (if applicable)
    // Note: Supabase search is complex without full-text search, using simple ilike for name if exists
    if (search) {
       query = query.ilike('name', `%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: (data || []) as T[],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },
    
  create: async (data: Partial<T>): Promise<T> => {
    const tenantId = await tenantService.requireTenantId();
    
    let finalData = { ...data };
    if (options?.beforeCreate) {
      finalData = await options.beforeCreate(finalData);
    }

    const { data: newItem, error } = await supabase
      .from(tableName)
      .insert({ ...finalData, tenant_id: tenantId })
      .select()
      .single();
    
    if (error) throw error;
    return newItem as T;
  },
    
  update: async (id: string, data: Partial<T>): Promise<T> => {
    const tenantId = await tenantService.requireTenantId();
    
    // RLS will block if tenant_id doesn't match, but we add it for safety
    const { data: updatedItem, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) throw error;
    return updatedItem as T;
  },
    
  remove: async (id: string): Promise<void> => {
    const tenantId = await tenantService.requireTenantId();

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  get: async (id: string): Promise<T | null> => {
    const tenantId = await tenantService.requireTenantId();
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) return null;
    return data as T;
  }
});

// Admin-only repository for managing Tenants
const createTenantRepo = () => ({
  list: async () => {
    const { data, error, count } = await supabase.from('tenants').select('*', { count: 'exact' });
    if (error) throw error;
    return { data, total: count || 0, page: 1, totalPages: 1 };
  },
  create: async (data: Partial<Tenant>) => {
    const { data: res, error } = await supabase.from('tenants').insert(data).select().single();
    if (error) throw error;
    return res;
  },
  update: async (id: string, data: Partial<Tenant>) => {
    const { data: res, error } = await supabase.from('tenants').update(data).eq('id', id).select().single();
    if (error) throw error;
    return res;
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) throw error;
  },
  get: async (id: string) => {
    const { data, error } = await supabase.from('tenants').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }
});

export const repositories = {
  candidates: createRepo<Candidate>(DB_KEYS.CANDIDATES, {
    beforeCreate: async (data) => ({
      ...data,
      tags: await tagService.applyDefaultTag(data.tags, 'candidate')
    })
  }),
  companies: createRepo<Company>(DB_KEYS.COMPANIES, {
    beforeCreate: async (data) => ({
      ...data,
      tags: await tagService.applyDefaultTag(data.tags, 'company')
    })
  }),
  jobs: createRepo<Job>(DB_KEYS.JOBS),
  jobCandidates: createRepo<JobCandidate>(DB_KEYS.JOB_CANDIDATES),
  personClients: createRepo<PersonClient>(DB_KEYS.PERSON_CLIENTS, {
    beforeCreate: async (data) => ({
      ...data,
      tags: await tagService.applyDefaultTag(data.tags, 'person_client')
    })
  }),
  services: createRepo<ServiceItem>(DB_KEYS.SERVICES),
  orders: createRepo<Order>(DB_KEYS.ORDERS),
  finance: createRepo<FinanceTransaction>(DB_KEYS.FINANCE),
  labels: createRepo<Tag>(DB_KEYS.LABELS),
  candidateCategories: createRepo<CandidateCategory>(DB_KEYS.CANDIDATE_CATEGORIES),
  financeCategories: createRepo<FinanceCategory>(DB_KEYS.FINANCE_CATEGORIES),
  
  // Special Repo
  tenants: createTenantRepo()
};

