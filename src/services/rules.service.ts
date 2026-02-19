import { repositories } from '../data/repositories';
import { Candidate, Company, PersonClient } from '../domain/types';

/**
 * Service to handle business rules logic
 */
export const rulesService = {
  
  ensureLabelId: async (name: string, entityType: 'candidate' | 'company' | 'person_client', color: string = '#cbd5e1'): Promise<string> => {
    const res = await repositories.labels.list({ limit: 1000 });
    const allLabels = res.data;
    const existing = allLabels.find(l => l.name === name && l.entityType === entityType);
    
    if (existing) {
      return existing.id;
    }

    const newLabel = await repositories.labels.create({
      name,
      entityType,
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

    const labelId = await rulesService.ensureLabelId('Cliente PJ - Empresa', 'company', '#bfdbfe'); 
    
    const labels = data.labels || [];
    if (!labels.includes(labelId)) {
      labels.push(labelId);
    }

    return await repositories.companies.create({ ...data, labels });
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

    const labelId = await rulesService.ensureLabelId('Cliente PF - Consultorias e Serviços', 'person_client', '#e9d5ff'); 
    
    const labels = data.labels || [];
    if (!labels.includes(labelId)) {
      labels.push(labelId);
    }

    return await repositories.personClients.create({ ...data, labels });
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

    const labelId = await rulesService.ensureLabelId('Candidatos Banco de Dados', 'candidate', '#bbf7d0'); 
    
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
      const updatedFields = {
        ...commonFields,
        labels: Array.from(new Set([...(existingCandidate.labels || []), ...(data.labels || []), labelId]))
      };
      
      const updated = await repositories.candidates.update(existingCandidate.id, updatedFields);
      return { candidate: updated, isUpdate: true };
    }

    const created = await repositories.candidates.create({
      ...commonFields,
      labels: data.labels ? [...data.labels, labelId] : [labelId],
    } as Candidate); 
    
    return { candidate: created, isUpdate: false };
  }
};