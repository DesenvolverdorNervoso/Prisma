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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6 shadow-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Sucesso!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            {successMessage}
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 text-sm text-blue-800 dark:text-blue-300">
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background Pattern/Gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-50/50 to-transparent dark:from-brand-900/10 dark:to-transparent" />
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-200/20 dark:bg-brand-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/20 dark:bg-blue-600/5 rounded-full blur-[120px]" />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-600/20">P</div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">Prisma RH</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mt-0.5">Talentos & Oportunidades</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Banco de Talentos</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Cadastre seu perfil para futuras oportunidades em nossa rede.
            </p>
          </div>

          <CandidateWizard 
            mode="public" 
            onSave={handleSave} 
          />
          
          <footer className="text-center pt-8">
            <p className="text-slate-400 dark:text-slate-600 text-[10px] uppercase tracking-widest font-bold">
              &copy; {new Date().getFullYear()} Prisma RH • Sistema de Recrutamento Inteligente
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};