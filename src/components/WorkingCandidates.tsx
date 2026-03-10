
import React from 'react';
import { Candidate, Contract } from '../domain/types';
import { Card, Button, Table, TableHeader, TableRow, TableHead, TableCell } from './UI';
import { Phone, Edit, UserMinus, Calendar, Building2, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkingCandidatesProps {
  candidates: Candidate[];
  contracts: Contract[];
  onRemoveFromWorking: (candidateId: string) => void;
  onEdit: (candidate: Candidate) => void;
}

export const WorkingCandidates: React.FC<WorkingCandidatesProps> = ({ 
  candidates, 
  contracts,
  onRemoveFromWorking, 
  onEdit 
}) => {
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-brand-50/30 dark:bg-brand-900/10 p-6 rounded-2xl border border-brand-100 dark:border-brand-900/20">
        <h3 className="text-xl font-bold text-brand-900 dark:text-brand-400 mb-2">Candidatos em Trabalho</h3>
        <p className="text-sm text-brand-700 dark:text-brand-500">Acompanhe aqui os candidatos que possuem contratos ativos.</p>
      </div>

      <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Vaga / Contratante</TableHead>
              <TableHead>Data de Início</TableHead>
              <TableHead>Salário / Tipo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {contracts.map(contract => {
              const candidate = candidates.find(c => c.id === contract.candidate_id);
              if (!candidate) return null;
              
              return (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{candidate.name}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {candidate.whatsapp}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-brand-600 dark:text-brand-400">{contract.job_title || 'Vaga não especificada'}</span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        {contract.contractor_type === 'company' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {contract.contractor_name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="w-4 h-4" />
                      {formatDate(contract.start_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.salary)}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{contract.contract_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(candidate)} title="Editar Candidato">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" 
                        onClick={() => onRemoveFromWorking(candidate.id)}
                        title="Remover de Trabalhando (Desativar is_working)"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {contracts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400 italic">
                  Nenhum contrato ativo encontrado no momento.
                </TableCell>
              </TableRow>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};
