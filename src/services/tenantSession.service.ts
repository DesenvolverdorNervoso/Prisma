import { supabase } from "../lib/supabaseClient";
import { UserProfile } from "../domain/types";
import { AppError } from "./appError";

interface TenantSession {
  tenantId: string | null;
  profile: UserProfile | null;
}

const initialState: TenantSession = {
  tenantId: null,
  profile: null,
};

let currentSession: TenantSession = { ...initialState };
const subscribers: ((session: TenantSession) => void)[] = [];

const publish = () => {
  subscribers.forEach((listener) => listener(currentSession));
};

export const tenantSessionService = {
  async init(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn("TenantSessionService: No user found, clearing session.");
      this.clear();
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      this.clear();
      throw new AppError("Erro ao carregar perfil do usuário.", "AUTH_ERROR");
    }

    if (!profile || !profile.tenant_id) {
      console.error("Profile or tenant_id not found for user:", user.id);
      this.clear();
      throw new AppError("Tenant ID não encontrado para o usuário.", "AUTH_ERROR");
    }

    currentSession = {
      tenantId: profile.tenant_id,
      profile: profile as UserProfile,
    };
    console.log("TenantSessionService initialized:", currentSession);
    publish();
  },

  getTenantId(): string {
    if (!currentSession.tenantId) {
      throw new AppError("Tenant ID não disponível. Faça login novamente.", "AUTH_ERROR");
    }
    return currentSession.tenantId;
  },

  getProfile(): UserProfile {
    if (!currentSession.profile) {
      throw new AppError("Perfil do usuário não disponível. Faça login novamente.", "AUTH_ERROR");
    }
    return currentSession.profile;
  },

  clear(): void {
    console.log("TenantSessionService cleared.");
    currentSession = { ...initialState };
    publish();
  },

  subscribe(listener: (session: TenantSession) => void): () => void {
    subscribers.push(listener);
    return () => {
      const index = subscribers.indexOf(listener);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  },

  getCurrentSession(): TenantSession {
    return { ...currentSession };
  },
};
