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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Link inválido ou expirado</h2>
          <p className="text-slate-600">
            O link que você acessou não é válido ou já expirou. Por favor, solicite um novo link de cadastro.
          </p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Cadastro concluído!</h2>
            <p className="text-slate-600">
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
    <div className="min-h-screen bg-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Trabalhe Conosco</h1>
          <p className="text-slate-600">Preencha os dados abaixo para se candidatar às nossas vagas.</p>
        </div>
        
        <CandidateWizard mode="public" tenantId={t || undefined} onSave={handleSave} />
      </div>
    </div>
  );
};
