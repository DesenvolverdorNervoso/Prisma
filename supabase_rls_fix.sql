-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table if it doesn't exist
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert into tenants (e.g. creating the first tenant)
-- Drop existing policy if any to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."tenants";
CREATE POLICY "Enable insert for authenticated users" ON "public"."tenants"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to select tenants
DROP POLICY IF EXISTS "Enable select for authenticated users" ON "public"."tenants";
CREATE POLICY "Enable select for authenticated users" ON "public"."tenants"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'admin',
  tenant_id UUID REFERENCES tenants(id),
  allowed_settings BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON "public"."profiles";
CREATE POLICY "Enable insert for users based on user_id" ON "public"."profiles"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON "public"."profiles";
CREATE POLICY "Enable select for users based on user_id" ON "public"."profiles"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON "public"."profiles";
CREATE POLICY "Enable update for users based on user_id" ON "public"."profiles"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
