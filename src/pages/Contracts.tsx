import React, { useEffect, useState } from 'react';
import { contractsService } from '../services/contracts.service';
import { repositories } from '../data/repositories';
import { Contract, Candidate, Job, Company, PersonClient, ContractStatus } from '../domain/types';
import { 
  Button, Input, Select, TextArea, Table, TableHeader, TableRow, TableHead, TableCell, 
  Badge, Card, useToast, Modal, FormSection, Skeleton 
} from '../components/UI';
import { Plus, Trash2, FileText, User, Building2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';

export const Contracts: React.FC = () => {
  const { addToast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [personClients, setPersonClients] = useState<PersonClient[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Contract>>({ 
    status: 'Ativo',
    contractor_type: 'company',
    salary: 0,
    start_date: new Date().toISOString().split('T')[0]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractsRes, candidatesRes, jobsRes, companiesRes, personClientsRes] = await Promise.all([
        contractsService.list({ limit: 100 }),
        repositories.candidates.list({ limit: 1000 }),
        repositories.jobs.list({ limit: 1000 }),
        repositories.companies.list({ limit: 1000 }),
        repositories.personClients.list({ limit: 1000 })
      ]);

      setContracts(contractsRes.data);
      setCandidates(candidatesRes.data);
      setJobs(jobsRes.data);
      setCompanies(companiesRes.data);
      setPersonClients(personClientsRes.data);
    } catch (e) {
      addToast('error', 'Erro ao carregar dados de contratos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!formData.candidate_id || !formData.start_date || !formData.salary) {
      return addToast('warning', 'Preencha os campos obrigatórios (Candidato, Data Início, Salário).');
    }

    if (formData.contractor_type === 'company' && !formData.company_id) {
      return addToast('warning', 'Selecione a empresa contratante.');
    }

    if (formData.contractor_type === 'person_client' && !formData.person_client_id) {
      return addToast('warning', 'Selecione o cliente PF contratante.');
    }

    try {
      if (isEditing) {
        await contractsService.update(isEditing, formData);
        addToast('success', 'Contrato atualizado com sucesso!');
      } else {
        await contractsService.create(formData);
        addToast('success', 'Contrato criado com sucesso!');
      }
      setShowModal(false);
      setIsEditing(null);
      loadData();
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  const handleEdit = (contract: Contract) => {
    setFormData(contract);
    setIsEditing(contract.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este contrato?')) {
      try {
        await contractsService.remove(id);
        addToast('success', 'Contrato excluído.');
        loadData();
      } catch (e) {
        addToast('error', 'Erro ao excluir contrato.');
      }
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case 'Ativo': return <Badge variant="success">Ativo</Badge>;
      case 'Encerrado': return <Badge variant="neutral">Encerrado</Badge>;
      case 'Cancelado': return <Badge variant="error">Cancelado</Badge>;
      case 'Pendente': return <Badge variant="warning">Pendente</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Contratos</h2>
          <p className="text-slate-500 mt-1 dark:text-slate-400">Gerencie os contratos de trabalho dos seus candidatos.</p>
        </div>
        <Button onClick={() => { 
          setFormData({ 
            status: 'Ativo', 
            contractor_type: 'company', 
            salary: 0, 
            start_date: new Date().toISOString().split('T')[0] 
          }); 
          setIsEditing(null);
          setShowModal(true); 
        }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Contrato
        </Button>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden border-0 shadow-medium dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Contratante</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Salário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 float-right" /></TableCell>
                  </TableRow>
                ))
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 dark:bg-slate-800">
                        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nenhum contrato encontrado</h3>
                      <p className="text-slate-500 mt-1 mb-6 max-w-xs dark:text-slate-400">Você ainda não registrou nenhum contrato de trabalho.</p>
                      <Button onClick={() => setShowModal(true)} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Novo Contrato
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map(contract => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 dark:bg-brand-900/20">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{contract.candidate_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {contract.contractor_type === 'company' ? <Building2 className="w-4 h-4 text-slate-400" /> : <User className="w-4 h-4 text-slate-400" />}
                        <span className="text-sm text-slate-600 dark:text-slate-400">{contract.contractor_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{contract.job_title || '-'}</span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">{formatDate(contract.start_date)}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(contract.salary)}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{contract.contract_type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(contract)}>
                          <FileText className="w-4 h-4" />
                        </Button>
                        <button 
                          onClick={() => handleDelete(contract.id)} 
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {showModal && (
        <Modal 
          title={isEditing ? "Editar Contrato" : "Novo Contrato"} 
          onClose={() => setShowModal(false)} 
          size="xl"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar Contrato</Button>
            </div>
          }
        >
          <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar space-y-8">
            <FormSection title="Partes do Contrato">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select 
                  label="Candidato *" 
                  options={candidates.map(c => ({ label: c.name, value: c.id }))} 
                  value={formData.candidate_id} 
                  onChange={e => setFormData({ ...formData, candidate_id: e.target.value })} 
                  required 
                  placeholder="Selecione o candidato"
                />
                <Select 
                  label="Vaga (Opcional)" 
                  options={jobs.map(j => ({ label: j.title, value: j.id }))} 
                  value={formData.job_id || ''} 
                  onChange={e => setFormData({ ...formData, job_id: e.target.value || null })} 
                  placeholder="Selecione a vaga"
                />
                <Select 
                  label="Tipo de Contratante *" 
                  options={[
                    { label: 'Empresa (PJ)', value: 'company' },
                    { label: 'Pessoa Física (PF)', value: 'person_client' }
                  ]} 
                  value={formData.contractor_type} 
                  onChange={e => setFormData({ ...formData, contractor_type: e.target.value as any, company_id: undefined, person_client_id: undefined })} 
                  required 
                />
                {formData.contractor_type === 'company' ? (
                  <Select 
                    label="Empresa *" 
                    options={companies.map(c => ({ label: c.name, value: c.id }))} 
                    value={formData.company_id || ''} 
                    onChange={e => setFormData({ ...formData, company_id: e.target.value })} 
                    required 
                    placeholder="Selecione a empresa"
                  />
                ) : (
                  <Select 
                    label="Cliente PF *" 
                    options={personClients.map(p => ({ label: p.name, value: p.id }))} 
                    value={formData.person_client_id || ''} 
                    onChange={e => setFormData({ ...formData, person_client_id: e.target.value })} 
                    required 
                    placeholder="Selecione o cliente PF"
                  />
                )}
              </div>
            </FormSection>

            <FormSection title="Detalhes do Vínculo">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select 
                  label="Status *" 
                  options={[
                    { label: 'Ativo', value: 'Ativo' },
                    { label: 'Pendente', value: 'Pendente' },
                    { label: 'Encerrado', value: 'Encerrado' },
                    { label: 'Cancelado', value: 'Cancelado' }
                  ]} 
                  value={formData.status} 
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })} 
                  required 
                />
                <Select 
                  label="Tipo de Contrato *" 
                  options={[
                    { label: 'CLT', value: 'CLT' },
                    { label: 'PJ', value: 'PJ' },
                    { label: 'Temporário', value: 'Temporário' },
                    { label: 'Freelancer', value: 'Freelancer' },
                    { label: 'Estágio', value: 'Estágio' }
                  ]} 
                  value={formData.contract_type} 
                  onChange={e => setFormData({ ...formData, contract_type: e.target.value as any })} 
                  required 
                />
                <Input 
                  label="Salário (R$) *" 
                  type="number" 
                  step="0.01" 
                  value={formData.salary} 
                  onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })} 
                  required 
                />
                <Input 
                  label="Data de Início *" 
                  type="date" 
                  value={formData.start_date} 
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })} 
                  required 
                />
                <Input 
                  label="Data de Término (Opcional)" 
                  type="date" 
                  value={formData.end_date || ''} 
                  onChange={e => setFormData({ ...formData, end_date: e.target.value || null })} 
                />
              </div>
              <div className="mt-4">
                <TextArea 
                  label="Observações" 
                  value={formData.notes || ''} 
                  onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                  placeholder="Notas adicionais sobre o contrato..."
                  className="min-h-[100px]"
                />
              </div>
            </FormSection>
          </div>
        </Modal>
      )}
    </div>
  );
};
