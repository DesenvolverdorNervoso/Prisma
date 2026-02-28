import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CandidateWizard } from '../components/CandidateWizard';
import { Card, Button, useToast } from '../components/UI';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Candidate } from '../domain/types';

export const PublicCandidateSignup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const [success, setSuccess] = useState(false);

  const t = searchParams.get('t');
  const token = searchParams.get('token');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const isValid = t && token && supabaseUrl;

  const handleSave = async (formData: Partial<Candidate>) => {
    const endpoint = `${supabaseUrl}/functions/v1/create-candidate-from-link`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: t,
          public_token: token,
          data: formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMsg = result.error || result.message || 'Erro ao processar cadastro.';
        
        if (response.status === 401 || response.status === 403) {
          errorMsg = 'Permissão negada no cadastro público. Verifique Edge Function e Service Role.';
        } else if (result.error === 'invalid_token' || result.message?.includes('Link inválido')) {
          errorMsg = 'Link inválido ou expirado';
        }

        addToast('error', errorMsg);
        throw new Error(errorMsg);
      }

      setSuccess(true);
    } catch (error: any) {
      console.error('Public signup error:', error);
      // Wizard handles the error if we throw it
      throw error;
    }
  };

  if (!isValid) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Link inválido ou expirado</h2>
          <p className="text-slate-600 dark:text-slate-400">
            O link que você acessou não é válido ou já expirou. Por favor, solicite um novo link de cadastro.
          </p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cadastro concluído!</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Seus dados foram enviados com sucesso. Nossa equipe entrará em contato em breve.
            </p>
          </div>
          <Button onClick={() => window.close()} className="w-full">
            Fechar
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
          <div className="hidden md:block">
            <span className="text-xs text-slate-400 font-medium">Cadastro de Candidato</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Trabalhe Conosco</h2>
            <div className="flex flex-col items-center gap-2">
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Preencha seus dados para entrar em nosso banco de talentos.
              </p>
              <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-800/50">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider">Seu perfil fica disponível por 90 dias</span>
              </div>
            </div>
          </div>
          
          <CandidateWizard 
            mode="public" 
            tenantId={t || undefined} 
            publicToken={token || undefined}
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
