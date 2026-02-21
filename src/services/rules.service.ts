import { repositories } from '../data/repositories';
import { Candidate, Company, PersonClient } from '../domain/types';
import { tagService } from './tag.service';

/**
 * Service to handle business rules logic
 */
export const rulesService = {
  
  ensureLabelId: async (name: string, entity_type: 'candidate' | 'company' | 'person_client', color: string = '#cbd5e1'): Promise<string> => {
    const res = await repositories.labels.list({ limit: 1000 });
    const allLabels = res.data;
    const existing = allLabels.find(l => l.name === name && l.entity_type === entity_type);
    
    if (existing) {
      return existing.id;
    }

    const newLabel = await repositories.labels.create({
      name,
      entity_type,
      color
    });
    return newLabel.id;
  },

  createCompanyWithRules: async (data: Partial<Company>): Promise<Company> => {
    // Duplication Check
    const res = await repositories.companies.list({ limit: 1000 });
    const exists = res.data.some(c => c.name.toLowerCase() === data.name?.toLowerCase());
    if (exists) {
      throw new Error("Já existe uma empresa cadastrada com este Nome Fantasia.");
    }

    return await repositories.companies.create(data);
  },

  createPersonClientWithRules: async (data: Partial<PersonClient>): Promise<PersonClient> => {
    // Duplication Check (Name + Whatsapp)
    const res = await repositories.personClients.list({ limit: 1000 });
    const exists = res.data.some(c => 
      c.name.toLowerCase() === data.name?.toLowerCase() && 
      c.whatsapp === data.whatsapp
    );
    if (exists) {
      throw new Error("Já existe um cliente PF com este Nome e WhatsApp.");
    }

    return await repositories.personClients.create(data);
  },

  upsertCandidateWithRules: async (
    data: Partial<Candidate>, 
    source: 'manual' | 'public_form'
  ): Promise<{ candidate: Candidate; isUpdate: boolean }> => {
    
    // Check duplicates first
    const res = await repositories.candidates.list({ limit: 10000 });
    const allCandidates = res.data;
    const existingCandidate = allCandidates.find(c => c.whatsapp === data.whatsapp);

    if (existingCandidate && source === 'manual') {
      // If manual creation, block duplicates explicitly (User requested this strictness)
      throw new Error("Já existe um candidato com este WhatsApp.");
    }

    // Calculate Expiration (90 days from now)
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const commonFields: Partial<Candidate> = {
      ...data,
      profile_expires_at: expiresAt, // Refresh expiration on new inscription/update
      origin: source === 'manual' ? 'Interno' : 'Link', // Updated logic
      status: 'Novo'
    };

    if (existingCandidate && source === 'public_form') {
      // Merge logic
      const defaultTag = await tagService.ensureDefaultTag('candidate');
      const updatedFields = {
        ...commonFields,
        labels: Array.from(new Set([...(existingCandidate.labels || []), ...(data.labels || []), defaultTag]))
      };
      
      const updated = await repositories.candidates.update(existingCandidate.id, updatedFields);
      return { candidate: updated, isUpdate: true };
    }

    const created = await repositories.candidates.create(commonFields); 
    
    return { candidate: created, isUpdate: false };
  }
};
