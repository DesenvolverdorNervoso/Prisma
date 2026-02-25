
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { candidatesService } from '../services/candidates.service';
import { Card, Button } from '../components/UI';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { CandidateWizard } from '../components/CandidateWizard';
import { Candidate } from '../domain/types';

export const PublicApply: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const tenantId = searchParams.get('t');
  const jobId = searchParams.get('j');
  const token = searchParams.get('k');

  useEffect(() => {
    if (!tenantId) {
      setErrorMessage('Link de inscrição inválido. O identificador da empresa (tenant) está ausente.');
      setStep('error');
    }
    // In Step 2, we will validate the token 'k' here via an Edge Function
  }, [tenantId]);

  const handleSave = async (formData: Partial<Candidate>) => {
    try {
      // Inject tenant_id and job_id if present
      const dataToSave = {
        ...formData,
        tenant_id: tenantId || formData.tenant_id,
        // In the future, we might want to link this candidate to a specific job directly
        // For now, we can store it in notes or a specific field if available
        internal_notes: jobId ? `Inscrição via link da vaga: ${jobId}` : formData.internal_notes
      };

      const result = await candidatesService.createFromPublicForm(dataToSave);
      
      const firstName = result.candidate.name.split(' ')[0];
      if (result.isUpdate) {
        setSuccessMessage(`Olá ${firstName}, identificamos que você já possui cadastro. Seus dados e currículo foram atualizados e sua validade renovada por 90 dias!`);
      } else {
        setSuccessMessage(`Cadastro realizado com sucesso! Obrigado, ${firstName}.`);
      }
      
      setStep('success');
    } catch (error: any) {
      console.error('Error saving public application:', error);
      // CandidateWizard already handles showing toasts for errors, 
      // but we might want to handle fatal errors here
      throw error;
    }
  };

  const handleReset = () => {
    setStep('form');
  };

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 border-red-100">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ops! Algo deu errado</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            {errorMessage}
          </p>
          <div className="bg-amber-50 p-4 rounded-lg mb-6 text-sm text-amber-800">
            Por favor, solicite um novo link ao recrutador responsável.
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Sucesso!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            {successMessage}
          </p>
          <div className="bg-blue-50 p-4 rounded-lg mb-6 text-sm text-blue-800">
            Nossa equipe de recrutamento analisará seu perfil. Caso surja uma oportunidade compatível, entraremos em contato pelo WhatsApp.
          </div>
          <Button onClick={handleReset} variant="secondary" className="w-full">
            Voltar ao início
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      {/* Header Branding */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Prisma RH</h1>
        <p className="text-slate-500 mt-2">Banco de Talentos & Oportunidades</p>
        {jobId && (
          <div className="mt-4 inline-block bg-brand-100 text-brand-700 px-4 py-1 rounded-full text-sm font-medium">
            Inscrição para Vaga Específica
          </div>
        )}
      </div>

      <CandidateWizard 
        mode="public" 
        onSave={handleSave} 
      />
      
      <p className="text-center text-slate-400 text-xs mt-12">
        &copy; {new Date().getFullYear()} Prisma RH. Todos os direitos reservados.
      </p>
    </div>
  );
};
