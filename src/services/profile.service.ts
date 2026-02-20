
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

    if (existingProfile && !fetchError) {
      return existingProfile as UserProfile;
    }

    // 2. Profile doesn't exist, let's provision it.
    // First, ensure we have the default tenant 'Prisma RH'
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', 'Prisma RH')
      .single();

    let tenantId = tenant?.id;

    if (!tenantId || tenantError) {
      // Create Default Tenant if missing
      const { data: newTenant, error: createTenantError } = await supabase
        .from('tenants')
        .insert({ name: 'Prisma RH', slug: 'prisma-rh', active: true })
        .select()
        .single();
      
      if (createTenantError || !newTenant) {
        throw new Error('Falha ao criar Tenant padrão: ' + createTenantError?.message);
      }
      tenantId = newTenant.id;
    }

    // 3. Create the Profile
    const newProfileData: Partial<UserProfile> = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
      role: 'admin', // Default to admin for the first user of this single-tenant app
      tenant_id: tenantId,
      allowed_settings: true
    };

    const { data: newProfile, error: createProfileError } = await supabase
      .from('profiles')
      .insert(newProfileData)
      .select()
      .single();

    if (createProfileError || !newProfile) {
      throw new Error('Falha ao criar Perfil: ' + createProfileError?.message);
    }

    return newProfile as UserProfile;
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
