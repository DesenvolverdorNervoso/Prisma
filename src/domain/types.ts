
export type Status = 'active' | 'inactive' | 'pending' | 'archived';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
  tenant_id: string; 
}

// --- Multi-Tenant Core ---
export interface Tenant {
  id: string;
  name: string;
  slug?: string; // e.g. 'consultoria-a'
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string; // matches auth.users.id
  email: string;
  name: string;
  role: 'admin' | 'colaborador';
  tenant_id: string;
  allowed_settings: boolean;
  created_at?: string;
  updated_at?: string;
}

// --- Pagination & Filters ---
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, any>;
}

export interface Candidate extends BaseEntity {
  // --- Identificação ---
  name: string; // Used as full_name
  whatsapp: string;
  city: string;
  full_address?: string;
  birth_date?: string; // ISO Date

  // --- Perfil Pessoal ---
  lives_with?: string;
  strengths?: string; // "Qualidade 1, Qualidade 2"
  improvement_goal?: string;
  free_time?: string;
  
  // --- Logística e Preferências ---
  has_cnh?: boolean;
  cnh_category?: string;
  alcohol_or_smokes?: 'Não' | 'Às vezes' | 'Sim';
  availability?: string;
  needs_transport_aid?: boolean;
  
  has_restrictions?: boolean;
  restrictions_details?: string;
  
  studying?: boolean;
  studying_details?: string; // Curso / Periodo

  // --- Profissional ---
  category: string; // Area de interesse principal
  interest_area?: string; // Detalhes da area
  job_interest_type?: 'Estágio' | 'Efetivo' | 'Ambos';
  job_exit_reason?: string;
  salary_expectation?: number;
  relocate?: boolean;
  
  // --- Arquivos e Sistema ---
  cv_url?: string; // Path in Supabase Storage (bucket: curriculos)
  resume_file_url?: string; // Legacy ID referencing Storage Service
  resume_path?: string | null; // Legacy Path in Supabase Storage
  resume_file_type?: string; // Legacy
  resume_file_name?: string; // Legacy
  resume_size?: number; // Legacy
  linkedin?: string;
  
  // --- Gestão ---
  status: 'Novo' | 'Em análise' | 'Encaminhado' | 'Contratado' | 'Reprovado';
  origin: 'Link' | 'Manual' | 'Indicação' | 'Interno';
  profile_expires_at?: string; // ISO Date
  
  notes?: string;
  internal_notes?: string;
  status_reason?: string;
  tags?: string[];
  
  // Legacy fields kept for compatibility
  education?: string;
  marital_status?: string;
  has_vehicle?: boolean;
  cnh?: string; 
  attachments?: string[]; 
}

export interface CompanyHistory {
  date: string;
  note: string;
  user?: string;
}

export interface Company extends BaseEntity {
  name: string; // Fantasy Name
  contact_person: string;
  whatsapp: string;
  city: string;
  notes?: string;
  tags?: string[];

  // Expanded Fields
  social_reason?: string;
  cnpj?: string;
  landline?: string;
  website?: string;
  instagram?: string;
  neighborhood?: string;
  zip_code?: string;
  internal_rep?: string; // Responsável interno
  classification?: 'A' | 'B' | 'C';
  active?: boolean;
  history?: CompanyHistory[];
}

export interface PersonClient extends BaseEntity {
  name: string;
  whatsapp: string;
  main_service: string;
  notes?: string;
  tags?: string[];

  // Expanded
  cpf?: string;
  birth_date?: string;
  profession?: string;
  instagram?: string;
  neighborhood?: string;
  zip_code?: string;
  active?: boolean;
}

export type JobStatus = 'Em aberto' | 'Encerrada' | 'Cancelada' | 'Externo' | 'Contratou por fora';

export interface JobRequirement {
  id: string;
  text: string;
  mandatory: boolean;
}

export interface Job extends BaseEntity {
  title: string;
  company_id: string; 
  company_name?: string; 
  category: string;
  requirements: string; // Legacy simple string, keeping for compatibility but UI will use structured if available
  requirements_list?: JobRequirement[]; // New structure
  status: JobStatus;
  salary_range?: string;
  city?: string; 
  
  // Date tracking fields
  closed_at?: string;
  canceled_at?: string;
  outside_recruitment_date?: string;
  outside_recruitment_expiry?: string;

  // Expanded
  contract_type?: 'CLT' | 'PJ' | 'Temporário' | 'Freelancer' | 'Estágio';
  work_schedule?: string;
  benefits?: string;
  quantity?: number;
  priority?: 'Alta' | 'Média' | 'Baixa';
  internal_rep?: string;
}

export type JobCandidateStatus = 'Triagem' | 'Entrevista' | 'Encaminhado ao cliente' | 'Aprovado' | 'Reprovado';

export interface JobCandidate extends BaseEntity {
  job_id: string;
  candidate_id: string;
  status: JobCandidateStatus;
  candidate_name?: string;
}

export interface ServiceItem extends BaseEntity {
  name: string;
  price_default: number;
  description?: string;
  active: boolean; 
  category?: string;

  // Expanded
  service_type?: 'Consultoria' | 'Recrutamento' | 'Treinamento' | 'Outros';
  price_min?: number;
  price_max?: number;
  estimated_duration?: string; // "2 horas", "1 mês"
  contract_url?: string;
}

export type OrderStatus = 'Aberto' | 'Concluído' | 'Cancelado';
export type ClientType = 'PF' | 'PJ';

export interface Order extends BaseEntity {
  client_type: ClientType;
  client_id: string;
  service_id: string;
  value: number;
  status: OrderStatus;
  date: string; 
  client_name?: string; 
  service_name?: string;

  // Expanded
  payment_method?: string;
  is_installments?: boolean;
  installments_count?: number;
  internal_rep?: string;
  priority?: 'Alta' | 'Média' | 'Baixa';
  attachments?: string[];
}

export interface FinanceTransaction extends BaseEntity {
  type: 'Entrada' | 'Saída';
  description: string;
  value: number;
  status: 'Pendente' | 'Pago';
  date: string;
  category?: string;
  order_id?: string; 

  // Expanded
  payment_method?: string;
  cost_center?: string;
  document_number?: string;
  is_installments?: boolean;
  installment_number?: string; // "1/3"
  internal_notes?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'colaborador';
  tenant_id: string; // Mandatory for multi-tenant
  allowedSettings?: boolean; 
}

export type TagEntityType = 'candidate' | 'company' | 'person_client';

export interface Tag extends BaseEntity {
  name: string;
  color: string;
  entity_type: TagEntityType;
  active: boolean; 
}

export interface CandidateCategory extends BaseEntity {
  name: string;
  active: boolean;
}

export interface FinanceCategory extends BaseEntity {
  name: string;
  allowedType: 'Entrada' | 'Saída' | 'Ambos';
  active: boolean;
}
