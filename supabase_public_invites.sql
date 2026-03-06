-- supabase_public_invites.sql
-- Run this in your Supabase SQL Editor to ensure the table and RLS are correctly configured.

-- 1. Create public_invites table
CREATE TABLE IF NOT EXISTS public.public_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  job_id UUID REFERENCES public.job_openings(id), -- Note: jobs table is 'job_openings' in repositories
  token TEXT NOT NULL,
  mode TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.public_invites ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DROP POLICY IF EXISTS "Tenant isolation select" ON public.public_invites;
CREATE POLICY "Tenant isolation select" ON public.public_invites FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation insert" ON public.public_invites;
CREATE POLICY "Tenant isolation insert" ON public.public_invites FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation update" ON public.public_invites;
CREATE POLICY "Tenant isolation update" ON public.public_invites FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation delete" ON public.public_invites;
CREATE POLICY "Tenant isolation delete" ON public.public_invites FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- 4. Unique index for token per tenant (optional but recommended)
CREATE UNIQUE INDEX IF NOT EXISTS public_invites_token_tenant_uq_idx ON public.public_invites(token, tenant_id);
