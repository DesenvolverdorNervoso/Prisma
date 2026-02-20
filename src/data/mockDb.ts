import { v4 as uuidv4 } from 'uuid';
import { PaginatedResult, QueryParams, Tenant } from '../domain/types';
import { DEFAULT_TENANT_ID } from '../domain/constants';

// Keys for localStorage
const DB_KEYS = {
  TENANTS: 'prisma_tenants', // New Tenant Key
  CANDIDATES: 'prisma_candidates',
  COMPANIES: 'prisma_companies',
  PERSON_CLIENTS: 'prisma_person_clients',
  JOBS: 'prisma_jobs',
  JOB_CANDIDATES: 'prisma_job_candidates',
  SERVICES: 'prisma_services',
  ORDERS: 'prisma_orders',
  FINANCE: 'prisma_finance',
  SESSION: 'prisma_session',
  LABELS: 'prisma_labels',
  CANDIDATE_CATEGORIES: 'prisma_candidate_categories',
  FINANCE_CATEGORIES: 'prisma_finance_categories'
};

const getStorage = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setStorage = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- SEED DATA ---

const SEED_TAGS = [
  { name: 'Cliente PJ - Empresa', color: '#bfdbfe', entityType: 'company' },
  { name: 'Cliente PF - Consultorias e Serviços', color: '#e9d5ff', entityType: 'person_client' },
  { name: 'Candidatos Banco de Dados', color: '#bbf7d0', entityType: 'candidate' }
];

const SEED_CANDIDATE_CATS = [
  'Doméstica', 'Vendas', 'Administrativo', 'Rural', 'Cozinha / Auxiliar'
];

const SEED_FINANCE_CATS = [
  { name: 'Receita Serviços', allowedType: 'Entrada' },
  { name: 'Recrutamento', allowedType: 'Entrada' },
  { name: 'Marketing', allowedType: 'Saída' },
  { name: 'Ferramentas', allowedType: 'Saída' },
  { name: 'Impostos', allowedType: 'Saída' },
  { name: 'Outros', allowedType: 'Ambos' }
];

const SEED_SERVICES = [
  { name: 'Consultoria Individual', price: 150 },
  { name: 'Consultoria Empresarial', price: 500 },
  { name: 'Consultoria para Empreendedor', price: 300 },
  { name: 'Recrutamento e Seleção', price: 1200 },
  { name: 'Recrutamento e Seleção Freelancer', price: 800 },
  { name: 'Reestruturação Curricular', price: 80 },
  { name: 'Treinamentos Individuais', price: 200 },
  { name: 'Palestras', price: 1000 },
  { name: 'Treinamentos Corporativos', price: 2500 },
  { name: 'Semijóias', price: 50 },
  { name: 'Serviços MP', price: 100 },
  { name: 'Artes e Vídeos', price: 150 },
  { name: 'Extras', price: 0 }
];

