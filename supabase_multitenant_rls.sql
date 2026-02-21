-- supabase_multitenant_rls.sql

-- 1. Ensure Multi-tenant Core Tables
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'colaborador',
  tenant_id UUID REFERENCES tenants(id),
  allowed_settings BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Function to get current tenant_id
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Domain Tables Adjustment
DO $$
DECLARE
    t text;
    tables_to_adjust text[] := ARRAY[
        'companies', 
        'person_clients', 
        'candidates', 
        'candidate_categories', 
        'tags', 
        'services', 
        'jobs', 
        'job_candidates', 
        'orders', 
        'finance_transactions', 
        'finance_categories'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_adjust
    LOOP
        -- Create table if not exists (minimal structure)
        EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), created_at TIMESTAMPTZ DEFAULT NOW())', t);

        -- Add tenant_id if not exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t AND column_name = 'tenant_id'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id)', t);
        END IF;

        -- Create index if not exists
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I_tenant_id_idx ON public.%I(tenant_id)', t, t);

        -- Add name column if not exists (for tables that need UPSERT by name)
        IF t IN ('tags', 'candidate_categories', 'finance_categories', 'services') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = t AND column_name = 'name'
            ) THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN name TEXT', t);
            END IF;
            
            -- Create UNIQUE INDEX for UPSERT support (name + tenant_id)
            EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I_name_tenant_uq_idx ON public.%I(name, tenant_id)', t, t);
        END IF;
    END LOOP;
END $$;

-- 4. Backfill Logic
-- Ensure unique index for slug if not already there (for the ON CONFLICT below)
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_uq_idx ON public.tenants(slug);

-- Ensure at least one tenant exists
INSERT INTO public.tenants (name, slug, active)
SELECT 'Default', 'default', true
WHERE NOT EXISTS (SELECT 1 FROM public.tenants)
ON CONFLICT (slug) DO NOTHING;

-- Backfill tenant_id for existing rows
DO $$
DECLARE
    t text;
    default_tenant_id UUID;
    tables_to_backfill text[] := ARRAY[
        'companies', 
        'person_clients', 
        'candidates', 
        'candidate_categories', 
        'tags', 
        'services', 
        'jobs', 
        'job_candidates', 
        'orders', 
        'finance_transactions', 
        'finance_categories'
    ];
BEGIN
    SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;

    FOREACH t IN ARRAY tables_to_backfill
    LOOP
        EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, default_tenant_id);
        -- Now make it NOT NULL
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    END LOOP;
END $$;

-- 5. RLS Enablement
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
    tables_to_rls text[] := ARRAY[
        'companies', 
        'person_clients', 
        'candidates', 
        'candidate_categories', 
        'tags', 
        'services', 
        'jobs', 
        'job_candidates', 
        'orders', 
        'finance_transactions', 
        'finance_categories'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_rls
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 6. RLS Policies

-- Tenants: authenticated users can see their own tenant
DROP POLICY IF EXISTS "Users can see their own tenant" ON tenants;
CREATE POLICY "Users can see their own tenant" ON tenants
  FOR SELECT TO authenticated USING (id = public.current_tenant_id());

-- Profiles: users can see/update their own profile
DROP POLICY IF EXISTS "Users can see their own profile" ON profiles;
CREATE POLICY "Users can see their own profile" ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Domain Tables: isolation by tenant_id
DO $$
DECLARE
    t text;
    tables_to_policy text[] := ARRAY[
        'companies', 
        'person_clients', 
        'candidates', 
        'candidate_categories', 
        'tags', 
        'services', 
        'jobs', 
        'job_candidates', 
        'orders', 
        'finance_transactions', 
        'finance_categories'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_policy
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation select" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant isolation select" ON public.%I FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id())', t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation insert" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant isolation insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id())', t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation update" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant isolation update" ON public.%I FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id())', t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation delete" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant isolation delete" ON public.%I FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id())', t);
    END LOOP;
END $$;
