-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS (PostgreSQL Types for strict data integrity)
CREATE TYPE user_role AS ENUM ('ADMIN', 'VENDAS', 'TECNICO', 'PRODUCAO', 'FINANCEIRO');
CREATE TYPE service_type AS ENUM ('PORTAO', 'POLICARBONATO', 'TOLDO', 'FUNILARIA', 'SOLDA', 'OUTROS');
CREATE TYPE lead_stage AS ENUM ('NOVO', 'CONTATO', 'VISITA', 'ORCAMENTO', 'NEGOCIACAO', 'FECHADO', 'EM_EXECUCAO', 'CONCLUIDO', 'POS_VENDA', 'PERDIDO');
CREATE TYPE lead_priority AS ENUM ('BAIXA', 'MEDIA', 'ALTA');
CREATE TYPE visit_status AS ENUM ('AGENDADA', 'REALIZADA', 'REMARCADA', 'CANCELADA');
CREATE TYPE quote_status AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'EXPIRADO');
CREATE TYPE quote_item_type AS ENUM ('SERVICO', 'MATERIAL');
CREATE TYPE order_status AS ENUM ('ABERTO', 'EM_PRODUCAO', 'EM_INSTALACAO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO');
CREATE TYPE work_order_status AS ENUM ('CORTE', 'SOLDA', 'ACABAMENTO', 'PINTURA', 'INSTALACAO', 'TESTE_ENTREGA', 'FINALIZADA');
CREATE TYPE payment_method AS ENUM ('PIX', 'CARTAO', 'BOLETO', 'DINHEIRO', 'TRANSFERENCIA');
CREATE TYPE payment_status AS ENUM ('ABERTO', 'PARCIAL', 'PAGO', 'ATRASADO', 'CANCELADO');
CREATE TYPE payable_category AS ENUM ('MATERIAL', 'SERVICO_TERCEIRO', 'DESPESA_FIXA', 'OUTROS');
CREATE TYPE stock_category AS ENUM ('METAL', 'CHAPA', 'POLICARBONATO', 'AUTOMACAO', 'FERRAMENTAS', 'CONSUMIVEIS', 'FIXACAO', 'PINTURA', 'OUTROS');
CREATE TYPE stock_movement_type AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'RESERVA', 'DESRESERVA');
CREATE TYPE stock_reservation_status AS ENUM ('RESERVADO', 'CONSUMIDO', 'CANCELADO');
CREATE TYPE purchase_order_status AS ENUM ('RASCUNHO', 'ENVIADO', 'RECEBIDO', 'CANCELADO');

-- 2. TABLES

-- Companies (Multi-tenant root)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  phone TEXT,
  settings_json JSONB DEFAULT '{}'::jsonb, -- Store taxes, margins, colors
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'VENDAS',
  active BOOLEAN DEFAULT TRUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  document TEXT, -- CPF/CNPJ
  phone TEXT,
  email TEXT,
  address_full TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (CRM)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  client_id UUID REFERENCES clients(id),
  lead_name TEXT,
  phone TEXT,
  source TEXT,
  service_type service_type,
  stage lead_stage DEFAULT 'NOVO',
  priority lead_priority DEFAULT 'MEDIA',
  expected_value NUMERIC(10,2),
  next_action_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits (Medições)
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  lead_id UUID REFERENCES leads(id),
  client_id UUID REFERENCES clients(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  assigned_user_id UUID REFERENCES users(id),
  address_override TEXT,
  checklist_json JSONB DEFAULT '{}'::jsonb,
  measurements_json JSONB DEFAULT '{}'::jsonb,
  photos TEXT[],
  client_signature_file_id TEXT,
  status visit_status DEFAULT 'AGENDADA',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ESTOQUE INTELIGENTE

-- Stock Items
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  category stock_category NOT NULL,
  unit TEXT NOT NULL,
  sku TEXT,
  cost_avg NUMERIC(10,2) DEFAULT 0,
  min_level NUMERIC(10,2) DEFAULT 0,
  reorder_point NUMERIC(10,2) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 0,
  location TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotes (Orçamentos)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  lead_id UUID REFERENCES leads(id),
  client_id UUID REFERENCES clients(id),
  visit_id UUID REFERENCES visits(id),
  quote_number SERIAL,
  status quote_status DEFAULT 'RASCUNHO',
  valid_until DATE,
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount_value NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  delivery_time_days INTEGER,
  warranty_days INTEGER,
  terms_text TEXT,
  pdf_file_id TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote Items
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  type quote_item_type NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  related_stock_item_id UUID REFERENCES stock_items(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders (Pedido/Contrato)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  quote_id UUID REFERENCES quotes(id),
  client_id UUID REFERENCES clients(id),
  order_number SERIAL,
  status order_status DEFAULT 'ABERTO',
  start_date DATE,
  expected_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Orders (OS)
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  service_type service_type,
  status work_order_status DEFAULT 'CORTE',
  assigned_team UUID[],
  checklist_json JSONB DEFAULT '{}'::jsonb,
  measurements_json JSONB DEFAULT '{}'::jsonb,
  photos_before TEXT[],
  photos_after TEXT[],
  client_signature_file_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Logs (Apontamentos)
CREATE TABLE work_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  user_id UUID REFERENCES users(id),
  date DATE DEFAULT CURRENT_DATE,
  hours_worked NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ESTOQUE - MOVIMENTAÇÕES E RESERVAS

-- Stock Movements
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  type stock_movement_type NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  cost_unit NUMERIC(10,2), -- For entries
  related_work_order_id UUID REFERENCES work_orders(id),
  related_purchase_id UUID, -- Will reference purchase_orders
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Reservations (Linked to OS)
CREATE TABLE stock_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  quantity_reserved NUMERIC(10,2) NOT NULL,
  status stock_reservation_status DEFAULT 'RESERVADO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status purchase_order_status DEFAULT 'RASCUNHO',
  expected_delivery_date DATE,
  total_estimated NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  quantity NUMERIC(10,2) NOT NULL,
  unit_cost_estimated NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOM (Receita de Materiais)

CREATE TABLE service_bom_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  service_type service_type NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_bom_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  bom_template_id UUID NOT NULL REFERENCES service_bom_templates(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  quantity_formula TEXT NOT NULL, -- e.g. "area * 1.05" or "fixed: 1"
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FINANCEIRO

-- Receivables (Contas a Receber)
CREATE TABLE receivables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  client_id UUID REFERENCES clients(id),
  order_id UUID REFERENCES orders(id),
  quote_id UUID REFERENCES quotes(id),
  description TEXT NOT NULL,
  total_value NUMERIC(10,2) NOT NULL,
  installments_count INTEGER DEFAULT 1,
  payment_method payment_method,
  status payment_status DEFAULT 'ABERTO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receivable Installments
CREATE TABLE receivable_installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  paid_at TIMESTAMPTZ,
  paid_value NUMERIC(10,2),
  status payment_status DEFAULT 'ABERTO', 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payables (Contas a Pagar)
CREATE TABLE payables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  supplier_name TEXT, 
  description TEXT NOT NULL,
  category payable_category DEFAULT 'OUTROS',
  due_date DATE NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  status payment_status DEFAULT 'ABERTO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
