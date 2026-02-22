import { profileService } from './profile.service';
import { AppError } from './appError';

let cachedTenantId: string | null = null;

export const tenantService = {
  getTenantId: async (): Promise<string> => {
    if (cachedTenantId) return cachedTenantId;
    
    const profile = await profileService.getCurrentProfile();
    if (profile?.tenant_id) {
      cachedTenantId = profile.tenant_id;
      return cachedTenantId;
    }
    
    throw new AppError('Tenant não identificado. Por favor, faça login novamente.', 'TENANT_NOT_FOUND');
  },

  requireTenantId: async (): Promise<string> => {
    return tenantService.getTenantId();
  },

  clearCache: () => {
    cachedTenantId = null;
  }
};
