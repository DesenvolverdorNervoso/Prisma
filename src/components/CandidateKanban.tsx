
import React from 'react';
import { Candidate, Job, JobCandidate, Contract } from '../domain/types';
import { CANDIDATE_STATUS_OPTIONS } from '../domain/constants';
import { Card, Badge, Button } from './UI';
import { Phone, MapPin, Briefcase, Edit } from 'lucide-react';

interface CandidateKanbanProps {
  candidates: Candidate[];
  jobs: Job[];
  jobLinks: JobCandidate[];
  contracts: Contract[];
  onStatusChange: (candidateId: string, newStatus: any) => void;
  onEdit: (candidate: Candidate) => void;
}

export const CandidateKanban: React.FC<CandidateKanbanProps> = ({ 
  candidates, 
  jobs, 
  jobLinks, 
  contracts,
  onStatusChange, 
  onEdit 
}) => {
  const columns = CANDIDATE_STATUS_OPTIONS;

  const getCandidateJob = (candidateId: string) => {
    const link = jobLinks.find(l => l.candidate_id === candidateId);
    if (!link) return null;
    return jobs.find(j => j.id === link.job_id);
  };

  const hasActiveContract = (candidateId: string) => {
    return contracts.some(c => c.candidate_id === candidateId);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 min-h-[600px] -mx-4 px-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
      {columns.map(status => {
        const columnCandidates = candidates.filter(c => c.status === status);
        
        return (
          <div key={status} className="flex-shrink-0 w-80 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{status}</h3>
                <Badge variant="neutral" className="rounded-full px-2 py-0.5 text-[10px]">
                  {columnCandidates.length}
                </Badge>
              </div>
            </div>

            <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/60 space-y-3">
              {columnCandidates.map(candidate => {
                const job = getCandidateJob(candidate.id);
                const activeContract = hasActiveContract(candidate.id);
                
                return (
                  <Card key={candidate.id} className="p-4 hover:shadow-md transition-all border-slate-200 dark:border-slate-800 group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors">
                          {candidate.name}
                        </h4>
                        {activeContract && (
                          <Badge variant="success" className="text-[8px] py-0 px-1 h-3.5 w-fit border-green-200 bg-green-50 text-green-700">
                            Contrato Ativo
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(candidate)} className="h-7 w-7 p-0">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        <span>{candidate.whatsapp}</span>
                      </div>
                      
                      {candidate.city && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          <span>{candidate.city}</span>
                        </div>
                      )}

                      {candidate.category && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                          </div>
                          <span className="font-medium text-brand-700 dark:text-brand-400">{candidate.category}</span>
                        </div>
                      )}

                      {job && (
                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-bold">
                            <Briefcase className="w-3 h-3" />
                            <span className="truncate">{job.title}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <select 
                        className="w-full text-[10px] uppercase tracking-wider font-bold bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1.5 px-2 focus:ring-1 focus:ring-brand-500 cursor-pointer"
                        value={candidate.status}
                        onChange={(e) => onStatusChange(candidate.id, e.target.value)}
                      >
                        {columns.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </Card>
                );
              })}
              
              {columnCandidates.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Vazio</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
