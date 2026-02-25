import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { repositories } from '../data/repositories';
import { rulesService } from '../services/rules.service';
import { PersonClient } from '../domain/types';
import { 
  Button, Input, Select, TextArea, Table, TableHeader, TableRow, TableHead, TableCell, 
  Card, useToast, Modal, Tabs, FormSection, Badge, Skeleton
} from '../components/UI';
import { Plus, Edit, Trash2, Search, UserPlus, FilterX } from 'lucide-react';
import { validatePersonClient } from '../domain/validators';
import { maskPhone, maskCPF, maskZip } from '../utils/format';

export const PersonClients: React.FC = () => {
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<PersonClient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // List State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Sync search state with URL
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null && urlSearch !== search) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('main');
  
  const initialFormState: Partial<PersonClient> = {
    name: '', whatsapp: '', cpf: '', birth_date: '', profession: '',
    main_service: '', notes: '', instagram: '', active: true,
    zip_code: '', neighborhood: ''
  };
  const [formData, setFormData] = useState<Partial<PersonClient>>(initialFormState);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await repositories.personClients.list({ 
        page, 
        limit: 10, 
        search,
        filters: statusFilter ? { active: statusFilter === 'true' } : undefined
      });
      setClients(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) {
      addToast('error', 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [page, search, statusFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (val) {
      setSearchParams({ search: val }, { replace: true });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleInputChange = (field: keyof PersonClient, value: any) => {
    if (field === 'whatsapp') value = maskPhone(value);
    if (field === 'cpf') value = maskCPF(value);
    if (field === 'zip_code') value = maskZip(value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (action: 'close' | 'continue') => {
    const validation = validatePersonClient(formData);
    if (!validation.valid) {
      addToast('warning', validation.error || 'Inválido');
      return;
    }

    try {
      if (isEditing) {
        await repositories.personClients.update(isEditing, formData);
        addToast('success', 'Cliente atualizado.');
      } else {
        await rulesService.createPersonClientWithRules(formData);
        addToast('success', 'Cliente criado.');
      }
      loadData();
      if (action === 'close') {
        setShowModal(false);
      }
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await repositories.personClients.remove(id);
        addToast('success', 'Cliente excluído com sucesso.');
        loadData();
      } catch (e: any) {
        addToast('error', 'Erro ao excluir cliente.');
      }
    }
  };

  const handleNew = () => {
    setFormData(initialFormState);
    setIsEditing(null);
    setActiveTab('main');
    setShowModal(true);
  };

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary-900 dark:text-dark-text">Clientes PF</h2>
          <p className="text-primary-500 mt-1 dark:text-dark-muted">Gerencie seus clientes pessoa física e serviços prestados.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">Exportar</Button>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* FILTERS & ACTIONS CARD */}
      <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-soft flex flex-col md:flex-row gap-4 items-center dark:bg-dark-card dark:border-dark-border dark:shadow-dark-soft">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400 dark:text-dark-muted" />
          <input 
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-primary-200 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder:text-slate-500"
            placeholder="Buscar por nome ou WhatsApp..." 
            value={search} 
            onChange={e => handleSearchChange(e.target.value)} 
          />
        </div>
        <div className="w-full md:w-48">
          <Select 
            options={[
              { label: 'Todos os Status', value: '' },
              { label: 'Ativos', value: 'true' },
              { label: 'Inativos', value: 'false' }
            ]}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            placeholder="Status"
          />
        </div>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden border-0 shadow-medium">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin scrollbar-thumb-primary-200 scrollbar-track-transparent">
          <Table className="min-w-[900px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[350px] sticky top-0 bg-primary-50/90 backdrop-blur-sm z-20 dark:bg-slate-900/90">Nome / WhatsApp</TableHead>
                <TableHead className="w-[250px] sticky top-0 bg-primary-50/90 backdrop-blur-sm z-20 dark:bg-slate-900/90">Serviço Principal</TableHead>
                <TableHead className="w-[150px] sticky top-0 bg-primary-50/90 backdrop-blur-sm z-20 dark:bg-slate-900/90">Status</TableHead>
                <TableHead className="w-[120px] text-right sticky top-0 right-0 bg-primary-50/90 backdrop-blur-sm z-30 dark:bg-slate-900/90">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <tbody className="divide-y divide-primary-100 dark:divide-dark-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell className="sticky right-0 bg-white/90 backdrop-blur-sm z-10 dark:bg-dark-card/90"><Skeleton className="h-8 w-full float-right" /></TableCell>
                  </TableRow>
                ))
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4 dark:bg-slate-800">
                        <FilterX className="w-8 h-8 text-primary-300 dark:text-slate-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-primary-900 dark:text-dark-text">Nenhum cliente encontrado</h3>
                      <p className="text-primary-500 mt-1 mb-6 max-w-xs dark:text-dark-muted">Não encontramos nenhum cliente com os filtros aplicados.</p>
                      <Button onClick={handleNew} variant="outline" size="sm">
                        <UserPlus className="w-4 h-4 mr-2" /> Criar Primeiro Cliente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="sticky left-0 bg-white/90 backdrop-blur-sm z-10 dark:bg-dark-card/90">
                      <div className="flex flex-col max-w-full">
                        <span className="font-semibold text-primary-900 dark:text-dark-text truncate" title={c.name}>{c.name}</span>
                        <span className="text-xs text-primary-500 dark:text-dark-muted truncate">{c.whatsapp}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-primary-700 dark:text-dark-text truncate block" title={c.main_service}>
                        {c.main_service}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.active ? 'success' : 'neutral'}>
                        {c.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-white/90 backdrop-blur-sm z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.12)] dark:bg-dark-card/90 dark:shadow-black/20">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => { setFormData(c); setIsEditing(c.id); setActiveTab('main'); setShowModal(true); }} 
                          className="p-2 text-primary-500 hover:text-brand-600 hover:bg-primary-50 rounded-lg transition-colors dark:text-dark-muted dark:hover:text-white dark:hover:bg-slate-800"
                          title="Editar Cliente"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)} 
                          className="p-2 text-primary-500 hover:text-error hover:bg-error/10 rounded-lg transition-colors dark:text-dark-muted dark:hover:text-red-400 dark:hover:bg-red-900/20"
                          title="Excluir Cliente"
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
        
        {/* Pagination */}
        <div className="p-4 border-t border-primary-100 flex items-center justify-between bg-primary-50/30 dark:bg-slate-900/30 dark:border-dark-border">
          <p className="text-sm text-primary-500 dark:text-dark-muted">
            Mostrando <span className="font-medium text-primary-900 dark:text-dark-text">{clients.length}</span> de <span className="font-medium text-primary-900 dark:text-dark-text">{total}</span> registros
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>

      {showModal && (
        <Modal 
          title={isEditing ? 'Editar Cliente PF' : 'Novo Cliente PF'}
          onClose={() => setShowModal(false)}
          size="lg"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button variant="ghost" onClick={()=>setShowModal(false)}>Cancelar</Button>
              <Button onClick={()=>handleSave('close')}>Salvar Cliente</Button>
            </div>
          }
        >
          <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <Tabs active={activeTab} onChange={setActiveTab} tabs={[{id:'main',label:'Dados Pessoais'}, {id:'details',label:'Endereço & Complementar'}]} />
            
            {activeTab === 'main' && (
              <div className="animate-in fade-in space-y-6 mt-4">
                <FormSection title="Identificação">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Input label="Nome Completo *" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} required />
                    </div>
                    <Input label="CPF" value={formData.cpf || ''} onChange={e => handleInputChange('cpf', e.target.value)} placeholder="000.000.000-00" />
                    <Input label="Data de Nascimento" type="date" value={formData.birth_date || ''} onChange={e => handleInputChange('birth_date', e.target.value)} />
                  </div>
                </FormSection>
                <FormSection title="Contato & Status">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="WhatsApp *" value={formData.whatsapp} onChange={e => handleInputChange('whatsapp', e.target.value)} required placeholder="(00) 00000-0000" />
                    <Select label="Status *" options={[{label:'Ativo',value:'true'},{label:'Inativo',value:'false'}]} value={String(formData.active)} onChange={e=>handleInputChange('active',e.target.value==='true')} required />
                  </div>
                </FormSection>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="animate-in fade-in space-y-6 mt-4">
                <FormSection title="Dados Profissionais">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Profissão" value={formData.profession || ''} onChange={e => handleInputChange('profession', e.target.value)} />
                    <Input label="Instagram" value={formData.instagram || ''} onChange={e => handleInputChange('instagram', e.target.value)} placeholder="@usuario" />
                    <div className="md:col-span-2">
                      <Input label="Serviço de Interesse Principal *" value={formData.main_service} onChange={e => handleInputChange('main_service', e.target.value)} required />
                    </div>
                  </div>
                </FormSection>
                <FormSection title="Endereço">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="CEP" value={formData.zip_code || ''} onChange={e => handleInputChange('zip_code', e.target.value)} placeholder="00000-000" />
                    <Input label="Bairro" value={formData.neighborhood || ''} onChange={e => handleInputChange('neighborhood', e.target.value)} />
                  </div>
                </FormSection>
                <FormSection title="Notas">
                  <TextArea label="Observações Internas" value={formData.notes || ''} onChange={e => handleInputChange('notes', e.target.value)} className="min-h-[100px]" placeholder="Informações adicionais sobre o cliente..." />
                </FormSection>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
