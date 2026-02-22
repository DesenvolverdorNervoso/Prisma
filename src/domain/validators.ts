import { Candidate, Company, Job, Order, FinanceTransaction, PersonClient } from '../domain/types';

// Helper to clean non-numeric characters
export const cleanNumber = (value: string) => value.replace(/\D/g, '');

// Normalization
export const normalizePhone = (phone: string) => cleanNumber(phone);

// WhatsApp Validation
export const validatePhone = (phone: string) => {
  const clean = normalizePhone(phone);
  // Brazil mobile phones usually 11 digits (DDD + 9 + 8 digits), landlines 10.
  // Allowing 10 or 11.
  return clean.length >= 10 && clean.length <= 11;
};

// Money Validation
export const validateMoney = (value: number | undefined | null) => {
  return value !== undefined && value !== null && value > 0;
};

// Required String Validation
export const isRequired = (value: string | undefined | null) => {
  return !!value?.trim();
};

// Generic Validation Result
export type ValidationResult = { valid: boolean; error?: string };

// --- ENTITY SPECIFIC VALIDATORS ---

// Updated for Premium Wizard Steps
export const validateCandidateStep = (step: number, data: Partial<Candidate>): ValidationResult => {
  if (step === 1) {
    if (!data.name?.trim()) return { valid: false, error: 'O Nome Completo é obrigatório.' };
    if (!data.birth_date) return { valid: false, error: 'A Data de Nascimento é obrigatória.' };
    if (!data.whatsapp) return { valid: false, error: 'O WhatsApp é obrigatório.' };
    if (!validatePhone(data.whatsapp)) return { valid: false, error: 'WhatsApp inválido.' };
    if (!data.full_address?.trim()) return { valid: false, error: 'O Endereço completo é obrigatório.' };
    if (!data.city?.trim()) return { valid: false, error: 'A Cidade é obrigatória.' };
  }

  if (step === 2) {
    if (!data.lives_with?.trim()) return { valid: false, error: 'Informe com quem você mora.' };
    if (!data.strengths?.trim()) return { valid: false, error: 'Cite pelo menos dois pontos fortes.' };
    if (!data.improvement_goal?.trim()) return { valid: false, error: 'Cite algo que gostaria de melhorar.' };
    if (!data.free_time?.trim()) return { valid: false, error: 'Informe o que faz no tempo livre.' };
  }

  if (step === 3) {
    if (data.has_cnh && !data.cnh_category) return { valid: false, error: 'Informe a categoria da CNH.' };
    if (!data.alcohol_or_smokes) return { valid: false, error: 'Campo álcool/cigarro obrigatório.' };
    if (!data.availability) return { valid: false, error: 'Informe a disponibilidade de horário.' };
    if (!data.category) return { valid: false, error: 'Selecione a área de interesse principal.' };
    if (data.has_restrictions && !data.restrictions_details) return { valid: false, error: 'Informe os detalhes da restrição.' };
    if (data.studying && !data.studying_details) return { valid: false, error: 'Informe o curso/período.' };
    if (!data.job_interest_type) return { valid: false, error: 'Selecione o tipo de vaga.' };
  }

  if (step === 4) {
    if (!data.job_exit_reason?.trim()) return { valid: false, error: 'Informe o motivo de saída dos últimos empregos.' };
    // Check file if creating new (optional if editing existing that already has one, but good to enforce for new)
    // For now, we make resume optional to allow saving without it if needed, or enforce in UI
  }

  return { valid: true };
};

export const validateCandidate = (data: Partial<Candidate>): ValidationResult => {
  // Global validation (all steps)
  for (let i = 1; i <= 4; i++) {
    const res = validateCandidateStep(i, data);
    if (!res.valid) return res;
  }
  return { valid: true };
};

export const validateCompany = (data: Partial<Company>): ValidationResult => {
  if (!data.name?.trim()) return { valid: false, error: 'O Nome Fantasia é obrigatório.' };
  if (!data.contact_person?.trim()) return { valid: false, error: 'A Pessoa de Contato é obrigatória.' };
  if (!data.city?.trim()) return { valid: false, error: 'A Cidade é obrigatória.' };
  
  if (!data.whatsapp) return { valid: false, error: 'O WhatsApp é obrigatório.' };
  if (!validatePhone(data.whatsapp)) return { valid: false, error: 'WhatsApp inválido. Deve ter 10 ou 11 dígitos numéricos.' };

  return { valid: true };
};

export const validatePersonClient = (data: Partial<PersonClient>): ValidationResult => {
  if (!data.name?.trim()) return { valid: false, error: 'O Nome é obrigatório.' };
  if (!data.main_service?.trim()) return { valid: false, error: 'O Interesse Principal é obrigatório.' };

  if (!data.whatsapp) return { valid: false, error: 'O WhatsApp é obrigatório.' };
  if (!validatePhone(data.whatsapp)) return { valid: false, error: 'WhatsApp inválido. Deve ter 10 ou 11 dígitos numéricos.' };

  return { valid: true };
};

export const validateJob = (data: Partial<Job>): ValidationResult => {
  if (!data.title?.trim()) return { valid: false, error: 'O Título da Vaga é obrigatório.' };
  if (!data.company_id) return { valid: false, error: 'Selecione uma Empresa.' };
  if (!data.category) return { valid: false, error: 'Selecione uma Categoria.' };
  
  // Requirement check: Ensure at least one char
  if (!data.requirements?.trim()) return { valid: false, error: 'Defina pelo menos um requisito para a vaga.' };

  return { valid: true };
};

export const validateOrder = (data: Partial<Order>): ValidationResult => {
  if (!data.client_id) return { valid: false, error: 'O Cliente é obrigatório.' };
  if (!data.service_id) return { valid: false, error: 'O Serviço é obrigatório.' };
  
  if (data.value === undefined || data.value === null) return { valid: false, error: 'O Valor é obrigatório.' };
  if (data.value <= 0) return { valid: false, error: 'O Valor deve ser maior que zero.' };
  
  if (!data.date) return { valid: false, error: 'A Data é obrigatória.' };

  return { valid: true };
};

export const validateFinance = (data: Partial<FinanceTransaction>): ValidationResult => {
  if (!data.description?.trim()) return { valid: false, error: 'A Descrição é obrigatória.' };
  if (!data.category) return { valid: false, error: 'A Categoria é obrigatória.' };
  if (!data.type) return { valid: false, error: 'O Tipo (Entrada/Saída) é obrigatório.' };
  
  if (data.value === undefined || data.value === null) return { valid: false, error: 'O Valor é obrigatório.' };
  if (data.value <= 0) return { valid: false, error: 'O Valor deve ser positivo.' };

  if (!data.date) return { valid: false, error: 'A Data é obrigatória.' };

  return { valid: true };
};