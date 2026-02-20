
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Modal } from '../components/UI';
import { Lock, Mail, AlertTriangle } from 'lucide-react';
import { debugInfo } from '../config/env';

const { useNavigate } = ReactRouterDOM as any;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  
  // Debug State for the optional box
  const [lastAttempt, setLastAttempt] = useState<any>(null);

  // Check if already logged in
  useEffect(() => {
    authService.isAuthenticated().then(isAuth => {
      if (isAuth) navigate('/dashboard');
    });
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLastAttempt(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // 1. Client-side Validation
    if (!cleanEmail || !cleanPassword) {
      setError('Preencha todos os campos.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setError('Formato de email inválido.');
      return;
    }

    setLoading(true);
    
    // 2. Call Auth Service (Supabase)
    const result = await authService.signIn(cleanEmail, cleanPassword);
    
    // 3. Log attempt for Debug Box
    setLastAttempt({
      timestamp: new Date().toLocaleTimeString(),
      email: cleanEmail,
      success: !result.error,
      error: result.error ? result.error.message : null
    });

    // 4. Handle Result
    if (result.error) {
      console.error("Supabase Auth Error:", result.error);
      // Requirement: Show EXACT error message
      setError(result.error.message || 'Erro desconhecido ao realizar login.');
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const maskEmail = (e: string) => {
    if (!e) return '';
    const parts = e.split('@');
    if (parts.length !== 2) return e;
    return `${parts[0].substring(0, 2)}***@${parts[1]}`;
  };

  const isSupabaseConfigured = debugInfo.hasUrl && debugInfo.hasAnonKey;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 dark:bg-dark-bg transition-colors duration-300">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="text-center space-y-2">
          <div className="w-12 h-12 bg-slate-900 rounded-lg mx-auto flex items-center justify-center mb-2 dark:bg-brand-600">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <CardTitle>Acesso ao Sistema</CardTitle>
          <p className="text-sm text-gray-500 dark:text-dark-muted">Prisma RH - Gestão de Consultorias</p>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured ? (
            <div className="bg-red-50 text-red-700 p-4 rounded text-sm text-center mb-4 border border-red-200">
              <p className="font-bold">Erro de Configuração</p>
              <p>As chaves do Supabase não foram encontradas. Verifique o arquivo .env</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  type="email" 
                  placeholder="Email corporativo" 
                  className="pl-10" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  type="password" 
                  placeholder="Senha" 
                  className="pl-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 animate-in slide-in-from-top-1">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600 font-medium break-words">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" isLoading={loading}>
                Entrar
              </Button>
              
              <div className="text-center mt-4">
                <a href="#/inscription" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                  Link de Inscrição Pública
                </a>
              </div>
            </form>
          )}
          
          <div className="mt-8 flex justify-center">
            <button 
              type="button" 
              onClick={() => setShowDebug(true)}
              className="text-[10px] text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-500 transition-colors uppercase tracking-widest"
            >
              Debug & Ambiente
            </button>
          </div>
        </CardContent>
      </Card>

      {showDebug && (
        <Modal title="Debug de Autenticação" onClose={() => setShowDebug(false)}>
          <div className="space-y-4 text-sm font-mono text-gray-700 dark:text-gray-300">
            
            {/* Environment Status */}
            <div className="p-3 bg-gray-100 rounded dark:bg-gray-800 border dark:border-gray-700">
              <p className="text-xs text-gray-500 uppercase mb-2 font-bold">Variáveis de Ambiente</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>SOURCE:</div><div className="font-bold">{debugInfo.debugSource}</div>
                <div>USE_SUPABASE:</div><div className={isSupabaseConfigured ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{isSupabaseConfigured.toString()}</div>
                <div>URL:</div><div className="truncate" title={debugInfo.urlPreview}>{debugInfo.urlPreview}</div>
              </div>
            </div>

            {/* Last Login Attempt */}
            <div className="p-3 bg-gray-100 rounded dark:bg-gray-800 border dark:border-gray-700">
              <p className="text-xs text-gray-500 uppercase mb-2 font-bold">Última Tentativa de Login</p>
              {lastAttempt ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Horário:</span>
                    <span>{lastAttempt.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span>{maskEmail(lastAttempt.email)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Resultado:</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold ${lastAttempt.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {lastAttempt.success ? 'SUCESSO' : 'ERRO'}
                    </span>
                  </div>
                  {!lastAttempt.success && (
                    <div className="mt-2 p-2 bg-red-50 text-red-600 border border-red-100 rounded break-all font-sans">
                      <strong>Erro Supabase:</strong> {lastAttempt.error}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhuma tentativa registrada nesta sessão.</p>
              )}
            </div>

            <div className="text-xs text-gray-400 text-center pt-2">
              Prisma RH - v1.0.0
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
