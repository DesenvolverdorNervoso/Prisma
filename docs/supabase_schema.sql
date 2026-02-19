
-- ==============================================================================
-- PRISMA RH - SUPABASE SCHEMA
-- Versão: 1.0.0
-- Descrição: Estrutura de banco de dados para SaaS de RH multi-tenant.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime"; -- Para updated_at automático (opcional, ou usamos trigger customizada)

-- 2. ENUMS (Tipos Personalizados)
CREATE TYPE candidate_status AS ENUM ('Novo', 'Em análise', 'Encaminhado', 'Contratado', 'Reprovado');
CREATE TYPE candidate_origin AS ENUM ('Interno', 'Link', 'Indicação', 'Manual');
CREATE TYPE job_status AS ENUM ('Em aberto', 'Encerrada', 'Cancelada', 'Externo', 'Contratou por fora');
CREATE TYPE job_candidate_status AS ENUM ('Triagem', 'Entrevista', 'Encaminhado ao cliente', 'Aprovado', 'Reprovado');
CREATE TYPE order_status AS ENUM ('Em andamento', 'Concluído', 'Cancelado');
CREATE TYPE order_client_type AS ENUM ('PF', 'PJ');
CREATE TYPE finance_type AS ENUM ('Entrada', 'Saída');
CREATE TYPE finance_status AS ENUM ('Pendente', 'Pago');
CREATE TYPE entity_type AS ENUM ('candidate', 'company', 'person_client');

-- 3. FUNÇÃO TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TABELAS CORE & MULTI-TENANT

-- Tenants (Consultorias)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (Usuários vinculados ao Auth do Supabase)
-- Nota: O id deve corresponder ao auth.users.id
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'colaborador', -- 'admin' ou 'colaborador'
  allowed_settings BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELAS AUXILIARES (Configurações)

-- Tags/Etiquetas
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#cbd5e1',
  entity_type entity_type NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorias de Candidatos
CREATE TABLE candidate_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorias Financeiras
CREATE TABLE finance_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  allowed_type TEXT CHECK (allowed_type IN ('Entrada', 'Saída', 'Ambos')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Serviços (Catálogo)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Geral',
  price_default NUMERIC(10,2) DEFAULT 0,
  price_min NUMERIC(10,2),
  price_max NUMERIC(10,2),
  estimated_duration TEXT,
  service_type TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ENTIDADES DE NEGÓCIO

-- Empresas (Clientes PJ)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL, -- Nome Fantasia
  social_reason TEXT,
  cnpj TEXT,
  contact_person TEXT,
  whatsapp TEXT,
  landline TEXT,
  city TEXT,
  neighborhood TEXT,
  zip_code TEXT,
  website TEXT,
  instagram TEXT,
  internal_rep TEXT,
  classification TEXT DEFAULT 'B', -- A, B, C
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  -- Labels/Tags serão gerenciados via array de IDs ou tabela pivô. 
  -- Simplificação para Supabase: Array de Text ou JSONB é comum, mas relacional puro usaria tabela pivô.
  -- Vamos manter um array de UUIDs de tags para simplicidade do frontend atual.
  label_ids UUID[] DEFAULT '{}',
  history JSONB DEFAULT '[]'::jsonb, -- Manter histórico simples como JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes PF
CREATE TABLE person_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  profession TEXT,
  main_service TEXT,
  instagram TEXT,
  zip_code TEXT,
  neighborhood TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  label_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name, whatsapp) -- Evitar duplicidade básica
);

