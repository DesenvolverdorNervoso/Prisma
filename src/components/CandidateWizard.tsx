import React, { useState, useEffect } from 'react';
import { Candidate } from '../domain/types';
import { Button, Input, Select, TextArea, Card, useToast, cn } from './UI';
import { 
  CheckCircle2, ArrowRight, ArrowLeft, Save, Upload, FileText, 
  Trash2, AlertCircle, Loader2, RotateCcw 
} from 'lucide-react';
import { validateCandidateStep } from '../domain/validators';
import { CANDIDATE_CATEGORIES } from '../domain/constants';
import { maskPhone } from '../utils/format';
import { profileService } from '../services/profile.service';
import { resumeUploadService, ResumeUploadResult } from '../services/resume-upload.service';

interface CandidateWizardProps {
  initialData?: Partial<Candidate>;
  mode: 'internal' | 'public';
  tenantId?: string; // Added for public mode file uploads
  publicToken?: string; // Added for public mode file uploads
  onSave: (data: Partial<Candidate>) => Promise<void>;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, title: 'Identificação', sub: 'Dados Pessoais e Contato' },
  { id: 2, title: 'Perfil Pessoal', sub: 'Quem é você?' },
  { id: 3, title: 'Logística', sub: 'Preferências e Disponibilidade' },
  { id: 4, title: 'Experiência', sub: 'Histórico e Currículo' }
];

const DRAFT_KEY_PREFIX = 'prisma_draft_candidate_';

