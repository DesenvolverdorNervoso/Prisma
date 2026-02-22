import { supabase } from '../lib/supabaseClient';
import { tenantService } from './tenant.service';
import { TagEntityType, Tag } from '../domain/types';
import { toAppError, AppError } from './appError';
import { repositories } from '../data/repositories';

export const tagService = {
  list: async (params?: any) => {
    try {
      return await repositories.labels.list(params);
    } catch (e) {
      throw toAppError(e);
    }
  },

  create: async (data: Partial<Tag>): Promise<Tag> => {
    try {
      if (!data.entity_type) throw new AppError('Tipo de entidade é obrigatório.', 'VALIDATION');
      return await repositories.labels.create(data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  update: async (id: string, data: Partial<Tag>): Promise<Tag> => {
    try {
      return await repositories.labels.update(id, data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await repositories.labels.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  },

  /**
   * Ensures a default tag exists for a given entity type and returns its name.
   */
  ensureDefaultTag: async (type: TagEntityType): Promise<string> => {
    try {
      const tenantId = await tenantService.requireTenantId();
      
      const defaultTags: Record<TagEntityType, { name: string; color: string }> = {
        company: { name: 'Cliente PJ - Empresa', color: '#bfdbfe' },
        person_client: { name: 'Cliente PF - Consultorias e Serviços', color: '#e9d5ff' },
        candidate: { name: 'Candidatos Banco de Dados', color: '#bbf7d0' }
      };

      const { name, color } = defaultTags[type];

      // Use upsert to ensure it exists without duplication
      const { data: created, error } = await supabase
        .from('tags')
        .upsert({
          tenant_id: tenantId,
          name,
          color,
          entity_type: type,
          active: true
        }, { onConflict: 'name,tenant_id,entity_type' })
        .select('name')
        .single();

      if (error || !created) {
        throw error || new Error(`Failed to ensure default tag for ${type}`);
      }

      return created.name;
    } catch (e) {
      console.error(`Failed to ensure default tag for ${type}`, e);
      // Fallback to name if error occurs to avoid breaking flow
      const defaultTags: Record<TagEntityType, string> = {
        company: 'Cliente PJ - Empresa',
        person_client: 'Cliente PF - Consultorias e Serviços',
        candidate: 'Candidatos Banco de Dados'
      };
      return defaultTags[type];
    }
  },

  /**
   * Applies the default tag to an entity's tags array if not already present.
   */
  applyDefaultTag: async (tags: string[] | undefined, type: TagEntityType): Promise<string[]> => {
    try {
      const tagName = await tagService.ensureDefaultTag(type);
      const currentTags = tags || [];
      if (!currentTags.includes(tagName)) {
        return [...currentTags, tagName];
      }
      return currentTags;
    } catch (e) {
      throw toAppError(e);
    }
  }
};