-- Candidatos
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  
  -- Identificação
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  city TEXT,
  full_address TEXT,
  birth_date DATE,
  
  -- Perfil
  lives_with TEXT,
  strengths TEXT,
  improvement_goal TEXT,
  free_time TEXT,
  
  -- Logística
  has_cnh BOOLEAN DEFAULT FALSE,
  cnh_category TEXT,
  alcohol_or_smokes TEXT,
  availability TEXT,
  needs_transport_aid BOOLEAN DEFAULT FALSE,
  has_restrictions BOOLEAN DEFAULT FALSE,
  restrictions_details TEXT,
  studying BOOLEAN DEFAULT FALSE,
  studying_details TEXT,
  
  -- Profissional
  category TEXT, -- FK lógico para candidate_categories.name ou ID
  interest_area TEXT,
  job_interest_type TEXT, -- Estágio, Efetivo, Ambos
  job_exit_reason TEXT,
  salary_expectation NUMERIC(10,2),
  relocate BOOLEAN DEFAULT FALSE,
  linkedin TEXT,
  
  -- Arquivos (Referências ao Storage)
  cv_url TEXT, -- Legacy ou link externo
  resume_file_path TEXT, -- Caminho no bucket
  resume_file_name TEXT,
  
  -- Gestão
  status candidate_status DEFAULT 'Novo',
  origin candidate_origin DEFAULT 'Interno',
  profile_expires_at TIMESTAMPTZ,
  notes TEXT,
  internal_notes TEXT,
  label_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Integridade
  UNIQUE(tenant_id, whatsapp) -- Impede duplicidade de candidato na mesma consultoria
);

-- Índice para busca rápida por telefone
CREATE INDEX idx_candidates_whatsapp ON candidates(whatsapp);

-- Vagas (Job Openings)
CREATE TABLE job_openings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT, -- Não apagar empresa com vaga
  
  title TEXT NOT NULL,
  category TEXT,
  requirements TEXT, -- Legacy
  requirements_list JSONB DEFAULT '[]'::jsonb, -- Novo formato estruturado
  
  status job_status DEFAULT 'Em aberto',
  city TEXT,
  
  -- Detalhes Contratuais
  contract_type TEXT, -- CLT, PJ, etc
  salary_range TEXT,
  work_schedule TEXT,
  benefits TEXT,
  quantity INTEGER DEFAULT 1,
  priority TEXT DEFAULT 'Média',
  internal_rep TEXT,
  
  -- Datas de controle
  closed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  outside_recruitment_date TIMESTAMPTZ,
  outside_recruitment_expiry TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vínculo Vaga <-> Candidato
CREATE TABLE job_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  status job_candidate_status DEFAULT 'Triagem',
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(job_id, candidate_id) -- Candidato só aplica uma vez por vaga
);

-- Pedidos (Orders)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  
  client_type order_client_type NOT NULL,
  
  -- Polimorfismo simplificado via Nullable FKs
  company_id UUID REFERENCES companies(id) ON DELETE RESTRICT,
  person_client_id UUID REFERENCES person_clients(id) ON DELETE RESTRICT,
  
  service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
  
  value NUMERIC(10,2) NOT NULL,
  status order_status DEFAULT 'Em andamento',
  date DATE NOT NULL,
  
  payment_method TEXT,
  is_installments BOOLEAN DEFAULT FALSE,
  installments_count INTEGER DEFAULT 1,
  internal_rep TEXT,
  priority TEXT DEFAULT 'Média',
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garante que tem ou empresa OU pessoa, não ambos ou nenhum
  CHECK (
    (client_type = 'PJ' AND company_id IS NOT NULL AND person_client_id IS NULL) OR
    (client_type = 'PF' AND person_client_id IS NOT NULL AND company_id IS NULL)
  )
);

-- Transações Financeiras
CREATE TABLE finance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  
  type finance_type NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  status finance_status DEFAULT 'Pendente',
  date DATE NOT NULL,
  category TEXT, -- FK lógico para finance_categories.name
  
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Se apagar pedido, mantem histórico financeiro
  
  payment_method TEXT,
  cost_center TEXT,
  document_number TEXT,
  internal_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. APLICAR TRIGGERS DE UPDATED_AT
