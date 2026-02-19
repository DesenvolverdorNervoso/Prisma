import { mockDb, DEFAULT_TENANT_ID } from '../data/mockDb';
import { User } from '../domain/types';

// Mock Users with Multi-Tenant Support
const USERS: User[] = [
  {
    id: 'u1',
    email: 'admin@prismarh.com',
    name: 'Administrador',
    role: 'admin',
    tenant_id: DEFAULT_TENANT_ID,
    allowedSettings: true
  },
  {
    id: 'u2',
    email: 'colab@prismarh.com',
    name: 'Colaborador',
    role: 'colaborador',
    tenant_id: DEFAULT_TENANT_ID,
    allowedSettings: false
  }
];

export const authService = {
  login: async (email: string, password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple password check for mock
    const user = USERS.find(u => u.email === email);
    
    if (user && password === '123456') {
      const sessionData = { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id,
        exp: Date.now() + 86400000 // 24 horas
      };

      const token = btoa(JSON.stringify(sessionData));
      mockDb.setSession(token);
      return true;
    }
    return false;
  },

  logout: () => {
    mockDb.clearSession();
    window.location.hash = '#/login';
  },

  isAuthenticated: (): boolean => {
    const token = mockDb.getSession();
    if (!token) return false;
    try {
      const decoded = JSON.parse(atob(token));
      if (Date.now() > decoded.exp) {
        mockDb.clearSession();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  getUser: (): User => {
    const token = mockDb.getSession();
    if (!token) throw new Error('No session');
    return JSON.parse(atob(token)) as User;
  },

  // --- Multi-Tenant Helpers ---

  getCurrentTenantId: (): string | null => {
    try {
      const user = authService.getUser();
      return user.tenant_id || null;
    } catch {
      return null;
    }
  },

  requireTenantId: (): string => {
    const tenantId = authService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error("Tenant ID not found in session. Please login again.");
    }
    return tenantId;
  }
};