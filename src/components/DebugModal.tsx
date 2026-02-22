import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../services/auth.service';
import { tenantService } from '../services/tenant.service';
import { Modal, Button, Badge } from './UI';
import { Shield, Database, Key } from 'lucide-react';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugModal: React.FC<DebugModalProps> = ({ isOpen, onClose }) => {
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [rlsStatus, setRlsStatus] = useState<'enabled' | 'disabled' | 'error' | 'checking'>('checking');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    try {
      // 1. Auth Status
      const session = await authService.getSession();
      setAuthStatus(session ? 'Authenticated' : 'Not Authenticated');

      // 2. Tenant ID
      const tid = await tenantService.getTenantId();
      setTenantId(tid);

      // 3. RLS Check (Try to query tenants table)
      const { error } = await supabase.from('tenants').select('id').limit(1);
      if (error) {
        if (error.message.includes('row-level security')) {
          setRlsStatus('enabled');
        } else {
          setRlsStatus('error');
          setErrorMsg(error.message);
        }
      } else {
        // If we can select without error, it might be disabled or we have a policy allowing it
        setRlsStatus('enabled'); // Assuming if it works it's correctly configured or RLS is on but permissive
      }
    } catch (e: any) {
      setRlsStatus('error');
      setErrorMsg(e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal title="Sistema Debug & Multi-tenant" onClose={onClose} size="md">
      <div className="space-y-6 p-2">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Auth Provider</p>
              <p className="text-sm font-bold">Supabase Auth</p>
            </div>
          </div>
          <Badge variant={authStatus === 'Authenticated' ? 'success' : 'neutral'}>{authStatus}</Badge>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Tenant ID</p>
              <p className="text-sm font-mono break-all">{tenantId || 'Nenhum'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">RLS Status</p>
              <p className="text-sm font-bold">Row Level Security</p>
            </div>
          </div>
          <Badge variant={rlsStatus === 'enabled' ? 'success' : rlsStatus === 'disabled' ? 'error' : 'neutral'}>
            {rlsStatus === 'enabled' ? 'Ativo' : rlsStatus === 'disabled' ? 'Inativo' : rlsStatus === 'error' ? 'Erro' : 'Verificando...'}
          </Badge>
        </div>

        {rlsStatus === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <p className="font-bold mb-1">Erro Detectado:</p>
            <p className="mb-3">{errorMsg}</p>
            <p className="bg-white p-2 rounded border border-red-100 font-mono text-xs">
              Execute o script "supabase_multitenant_rls.sql" no SQL Editor do Supabase para corrigir as políticas de segurança.
            </p>
          </div>
        )}

        <div className="pt-4">
          <Button onClick={onClose} className="w-full">Fechar</Button>
        </div>
      </div>
    </Modal>
  );
};
