
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../domain/types';

export const profileService = {
  /**
   * Retrieves the profile for the current authenticated user.
   * If it doesn't exist, it creates one with a default tenant (Auto-provision).
   */
  getOrCreateProfile: async (user: User): Promise<UserProfile> => {
    // 1. Try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingProfile && existingProfile.tenant_id && !fetchError) {
      return existingProfile as UserProfile;
    }

    // 2. Profile doesn't exist or has no tenant. Let's provision a new one.
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
    const tenantName = `Consultoria ${userName}`;
    const tenantSlug = `${userName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;

    // Create New Tenant
    const { data: newTenant, error: createTenantError } = await supabase
      .from('tenants')
      .insert({ name: tenantName, slug: tenantSlug, active: true })
      .select()
      .single();
    
    if (createTenantError || !newTenant) {
      const msg = createTenantError?.message || 'Erro desconhecido';
      if (msg.includes('row-level security')) {
         throw new Error('Erro de Permissão (RLS): Execute o script "supabase_multitenant_rls.sql" no SQL Editor do Supabase para corrigir.');
      }
      throw new Error('Falha ao criar Tenant: ' + msg);
    }

    const tenantId = newTenant.id;

    // 3. Create or Update the Profile
    const profileData: Partial<UserProfile> = {
      id: user.id,
      email: user.email || '',
      name: userName,
      role: 'admin',
      tenant_id: tenantId,
      allowed_settings: true
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData)
      .select()
      .single();

    if (profileError || !profile) {
      const msg = profileError?.message || 'Erro desconhecido';
      throw new Error('Falha ao criar/atualizar Perfil: ' + msg);
    }

    // 4. Seed Initial Data for the NEW Tenant
    await profileService.seedTenantData(tenantId);

    return profile as UserProfile;
  },

  seedTenantData: async (tenantId: string) => {
    try {
      // Seed Tags
      const tags = [
        { name: 'Cliente PJ - Empresa', color: '#bfdbfe', entity_type: 'company', tenant_id: tenantId, active: true },
        { name: 'Cliente PF - Consultorias e Serviços', color: '#e9d5ff', entity_type: 'person_client', tenant_id: tenantId, active: true },
        { name: 'Candidatos Banco de Dados', color: '#bbf7d0', entity_type: 'candidate', tenant_id: tenantId, active: true }
      ];
      await supabase.from('tags').upsert(tags, { onConflict: 'name,tenant_id,entity_type' });

      // Seed Candidate Categories
      const candCats = [
        'Doméstica', 'Vendas', 'Administrativo', 'Rural', 'Cozinha / Auxiliar'
      ].map(name => ({ name, tenant_id: tenantId, active: true }));
      await supabase.from('candidate_categories').upsert(candCats, { onConflict: 'name,tenant_id' });

      // Seed Finance Categories
      const finCats = [
        { name: 'Receita Serviços', allowedType: 'Entrada', tenant_id: tenantId, active: true },
        { name: 'Recrutamento', allowedType: 'Entrada', tenant_id: tenantId, active: true },
        { name: 'Marketing', allowedType: 'Saída', tenant_id: tenantId, active: true },
        { name: 'Ferramentas', allowedType: 'Saída', tenant_id: tenantId, active: true },
        { name: 'Impostos', allowedType: 'Saída', tenant_id: tenantId, active: true },
        { name: 'Outros', allowedType: 'Ambos', tenant_id: tenantId, active: true }
      ];
      await supabase.from('finance_categories').upsert(finCats, { onConflict: 'name,tenant_id' });

      // Seed Services
      const services = [
        { name: 'Consultoria Individual', price_default: 150 },
        { name: 'Consultoria Empresarial', price_default: 500 },
        { name: 'Consultoria para Empreendedor', price_default: 300 },
        { name: 'Recrutamento e Seleção', price_default: 1200 },
        { name: 'Recrutamento e Seleção Freelancer', price_default: 800 },
        { name: 'Reestruturação Curricular', price_default: 80 },
        { name: 'Treinamentos Individuais', price_default: 200 },
        { name: 'Palestras', price_default: 1000 },
        { name: 'Treinamentos Corporativos', price_default: 2500 },
        { name: 'Semijóias', price_default: 50 },
        { name: 'Serviços MP', price_default: 100 },
        { name: 'Artes e Vídeos', price_default: 150 },
        { name: 'Extras', price_default: 0 }
      ].map(s => ({ ...s, tenant_id: tenantId, active: true, category: 'Geral' }));
      await supabase.from('services').upsert(services, { onConflict: 'name,tenant_id' });

    } catch (e) {
      console.error("Failed to seed tenant data", e);
    }
  },

  getCurrentProfile: async (): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return profile as UserProfile;
  }
};
