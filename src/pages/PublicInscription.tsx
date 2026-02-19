import React, { useState } from 'react';
import { candidatesService } from '../services/candidates.service';
import { Card, Button } from '../components/UI';
import { CheckCircle2 } from 'lucide-react';
import { CandidateWizard } from '../components/CandidateWizard';
import { Candidate } from '../domain/types';

export const PublicInscription: React.FC = () => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = async (formData: Partial<Candidate>) => {
    // Use the dedicated service for public form logic
    const result = await candidatesService.createFromPublicForm(formData);
    
    const firstName = result.candidate.name.split(' ')[0];
    if (result.isUpdate) {
      setSuccessMessage(`Olá ${firstName}, identificamos que você já possui cadastro. Seus dados e currículo foram atualizados e sua validade renovada por 90 dias!`);
    } else {
      setSuccessMessage(`Cadastro realizado com sucesso! Obrigado, ${firstName}.`);
    }
    
    setStep('success');
  };

  const handleReset = () => {
    setStep('form');
  };

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