// Initialize DB with some defaults if empty
const initDb = () => {
  // 0. Seed Default Tenant
  const tenants = getStorage<Tenant>(DB_KEYS.TENANTS);
  if (tenants.length === 0) {
    const defaultTenant: Tenant = {
      id: DEFAULT_TENANT_ID,
      name: 'Consultoria Principal',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setStorage(DB_KEYS.TENANTS, [defaultTenant]);
  }

  // --- MIGRATION: UPDATE ALL LEGACY DATA TO HAVE TENANT_ID ---
  const collectionsToMigrate = [
    DB_KEYS.CANDIDATES, DB_KEYS.COMPANIES, DB_KEYS.PERSON_CLIENTS, 
    DB_KEYS.JOBS, DB_KEYS.JOB_CANDIDATES, DB_KEYS.SERVICES, 
    DB_KEYS.ORDERS, DB_KEYS.FINANCE, DB_KEYS.LABELS, 
    DB_KEYS.CANDIDATE_CATEGORIES, DB_KEYS.FINANCE_CATEGORIES
  ];

  collectionsToMigrate.forEach(key => {
    const items = getStorage<any>(key);
    let changed = false;
    const migrated = items.map(item => {
      if (!item.tenant_id) {
        changed = true;
        return { ...item, tenant_id: DEFAULT_TENANT_ID };
      }
      return item;
    });
    if (changed) {
      console.log(`[Migration] Updated ${key} with default tenant_id.`);
      setStorage(key, migrated);
    }
  });

  // 1. Seed Services (Idempotent per tenant is tricky here without user context, 
  // so we seed only if the collection is totally empty, assuming first run)
  const existingServices = getStorage<any>(DB_KEYS.SERVICES);
  if (existingServices.length === 0) {
    const defaults = SEED_SERVICES.map(s => ({
      id: uuidv4(),
      created_at: new Date().toISOString(),
      tenant_id: DEFAULT_TENANT_ID,
      name: s.name,
      price_default: s.price,
      active: true,
      category: 'Geral',
      description: 'Serviço padrão'
    }));
    setStorage(DB_KEYS.SERVICES, defaults);
  }

  // 2. Seed Tags (Labels)
  const existingLabels = getStorage<any>(DB_KEYS.LABELS);
  let labelsToSave = [...existingLabels];
  let labelsChanged = false;

  // Check if default tenant has tags
  const defaultTenantTags = existingLabels.filter(l => l.tenant_id === DEFAULT_TENANT_ID);
  
  if (defaultTenantTags.length === 0) {
    SEED_TAGS.forEach(seed => {
        labelsToSave.push({
          id: uuidv4(),
          created_at: new Date().toISOString(),
          tenant_id: DEFAULT_TENANT_ID,
          name: seed.name,
          color: seed.color,
          entityType: seed.entityType as any,
          active: true
        });
        labelsChanged = true;
    });
  }
  if (labelsChanged) setStorage(DB_KEYS.LABELS, labelsToSave);

  // 3. Seed Candidate Categories
  const existingCC = getStorage<any>(DB_KEYS.CANDIDATE_CATEGORIES);
  if (existingCC.length === 0) {
    const defaults = SEED_CANDIDATE_CATS.map(name => ({
      id: uuidv4(),
      created_at: new Date().toISOString(),
      tenant_id: DEFAULT_TENANT_ID,
      name: name,
      active: true
    }));
    setStorage(DB_KEYS.CANDIDATE_CATEGORIES, defaults);
  }

  // 4. Seed Finance Categories
  const existingFC = getStorage<any>(DB_KEYS.FINANCE_CATEGORIES);
  if (existingFC.length === 0) {
    const defaults = SEED_FINANCE_CATS.map(fc => ({
      id: uuidv4(),
      created_at: new Date().toISOString(),
      tenant_id: DEFAULT_TENANT_ID,
      name: fc.name,
      allowedType: fc.allowedType,
      active: true
    }));
    setStorage(DB_KEYS.FINANCE_CATEGORIES, defaults);
  }
};

// Map collections to their searchable fields
const SEARCH_FIELDS: Record<string, string[]> = {
  [DB_KEYS.TENANTS]: ['name'],
  [DB_KEYS.CANDIDATES]: ['name', 'whatsapp', 'city'],
  [DB_KEYS.COMPANIES]: ['name', 'contact_person', 'whatsapp'],
  [DB_KEYS.PERSON_CLIENTS]: ['name', 'whatsapp'],
  [DB_KEYS.JOBS]: ['title', 'category', 'city'],
  [DB_KEYS.SERVICES]: ['name', 'category'],
  [DB_KEYS.ORDERS]: ['client_name'], 
  [DB_KEYS.FINANCE]: ['description', 'category']
};

// Generic CRUD operations
export const mockDb = {
  init: initDb,
  
  list: async <T>(collection: string, params?: QueryParams): Promise<PaginatedResult<T>> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let items = getStorage<T>(collection);
    const { page = 1, limit = 10, search, filters } = params || {};

    // 1. Filter
    if (filters) {
      items = items.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined || value === '' || value === 'all') return true;
          
          // STRICT Tenant Check
          if (key === 'tenant_id') {
            return (item as any).tenant_id === value;
          }

          // Date Range Handling (start_date, end_date)
          if (key === 'start_date' && (item as any)['date']) {
             return new Date((item as any)['date']) >= new Date(value);
          }
          if (key === 'end_date' && (item as any)['date']) {
             return new Date((item as any)['date']) <= new Date(value);
          }
          if (key === 'start_date' || key === 'end_date') return true; 

          // Tags array handling
          if (key === 'tags' && Array.isArray((item as any).labels)) {
            return (item as any).labels.includes(value);
          }

          return (item as any)[key] == value;
        });
      });
    }

    // 2. Search
    if (search && SEARCH_FIELDS[collection]) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => {
        return SEARCH_FIELDS[collection].some(field => {
          const val = (item as any)[field];
          return val && String(val).toLowerCase().includes(searchLower);
        });
      });
    }

    // 3. Sort (Default by created_at desc if exists)
    if (items.length > 0 && (items[0] as any).created_at) {
       items.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // 4. Pagination
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      data: paginatedItems,
      total,
      page,
      totalPages
    };
  },

  getById: async <T extends { id: string }>(collection: string, id: string): Promise<T | null> => {
    const list = getStorage<T>(collection);
    return list.find(item => item.id === id) || null;
  },

  // Note: 'tenant_id' in data here is expected to be injected by repository
  create: async <T>(collection: string, data: any): Promise<T> => {
    const list = getStorage<T>(collection);
    const newItem = {
      ...data,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as T;
    list.unshift(newItem); 
    setStorage(collection, list);
    return newItem;
  },

  update: async <T extends { id: string }>(collection: string, id: string, data: Partial<T>): Promise<T> => {
    const list = getStorage<T>(collection);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Item not found');
    
    const updated = { 
      ...list[index], 
      ...data, 
      updated_at: new Date().toISOString() 
    };
    list[index] = updated;
    setStorage(collection, list);
    return updated;
  },

  remove: async <T extends { id: string }>(collection: string, id: string): Promise<void> => {
    let list = getStorage<T>(collection);
    list = list.filter(item => item.id !== id);
    setStorage(collection, list);
  },
  
  setSession: (token: string) => localStorage.setItem(DB_KEYS.SESSION, token),
  getSession: () => localStorage.getItem(DB_KEYS.SESSION),
  clearSession: () => localStorage.removeItem(DB_KEYS.SESSION),
  
  KEYS: DB_KEYS,
  DEFAULT_TENANT_ID
};

// Run init immediately
initDb();