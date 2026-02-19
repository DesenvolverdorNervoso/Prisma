
import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Modal } from '../components/UI';
import { Lock, Mail } from 'lucide-react';
import { debugInfo } from '../config/env';

const { useNavigate } = ReactRouterDOM as any;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const success = await authService.login(email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Credenciais inválidas. Tente admin@prismarh.com / 123');
    }
    setLoading(false);
  };

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
            {error && <p className="text-sm text-red-500 text-center dark:text-red-400">{error}</p>}
            <Button type="submit" className="w-full" isLoading={loading}>
              Entrar
            </Button>
            <div className="text-center mt-4">
              <a href="#/inscription" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                Link de Inscrição Pública (Teste)
              </a>
            </div>
          </form>
          
          <div className="mt-8 flex justify-center">
            <button 
              type="button" 
              onClick={() => setShowDebug(true)}
              className="text-[10px] text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-500 transition-colors uppercase tracking-widest"
            >
              Detalhes do Ambiente
            </button>
          </div>
        </CardContent>
      </Card>

      {showDebug && (
        <Modal title="Debug de Ambiente" onClose={() => setShowDebug(false)}>
          <div className="space-y-4 text-sm font-mono text-gray-700 dark:text-gray-300">
            <div className="p-3 bg-gray-100 rounded dark:bg-gray-800 border dark:border-gray-700">
              <p className="text-xs text-gray-500 uppercase mb-1">Fonte Principal</p>
              <p className="font-bold">{debugInfo.debugSource}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-100 rounded dark:bg-gray-800 border dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase mb-1">Supabase URL</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${debugInfo.hasUrl ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-semibold">{debugInfo.hasUrl ? 'Presente' : 'Ausente'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate" title={debugInfo.urlPreview}>{debugInfo.urlPreview}</p>
                <p className="text-[10px] text-gray-400 mt-1">Fonte: {debugInfo.debugDetails.urlSource}</p>
              </div>
              
              <div className="p-3 bg-gray-100 rounded dark:bg-gray-800 border dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase mb-1">Anon Key</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${debugInfo.hasAnonKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-semibold">{debugInfo.hasAnonKey ? 'Presente' : 'Ausente'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate" title={debugInfo.keyPreview}>{debugInfo.keyPreview}</p>
                <p className="text-[10px] text-gray-400 mt-1">Fonte: {debugInfo.debugDetails.keySource}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-100 rounded dark:bg-gray-800 border dark:border-gray-700">
              <p className="text-xs text-gray-500 uppercase mb-1">Status Geral</p>
              <p className={debugInfo.hasUrl && debugInfo.hasAnonKey ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                {debugInfo.hasUrl && debugInfo.hasAnonKey ? "Configurado (useSupabase: true)" : "Configuração Incompleta"}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};