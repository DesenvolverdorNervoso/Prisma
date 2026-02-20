import { authService } from './auth.service';

let cachedTenantId: string | null = null;

export const tenantService = {
  getCurrentTenantId: async (): Promise<string | null> => {
    if (cachedTenantId) return cachedTenantId;
    
    const user = await authService.getUser();
    if (user?.tenant_id) {
      cachedTenantId = user.tenant_id;
      return cachedTenantId;
    }
    return null;
  },

  requireTenantId: async (): Promise<string> => {
    const tenantId = await tenantService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Tenant não identificado. Por favor, faça login novamente.');
    }
    return tenantId;
  },

  clearCache: () => {
    cachedTenantId = null;
  }
};