CREATE TRIGGER set_timestamp_tenants BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_tags BEFORE UPDATE ON tags FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_companies BEFORE UPDATE ON companies FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_person_clients BEFORE UPDATE ON person_clients FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_candidates BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_job_openings BEFORE UPDATE ON job_openings FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_job_candidates BEFORE UPDATE ON job_candidates FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_services BEFORE UPDATE ON services FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_timestamp_finance_transactions BEFORE UPDATE ON finance_transactions FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- 8. HABILITAR RLS (Segurança)
-- Habilita RLS em todas as tabelas (políticas específicas devem ser criadas posteriormente)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- 9. SEED DATA (Dados Iniciais)

DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- 9.1 Criar Tenant Padrão
  INSERT INTO tenants (name, slug, active)
  VALUES ('Prisma RH', 'prisma-rh', TRUE)
  RETURNING id INTO default_tenant_id;

  -- 9.2 Criar Tags Padrão
  INSERT INTO tags (tenant_id, name, color, entity_type) VALUES
  (default_tenant_id, 'Cliente PJ - Empresa', '#bfdbfe', 'company'),
  (default_tenant_id, 'Cliente PF - Consultorias e Serviços', '#e9d5ff', 'person_client'),
  (default_tenant_id, 'Candidatos Banco de Dados', '#bbf7d0', 'candidate');

  -- 9.3 Criar Categorias de Candidato
  INSERT INTO candidate_categories (tenant_id, name) VALUES
  (default_tenant_id, 'Doméstica'),
  (default_tenant_id, 'Vendas'),
  (default_tenant_id, 'Administrativo'),
  (default_tenant_id, 'Rural'),
  (default_tenant_id, 'Cozinha / Auxiliar'),
  (default_tenant_id, 'Gerência'),
  (default_tenant_id, 'Saúde'),
  (default_tenant_id, 'Outros');

  -- 9.4 Criar Categorias Financeiras
  INSERT INTO finance_categories (tenant_id, name, allowed_type) VALUES
  (default_tenant_id, 'Receita Serviços', 'Entrada'),
  (default_tenant_id, 'Recrutamento', 'Entrada'),
  (default_tenant_id, 'Marketing', 'Saída'),
  (default_tenant_id, 'Ferramentas', 'Saída'),
  (default_tenant_id, 'Impostos', 'Saída'),
  (default_tenant_id, 'Outros', 'Ambos');

  -- 9.5 Criar Serviços Padrão
  INSERT INTO services (tenant_id, name, price_default, category, service_type) VALUES
  (default_tenant_id, 'Consultoria Individual', 150.00, 'Geral', 'Consultoria'),
  (default_tenant_id, 'Consultoria Empresarial', 500.00, 'Geral', 'Consultoria'),
  (default_tenant_id, 'Consultoria para Empreendedor', 300.00, 'Geral', 'Consultoria'),
  (default_tenant_id, 'Recrutamento e Seleção', 1200.00, 'RH', 'Recrutamento'),
  (default_tenant_id, 'Recrutamento e Seleção Freelancer', 800.00, 'RH', 'Recrutamento'),
  (default_tenant_id, 'Reestruturação Curricular', 80.00, 'Geral', 'Consultoria'),
  (default_tenant_id, 'Treinamentos Individuais', 200.00, 'Treinamento', 'Treinamento'),
  (default_tenant_id, 'Palestras', 1000.00, 'Treinamento', 'Treinamento'),
  (default_tenant_id, 'Treinamentos Corporativos', 2500.00, 'Treinamento', 'Treinamento'),
  (default_tenant_id, 'Semijóias', 50.00, 'Vendas', 'Outros'),
  (default_tenant_id, 'Serviços MP', 100.00, 'Outros', 'Outros'),
  (default_tenant_id, 'Artes e Vídeos', 150.00, 'Marketing', 'Outros'),
  (default_tenant_id, 'Extras', 0.00, 'Outros', 'Outros');

END $$;