export const CandidateWizard: React.FC<CandidateWizardProps> = ({ initialData, mode, tenantId, publicToken, onSave, onCancel }) => {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Candidate>>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'idle' | 'restored'>('idle');
  
  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [candidateTempId] = useState(() => crypto.randomUUID());

  // Errors for the current step
  const [errors, setErrors] = useState<Record<string, string>>({});

  const DRAFT_KEY = `${DRAFT_KEY_PREFIX}${mode}`;

  // --- Auto Draft Recovery ---
  useEffect(() => {
    // Only verify draft if we are creating new (no ID)
    if (!formData.id) {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (confirm('Encontramos um rascunho não finalizado. Deseja continuar de onde parou?')) {
            setFormData(prev => ({ ...prev, ...parsed }));
            setDraftStatus('restored');
            
            // No longer restoring file preview as it's not directly used for display
            // The 'Ver/Baixar' button will generate a signed URL from cv_url
          } else {
            localStorage.removeItem(DRAFT_KEY);
          }
        } catch (e) {}
      }
    }
  }, []);

  // --- Auto Save Logic ---
  useEffect(() => {
    if (formData.id) return; // Don't auto-save edits to existing records to local storage to avoid sync issues

    const timer = setTimeout(() => {
      if (Object.keys(formData).length > 2) { // Only save if some data exists
        setDraftStatus('saving');
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        setTimeout(() => setDraftStatus('saved'), 500);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData, DRAFT_KEY]);

  const handleChange = (field: keyof Candidate, value: any) => {
    if (field === 'whatsapp') value = maskPhone(value);
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field if exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field as string];
        return newErrs;
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'O arquivo deve ter no máximo 10MB.');
      return;
    }

    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      addToast('error', 'Formato não suportado. Use PDF, PNG ou JPG.');
      return;
    }

    setUploading(true);
    try {
      let result: ResumeUploadResult;

      if (mode === 'public') {
        if (!tenantId || !publicToken) {
          addToast('error', 'Configuração de link incompleta. Não é possível fazer upload.');
          return;
        }
        result = await resumeUploadService.uploadResumePublic(file, tenantId, publicToken, candidateTempId);
      } else {
        const effectiveTenantId = tenantId || (await profileService.getCurrentProfile())?.tenant_id;
        if (!effectiveTenantId) {
          addToast('error', 'ID do inquilino não encontrado. Não é possível fazer upload.');
          return;
        }
        // Use actual ID or Temp ID for the storage path
        const targetId = formData.id || candidateTempId;
        result = await resumeUploadService.uploadResumeInternal(file, effectiveTenantId, targetId);
      }

      setFormData(prev => ({
        ...prev,
        cv_path: result.path,
        cv_name: result.name,
        cv_mime: result.mime,
        cv_url: result.url // Store the signed URL for immediate preview
      }));

      addToast('success', 'Currículo enviado com sucesso!');
    } catch (err: any) {
      console.error("Erro ao fazer upload do currículo:", err);
      addToast('error', err.message || 'Falha no upload. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async () => {
    if (formData.cv_path) {
      try {
        await resumeUploadService.removeResume(formData.cv_path);
      } catch (err: any) {
        console.error("Erro ao remover currículo do storage:", err);
      }
    }
    setFormData(prev => ({
      ...prev,
      cv_path: undefined,
      cv_name: undefined,
      cv_mime: undefined,
      cv_url: undefined,
    }));
  };

  const validateStep = (s: number = step) => {
    const res = validateCandidateStep(s, formData);
    if (!res.valid && res.error) {
      addToast('warning', res.error);
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      // Always pass the formData which now contains the cv_url path
      await onSave(formData);
      
      // Clear draft on success
      if (!formData.id) localStorage.removeItem(DRAFT_KEY);
    } catch (err: any) {
      console.error("Erro ao salvar candidato:", err);
      addToast('error', 'Falha ao salvar dados: ' + (err.message || 'Erro no banco de dados'));
    } finally {
      setLoading(false);
    }
  };

  const handleClearDraft = () => {
    if (confirm('Deseja limpar todos os campos?')) {
      localStorage.removeItem(DRAFT_KEY);
      setFormData({});
      setStep(1);
      setDraftStatus('idle');
    }
  };

  // --- Render Helpers ---

  const renderProgress = () => (
    <div className="mb-10">
      <div className="flex justify-between items-start relative px-2">
        {/* Background Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
        
        {STEPS.map((s) => {
          const isActive = s.id === step;
          const isCompleted = s.id < step;
          
          return (
            <div key={s.id} className="flex flex-col items-center w-1/4 relative z-10">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500",
                isActive 
                  ? "border-brand-600 bg-white dark:bg-slate-900 text-brand-600 ring-4 ring-brand-500/20 scale-110" 
                  : isCompleted
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600"
              )}>
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : s.id}
              </div>
              <div className={cn(
                "text-[10px] md:text-xs font-bold mt-3 text-center uppercase tracking-wider transition-colors duration-300",
                isActive ? "text-brand-600" : isCompleted ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-600"
              )}>
                {s.title}
              </div>
              <div className="text-[9px] text-slate-400 dark:text-slate-500 text-center hidden md:block mt-0.5">
                {s.sub.split(' ')[0]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFormStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="border-b dark:border-slate-800 pb-2 mb-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Dados de Identificação</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Como podemos te identificar e entrar em contato?</p>
      </div>
      <Input label="Nome Completo" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} required placeholder="Ex: João da Silva" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="WhatsApp" value={formData.whatsapp || ''} onChange={e => handleChange('whatsapp', e.target.value)} required placeholder="(99) 99999-9999" />
        <Input label="Data de Nascimento" type="date" value={formData.birth_date || ''} onChange={e => handleChange('birth_date', e.target.value)} required />
      </div>
      <Input label="Cidade" value={formData.city || ''} onChange={e => handleChange('city', e.target.value)} required />
      <TextArea label="Endereço Completo" value={formData.full_address || ''} onChange={e => handleChange('full_address', e.target.value)} required placeholder="Rua, Número, Bairro, CEP" />
    </div>
  );

  const renderFormStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="border-b dark:border-slate-800 pb-2 mb-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Perfil Pessoal</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Conte-nos um pouco sobre quem você é.</p>
      </div>
      <Input label="Com quem você mora?" value={formData.lives_with || ''} onChange={e => handleChange('lives_with', e.target.value)} required placeholder="Ex: Pais, Esposo(a), Sozinho..." />
      <TextArea label="Cite 2 Qualidades (Pontos Fortes)" value={formData.strengths || ''} onChange={e => handleChange('strengths', e.target.value)} required placeholder="Ex: Pontualidade, Organização..." />
      <TextArea label="O que gostaria de melhorar/desenvolver?" value={formData.improvement_goal || ''} onChange={e => handleChange('improvement_goal', e.target.value)} required />
      <TextArea label="O que faz no seu tempo livre?" value={formData.free_time || ''} onChange={e => handleChange('free_time', e.target.value)} required />
    </div>
  );

  const renderFormStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="border-b dark:border-slate-800 pb-2 mb-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Logística e Preferências</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Suas disponibilidades e interesses.</p>
      </div>
      
      {/* CNH */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Possui CNH?</label>
        <div className="flex gap-6 mb-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="radio" className="w-4 h-4 text-brand-600 focus:ring-brand-500/20" checked={formData.has_cnh === true} onChange={() => handleChange('has_cnh', true)} /> 
            <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-brand-600 transition-colors">Sim</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="radio" className="w-4 h-4 text-brand-600 focus:ring-brand-500/20" checked={formData.has_cnh === false} onChange={() => { handleChange('has_cnh', false); handleChange('cnh_category', ''); }} /> 
            <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-brand-600 transition-colors">Não</span>
          </label>
        </div>
        {formData.has_cnh && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2">
            <Input label="Qual Categoria?" value={formData.cnh_category || ''} onChange={e => handleChange('cnh_category', e.target.value)} placeholder="Ex: A, B, AB..." />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select 
           label="Consome bebida alcoólica ou fuma?" 
           options={['Não', 'Às vezes', 'Sim'].map(o => ({label: o, value: o}))} 
           value={formData.alcohol_or_smokes || ''} 
           onChange={e => handleChange('alcohol_or_smokes', e.target.value)} 
        />
        <Select 
           label="Disponibilidade de Horário" 
           options={['Manhã', 'Tarde', 'Noite', 'Integral', 'Comercial', 'Turnos'].map(o => ({label: o, value: o}))} 
           value={formData.availability || ''} 
           onChange={e => handleChange('availability', e.target.value)} 
        />
      </div>

      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Precisa de auxílio transporte?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.needs_transport_aid === true} onChange={() => handleChange('needs_transport_aid', true)} /> <span className="text-sm text-slate-600 dark:text-slate-400">Sim</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.needs_transport_aid === false} onChange={() => handleChange('needs_transport_aid', false)} /> <span className="text-sm text-slate-600 dark:text-slate-400">Não</span></label>
            </div>
         </div>

         <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Possui restrição/limitação?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.has_restrictions === true} onChange={() => handleChange('has_restrictions', true)} /> <span className="text-sm text-slate-600 dark:text-slate-400">Sim</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.has_restrictions === false} onChange={() => { handleChange('has_restrictions', false); handleChange('restrictions_details', ''); }} /> <span className="text-sm text-slate-600 dark:text-slate-400">Não</span></label>
            </div>
         </div>
         {formData.has_restrictions && <TextArea label="Detalhes da restrição" value={formData.restrictions_details || ''} onChange={e => handleChange('restrictions_details', e.target.value)} required className="animate-in fade-in slide-in-from-top-2" />}
         
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Está estudando?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.studying === true} onChange={() => handleChange('studying', true)} /> <span className="text-sm text-slate-600 dark:text-slate-400">Sim</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.studying === false} onChange={() => { handleChange('studying', false); handleChange('studying_details', ''); }} /> <span className="text-sm text-slate-600 dark:text-slate-400">Não</span></label>
            </div>
         </div>
         {formData.studying && <Input label="Qual curso / período?" value={formData.studying_details || ''} onChange={e => handleChange('studying_details', e.target.value)} required className="animate-in fade-in slide-in-from-top-2" />}
      </div>

      <h4 className="font-semibold text-primary-800 dark:text-dark-text pt-2">Interesses Profissionais</h4>
      <Select 
        label="Área de Interesse Principal" 
        options={CANDIDATE_CATEGORIES.map(c => ({label: c, value: c}))} 
        value={formData.category || ''} 
        onChange={e => handleChange('category', e.target.value)} 
      />
      <Input label="Detalhes da área de interesse" value={formData.interest_area || ''} onChange={e => handleChange('interest_area', e.target.value)} placeholder="Ex: Recepção, Vendas, Produção..." />
      
      <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Tipo de Vaga</label>
        <div className="flex flex-wrap gap-3">
          {['Estágio', 'Efetivo', 'Ambos'].map(opt => (
            <label key={opt} className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer",
              formData.job_interest_type === opt 
                ? "bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800 text-brand-700 dark:text-brand-400" 
                : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-300"
            )}>
               <input type="radio" className="hidden" checked={formData.job_interest_type === opt} onChange={() => handleChange('job_interest_type', opt as any)} /> 
               <span className="text-sm font-medium">{opt}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Pretensão Salarial" type="number" value={formData.salary_expectation || ''} onChange={e => handleChange('salary_expectation', Number(e.target.value))} />
        <div className="flex items-center pt-6">
           <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
             <input type="checkbox" checked={formData.relocate || false} onChange={e => handleChange('relocate', e.target.checked)} className="w-4 h-4 text-brand-600 rounded" />
             Disponibilidade para mudar de cidade
           </label>
        </div>
      </div>
    </div>
  );

  const renderFormStep4 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="border-b dark:border-slate-800 pb-2 mb-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Experiência e Currículo</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Finalize seu perfil anexando seu currículo.</p>
      </div>
      
      <TextArea 
        label="Motivo de saída dos últimos empregos *" 
        value={formData.job_exit_reason || ''} 
        onChange={e => handleChange('job_exit_reason', e.target.value)} 
        required 
        placeholder="Descreva brevemente por que saiu das últimas empresas..."
        className="min-h-[100px]"
      />

      {/* Resume Upload - Only show if we have a token in public mode, or if it's internal mode */}
      {((mode === 'public' && publicToken) || mode === 'internal') && (
        <div className="bg-brand-50/30 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20 rounded-2xl p-6">
           <h4 className="font-bold text-brand-900 dark:text-brand-400 mb-4 flex items-center gap-2">
             <Upload className="w-5 h-5"/> Currículo (PDF ou Imagem)
           </h4>
           
           {!formData.cv_path ? (
             <div className={cn(
               "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 transition-all",
               uploading 
                ? "border-brand-300 bg-brand-50/50 dark:bg-brand-900/5" 
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-brand-400 hover:bg-brand-50/20"
             )}>
               {uploading ? (
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Enviando arquivo...</p>
                    <p className="text-xs text-slate-400 mt-1">Isso pode levar alguns segundos</p>
                  </div>
               ) : (
                  <>
                    <input type="file" id="resume-upload" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
                    <label htmlFor="resume-upload" className="cursor-pointer text-center w-full h-full block">
                      <div className="bg-brand-100 dark:bg-brand-900/30 p-3 rounded-full w-fit mx-auto mb-4 text-brand-600">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200 font-bold mb-1">Clique para selecionar</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">PDF, PNG ou JPG (Máximo 5MB)</p>
                    </label>
                  </>
               )}
             </div>
           ) : (
              <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-5 rounded-xl border border-green-200 dark:border-green-900/30 shadow-sm animate-in zoom-in-95">
                 <div className="flex items-center gap-4">
                   <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl text-green-700 dark:text-green-400">
                      <FileText className="w-6 h-6" />
                   </div>
                   <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[150px] md:max-w-xs">
                        {formData.cv_name || 'Currículo Anexado'}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
                        {formData.cv_path.split('.').pop()} • {formData.cv_mime?.split('/')[1]}
                      </p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   {formData.cv_url && (
                     <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => window.open(formData.cv_url, '_blank')}>
                      Ver
                    </Button>
                   )}
                   <button onClick={removeFile} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                     <Trash2 className="w-5 h-5" />
                   </button>
                 </div>
              </div>
           )}
        </div>
      )}

      <Input label="Link do LinkedIn / Portfólio (Opcional)" value={formData.linkedin || ''} onChange={e => handleChange('linkedin', e.target.value)} placeholder="https://linkedin.com/in/seu-perfil" />
      
      {/* Summary Box */}
      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 mt-4">
         <div className="flex justify-between text-sm">
           <span className="text-slate-500 font-medium">Candidato</span>
           <span className="text-slate-900 dark:text-slate-100 font-bold">{formData.name}</span>
         </div>
         <div className="flex justify-between text-sm">
           <span className="text-slate-500 font-medium">WhatsApp</span>
           <span className="text-slate-900 dark:text-slate-100 font-bold">{formData.whatsapp}</span>
         </div>
         <div className="flex justify-between text-sm">
           <span className="text-slate-500 font-medium">Área</span>
           <span className="text-slate-900 dark:text-slate-100 font-bold">{formData.category}</span>
         </div>
      </div>

      <div className="flex items-start gap-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
         <AlertCircle className="w-5 h-5 shrink-0" />
         <span className="leading-relaxed">Assim que recebermos suas respostas, seu cadastro será concluído e seu perfil ficará disponível para oportunidades por 90 dias.</span>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto">
      {renderProgress()}

      <Card className="border-0 shadow-2xl overflow-visible bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 rounded-3xl">
        <div className="p-6 md:p-10">
          {step === 1 && renderFormStep1()}
          {step === 2 && renderFormStep2()}
          {step === 3 && renderFormStep3()}
          {step === 4 && renderFormStep4()}
        </div>
        
        {/* Footer Actions */}
        <div className="bg-slate-50/50 dark:bg-slate-950/50 px-8 py-6 flex items-center justify-between rounded-b-3xl border-t dark:border-slate-800/60">
          {step > 1 ? (
             <Button variant="outline" onClick={prevStep} disabled={loading} className="rounded-xl border-slate-200 dark:border-slate-800">
               <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
             </Button>
          ) : (
             <div className="flex gap-2">
                {onCancel && <Button variant="ghost" onClick={onCancel} className="text-slate-500">Cancelar</Button>}
                {!formData.id && (
                  <button onClick={handleClearDraft} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors" title="Limpar Rascunho">
                     <RotateCcw className="w-3 h-3" /> Limpar
                  </button>
                )}
             </div>
          )}

          <div className="flex items-center gap-4">
             {/* Auto-save Indicator */}
             {!formData.id && (
                <span className="text-[10px] text-slate-400 italic hidden md:inline-block uppercase tracking-widest font-bold">
                  {draftStatus === 'saving' ? 'Salvando...' : draftStatus === 'saved' ? 'Salvo' : draftStatus === 'restored' ? 'Restaurado' : ''}
                </span>
             )}

             {step < 4 ? (
               <Button onClick={nextStep} className="bg-brand-600 hover:bg-brand-700 text-white px-8 rounded-xl shadow-lg shadow-brand-600/20">
                 Próximo <ArrowRight className="w-4 h-4 ml-2" />
               </Button>
             ) : (
               <Button onClick={handleFinalSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-8 rounded-xl shadow-lg shadow-green-600/20 min-w-[140px]">
                 {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                    <><Save className="w-4 h-4 mr-2" /> {mode === 'internal' ? 'Salvar' : 'Finalizar'}</>
                 )}
               </Button>
             )}
          </div>
        </div>
      </Card>
    </div>
  );
};
