import React, { useState, useEffect } from 'react';
import { Candidate } from '../domain/types';
import { Button, Input, Select, TextArea, Card, useToast } from './UI';
import { 
  CheckCircle2, ArrowRight, ArrowLeft, Save, Upload, FileText, 
  Trash2, AlertCircle, Loader2, RotateCcw 
} from 'lucide-react';
import { validateCandidateStep } from '../domain/validators';
import { CANDIDATE_CATEGORIES } from '../domain/constants';
import { maskPhone } from '../utils/format';
import { storageService } from '../services/storage.service';

interface CandidateWizardProps {
  initialData?: Partial<Candidate>;
  mode: 'internal' | 'public';
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

export const CandidateWizard: React.FC<CandidateWizardProps> = ({ initialData, mode, onSave, onCancel }) => {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Candidate>>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'idle' | 'restored'>('idle');
  
  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);

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
            
            // Restore file preview if exists
            if (parsed.resume_file_url) {
              storageService.getFile(parsed.resume_file_url).then(url => {
                 if (url) setFilePreview(url);
              });
            }
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
      addToast('error', 'Formato não suportado. Use PDF ou PNG/JPG.');
      return;
    }

    setUploading(true);
    try {
      const stored = await storageService.saveFile(file);
      setFormData(prev => ({
        ...prev,
        resume_file_url: stored.id, // Store ID referencing IndexedDB
        resume_file_name: stored.name,
        resume_file_type: stored.type
      }));
      setFilePreview(stored.url);
      addToast('success', 'Arquivo anexado com sucesso!');
    } catch (err) {
      addToast('error', 'Erro ao salvar arquivo localmente.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async () => {
    if (formData.resume_file_url) {
      await storageService.removeFile(formData.resume_file_url);
      setFormData(prev => ({
        ...prev,
        resume_file_url: undefined,
        resume_file_name: undefined,
        resume_file_type: undefined
      }));
      setFilePreview(null);
    }
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
      await onSave(formData);
      // Clear draft on success
      if (!formData.id) localStorage.removeItem(DRAFT_KEY);
    } catch (err: any) {
      // Toast handled by parent usually, but fallback here
      console.error(err);
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">{mode === 'internal' ? 'Novo Cadastro' : 'Ficha de Inscrição'}</h2>
        <p className="text-slate-500">{STEPS[step-1].sub}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`flex flex-col items-center w-1/4 relative ${s.id <= step ? 'text-brand-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 z-10 bg-white
                ${s.id < step ? 'border-brand-600 bg-brand-50' : s.id === step ? 'border-brand-600 ring-4 ring-brand-50' : 'border-gray-200'}
              `}>
                {s.id < step ? <CheckCircle2 className="w-5 h-5" /> : s.id}
              </div>
              <div className="text-xs font-medium mt-2 text-center hidden md:block">{s.title}</div>
              
              {/* Connecting Line */}
              {i < STEPS.length - 1 && (
                 <div className={`absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors duration-300 ${s.id < step ? 'bg-brand-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="h-1 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-brand-600 transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <Card className="border-0 shadow-lg overflow-visible">
        <div className="p-6 md:p-8">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold text-primary-800 border-b pb-2 mb-4">Dados de Identificação</h3>
              <Input label="Nome Completo" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} required placeholder="Ex: João da Silva" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="WhatsApp" value={formData.whatsapp || ''} onChange={e => handleChange('whatsapp', e.target.value)} required placeholder="(99) 99999-9999" />
                <Input label="Data de Nascimento" type="date" value={formData.birth_date || ''} onChange={e => handleChange('birth_date', e.target.value)} required />
              </div>
              <Input label="Cidade" value={formData.city || ''} onChange={e => handleChange('city', e.target.value)} required />
              <TextArea label="Endereço Completo" value={formData.full_address || ''} onChange={e => handleChange('full_address', e.target.value)} required placeholder="Rua, Número, Bairro, CEP" />
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold text-primary-800 border-b pb-2 mb-4">Perfil Pessoal</h3>
              <Input label="Com quem você mora?" value={formData.lives_with || ''} onChange={e => handleChange('lives_with', e.target.value)} required placeholder="Ex: Pais, Esposo(a), Sozinho..." />
              <TextArea label="Cite 2 Qualidades (Pontos Fortes)" value={formData.strengths || ''} onChange={e => handleChange('strengths', e.target.value)} required placeholder="Ex: Pontualidade, Organização..." />
              <TextArea label="O que gostaria de melhorar/desenvolver?" value={formData.improvement_goal || ''} onChange={e => handleChange('improvement_goal', e.target.value)} required />
              <TextArea label="O que faz no seu tempo livre?" value={formData.free_time || ''} onChange={e => handleChange('free_time', e.target.value)} required />
            </div>
          )}
          
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold text-primary-800 border-b pb-2 mb-4">Logística e Preferências</h3>
              
              {/* CNH */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-semibold text-primary-700 mb-2">Possui CNH?</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2"><input type="radio" checked={formData.has_cnh === true} onChange={() => handleChange('has_cnh', true)} /> Sim</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={formData.has_cnh === false} onChange={() => { handleChange('has_cnh', false); handleChange('cnh_category', ''); }} /> Não</label>
                </div>
                {formData.has_cnh && (
                  <Input label="Qual Categoria?" value={formData.cnh_category || ''} onChange={e => handleChange('cnh_category', e.target.value)} placeholder="Ex: A, B, AB..." className="bg-white" />
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

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                 <div className="flex gap-4 items-center">
                    <label className="text-sm font-semibold text-primary-700 w-40">Precisa de auxílio transporte?</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.needs_transport_aid === true} onChange={() => handleChange('needs_transport_aid', true)} /> Sim</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.needs_transport_aid === false} onChange={() => handleChange('needs_transport_aid', false)} /> Não</label>
                 </div>

                 <div className="flex gap-4 items-center">
                    <label className="text-sm font-semibold text-primary-700 w-40">Possui restrição/limitação?</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.has_restrictions === true} onChange={() => handleChange('has_restrictions', true)} /> Sim</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.has_restrictions === false} onChange={() => { handleChange('has_restrictions', false); handleChange('restrictions_details', ''); }} /> Não</label>
                 </div>
                 {formData.has_restrictions && <TextArea label="Detalhes da restrição" value={formData.restrictions_details || ''} onChange={e => handleChange('restrictions_details', e.target.value)} required />}
                 
                 <div className="flex gap-4 items-center">
                    <label className="text-sm font-semibold text-primary-700 w-40">Está estudando?</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.studying === true} onChange={() => handleChange('studying', true)} /> Sim</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.studying === false} onChange={() => { handleChange('studying', false); handleChange('studying_details', ''); }} /> Não</label>
                 </div>
                 {formData.studying && <Input label="Qual curso / período?" value={formData.studying_details || ''} onChange={e => handleChange('studying_details', e.target.value)} required />}
              </div>

              <h4 className="font-semibold text-primary-800 pt-2">Interesses Profissionais</h4>
              <Select 
                label="Área de Interesse Principal" 
                options={CANDIDATE_CATEGORIES.map(c => ({label: c, value: c}))} 
                value={formData.category || ''} 
                onChange={e => handleChange('category', e.target.value)} 
              />
              <Input label="Detalhes da área de interesse" value={formData.interest_area || ''} onChange={e => handleChange('interest_area', e.target.value)} placeholder="Ex: Recepção, Vendas, Produção..." />
              
              <div>
                <label className="block text-sm font-semibold text-primary-700 mb-2">Tipo de Vaga</label>
                <div className="flex gap-4">
                  {['Estágio', 'Efetivo', 'Ambos'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-200 cursor-pointer hover:border-brand-300">
                       <input type="radio" checked={formData.job_interest_type === opt} onChange={() => handleChange('job_interest_type', opt as any)} /> 
                       {opt}
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
          )}
          
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold text-primary-800 border-b pb-2 mb-4">Experiência e Currículo</h3>
              
              <TextArea 
                label="Motivo de saída dos últimos empregos *" 
                value={formData.job_exit_reason || ''} 
                onChange={e => handleChange('job_exit_reason', e.target.value)} 
                required 
                placeholder="Descreva brevemente..."
                className="min-h-[100px]"
              />

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                 <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                   <Upload className="w-5 h-5"/> Currículo (PDF ou Imagem)
                 </h4>
                 
                 {!formData.resume_file_url ? (
                   <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-lg p-8 bg-white transition-colors hover:bg-blue-50/50">
                     {uploading ? (
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Enviando arquivo...</p>
                        </div>
                     ) : (
                        <>
                          <input type="file" id="resume-upload" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
                          <label htmlFor="resume-upload" className="cursor-pointer text-center w-full h-full block">
                            <p className="text-sm text-gray-600 font-medium mb-1">Clique para selecionar</p>
                            <p className="text-xs text-gray-400">Max 10MB (PDF, PNG, JPG)</p>
                          </label>
                        </>
                     )}
                   </div>
                 ) : (
                    <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-green-200 shadow-sm">
                       <div className="flex items-center gap-3">
                         <div className="bg-green-100 p-2 rounded text-green-700">
                            <FileText className="w-6 h-6" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-gray-800 break-all">{formData.resume_file_name}</p>
                            <p className="text-xs text-gray-500 uppercase">{formData.resume_file_type?.split('/')[1]}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         {filePreview && formData.resume_file_type?.startsWith('image/') && (
                           <a href={filePreview} target="_blank" rel="noreferrer" className="text-xs text-brand-600 underline">Ver</a>
                         )}
                         <button onClick={removeFile} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                           <Trash2 className="w-5 h-5" />
                         </button>
                       </div>
                    </div>
                 )}
              </div>

              <Input label="Link do LinkedIn / Portfólio (Opcional)" value={formData.linkedin || ''} onChange={e => handleChange('linkedin', e.target.value)} />
              
              {/* Summary Box */}
              <div className="bg-slate-100 p-4 rounded-lg text-sm text-slate-600 space-y-2 mt-4">
                 <p><strong>Nome:</strong> {formData.name}</p>
                 <p><strong>WhatsApp:</strong> {formData.whatsapp}</p>
                 <p><strong>Cidade:</strong> {formData.city}</p>
                 <p><strong>Área:</strong> {formData.category}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-3 rounded border border-orange-100">
                 <AlertCircle className="w-4 h-4 shrink-0" />
                 <span>Assim que recebermos suas respostas, seu cadastro será concluído e seu perfil ficará disponível para oportunidades por 90 dias.</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="bg-slate-50 px-8 py-5 flex items-center justify-between rounded-b-xl border-t">
          {step > 1 ? (
             <Button variant="outline" onClick={prevStep} disabled={loading}>
               <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
             </Button>
          ) : (
             <div className="flex gap-2">
                {onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}
                {!formData.id && (
                  <button onClick={handleClearDraft} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1" title="Limpar Rascunho">
                     <RotateCcw className="w-3 h-3" /> Limpar
                  </button>
                )}
             </div>
          )}

          <div className="flex items-center gap-3">
             {/* Auto-save Indicator */}
             {!formData.id && (
                <span className="text-xs text-gray-400 italic hidden md:inline-block">
                  {draftStatus === 'saving' ? 'Salvando...' : draftStatus === 'saved' ? 'Rascunho salvo' : draftStatus === 'restored' ? 'Rascunho restaurado' : ''}
                </span>
             )}

             {step < 4 ? (
               <Button onClick={nextStep} className="bg-brand-600 hover:bg-brand-700 text-white">
                 Próximo <ArrowRight className="w-4 h-4 ml-2" />
               </Button>
             ) : (
               <Button onClick={handleFinalSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white w-40">
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <><Save className="w-4 h-4 mr-2" /> {mode === 'internal' ? 'Salvar' : 'Enviar'}</>
                 )}
               </Button>
             )}
          </div>
        </div>
      </Card>
    </div>
  );
};