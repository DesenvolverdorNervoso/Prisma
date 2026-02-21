import { supabase } from '../lib/supabaseClient';
import { tenantService } from './tenant.service';
import { TagEntityType } from '../domain/types';

export const tagService = {
  /**
   * Ensures a default tag exists for a given entity type and returns its name.
   */
  ensureDefaultTag: async (type: TagEntityType): Promise<string> => {
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
      console.error(`Failed to ensure default tag for ${type}`, error);
      return name;
    }

    return created.name;
  },

  /**
   * Applies the default tag to an entity's tags array if not already present.
   */
  applyDefaultTag: async (tags: string[] | undefined, type: TagEntityType): Promise<string[]> => {
    const tagName = await tagService.ensureDefaultTag(type);
    const currentTags = tags || [];
    if (!currentTags.includes(tagName)) {
      return [...currentTags, tagName];
    }
    return currentTags;
  }
};
