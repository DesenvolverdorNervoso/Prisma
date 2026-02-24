import React, { useEffect, useState } from 'react';
import { companiesService } from '../services/companies.service';
import { Company, CompanyHistory } from '../domain/types';
import { 
  Button, Input, Select, Table, TableHeader, TableRow, TableHead, TableCell, 
  Card, useToast, Modal, Tabs, FormSection, Badge 
} from '../components/UI';
import { Plus, Edit, Trash2, Search, Clock } from 'lucide-react';
import { validateCompany } from '../domain/validators';
import { maskPhone, maskCNPJ, maskZip } from '../utils/format';

export const Companies: React.FC = () => {
  const { addToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // List State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('main');
  
  const initialFormState: Partial<Company> = {
    name: '', social_reason: '', cnpj: '', contact_person: '', 
    whatsapp: '', landline: '', city: '', neighborhood: '', zip_code: '',
    website: '', instagram: '', internal_rep: '', classification: 'B', 
    active: true, notes: '', history: []
  };
  const [formData, setFormData] = useState<Partial<Company>>(initialFormState);
  
  // History temp input
  const [newHistoryNote, setNewHistoryNote] = useState('');

  const loadData = async () => {
    try {
      const result = await companiesService.list({ page, limit: 10, search });
      setCompanies(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) {
      addToast('error', 'Erro ao carregar empresas.');
    }
  };

  useEffect(() => { loadData(); }, [page, search]);

  const handleInputChange = (field: keyof Company, value: any) => {
    if (field === 'whatsapp' || field === 'landline') value = maskPhone(value);
    if (field === 'cnpj') value = maskCNPJ(value);
    if (field === 'zip_code') value = maskZip(value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addHistory = () => {
    if (!newHistoryNote.trim()) return;
    const newEntry: CompanyHistory = {
      date: new Date().toISOString(),
      note: newHistoryNote,
      user: 'Admin' 
    };
    setFormData(prev => ({ ...prev, history: [newEntry, ...(prev.history || [])] }));
    setNewHistoryNote('');
  };

  const handleSave = async (action: 'close' | 'continue' | 'new') => {
    const validation = validateCompany(formData);
    if (!validation.valid) {
      addToast('warning', validation.error || 'Inválido');
      return;
    }

    try {
      if (isEditing) {
        await companiesService.update(isEditing, formData);
        addToast('success', 'Empresa atualizada.');
      } else {
        await companiesService.create(formData);
        addToast('success', 'Empresa criada.');
      }
      
      loadData();

      if (action === 'close') {
        setShowModal(false);
        setIsEditing(null);
      } else if (action === 'new') {
        setIsEditing(null);
        setFormData(initialFormState);
        setActiveTab('main');
      }
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza?')) {
      try {
        await companiesService.delete(id);
        addToast('success', 'Excluído.');
        loadData();
      } catch (e: any) {
        addToast('error', e.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Empresas</h2>
        <Button onClick={() => { setIsEditing(null); setFormData(initialFormState); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Empresa
        </Button>
      </div>

      <div className="flex bg-white p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar empresa..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <tbody>
            {companies.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.social_reason}</div>
                  </div>
                </TableCell>
                <TableCell>{c.contact_person}</TableCell>
                <TableCell>{c.whatsapp}</TableCell>
                <TableCell>{c.city}</TableCell>
                <TableCell><Badge variant="neutral">{c.classification || 'C'}</Badge></TableCell>
                <TableCell><Badge variant={c.active ? 'success' : 'error'}>{c.active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                <TableCell className="flex gap-2">
                   <Button variant="ghost" size="sm" onClick={() => { setFormData(c); setIsEditing(c.id); setActiveTab('main'); setShowModal(true); }}><Edit className="w-4 h-4" /></Button>
                   <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Pagination (Simplified) */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <div>Total: {total}</div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Ant</Button>
           <Button variant="outline" size="sm" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>Prox</Button>
        </div>
      </div>

      {showModal && (
        <Modal
          title={isEditing ? 'Editar Empresa' : 'Nova Empresa'}
          onClose={() => setShowModal(false)}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="outline" onClick={() => handleSave('continue')}>Salvar e continuar</Button>
              <Button onClick={() => handleSave('close')}>Salvar</Button>
            </>
          }
        >
          <Tabs 
            active={activeTab} 
            onChange={setActiveTab}
            tabs={[
              { id: 'main', label: 'Dados Principais' },
              { id: 'address', label: 'Endereço & Social' },
              { id: 'internal', label: 'Interno & Histórico' }
            ]} 
          />

          {activeTab === 'main' && (
            <div className="animate-in fade-in">
              <FormSection title="Identificação Corporativa">
                <Input label="Nome Fantasia" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} required />
                <Input label="Razão Social" value={formData.social_reason || ''} onChange={e => handleInputChange('social_reason', e.target.value)} />
                <Input label="CNPJ" value={formData.cnpj || ''} onChange={e => handleInputChange('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
                <Select label="Status" options={[{label: 'Ativa', value: 'true'}, {label: 'Inativa', value: 'false'}]} value={String(formData.active)} onChange={e => handleInputChange('active', e.target.value === 'true')} />
              </FormSection>
              <FormSection title="Contato Principal">
                <Input label="Pessoa de Contato" value={formData.contact_person} onChange={e => handleInputChange('contact_person', e.target.value)} required />
                <Input label="WhatsApp" value={formData.whatsapp} onChange={e => handleInputChange('whatsapp', e.target.value)} required />
                <Input label="Telefone Fixo" value={formData.landline || ''} onChange={e => handleInputChange('landline', e.target.value)} />
              </FormSection>
            </div>
          )}

          {activeTab === 'address' && (
            <div className="animate-in fade-in">
              <FormSection title="Localização">
                 <Input label="CEP" value={formData.zip_code || ''} onChange={e => handleInputChange('zip_code', e.target.value)} />
                 <Input label="Cidade" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} required />
                 <Input label="Bairro" value={formData.neighborhood || ''} onChange={e => handleInputChange('neighborhood', e.target.value)} />
              </FormSection>
              <FormSection title="Presença Digital">
                 <Input label="Website" value={formData.website || ''} onChange={e => handleInputChange('website', e.target.value)} />
                 <Input label="Instagram" value={formData.instagram || ''} onChange={e => handleInputChange('instagram', e.target.value)} />
              </FormSection>
            </div>
          )}

          {activeTab === 'internal' && (
            <div className="animate-in fade-in">
              <FormSection title="Gestão da Conta">
                <Input label="Responsável Interno (Account)" value={formData.internal_rep || ''} onChange={e => handleInputChange('internal_rep', e.target.value)} />
                <Select label="Classificação" options={[{label: 'A - Alta Prioridade', value: 'A'}, {label: 'B - Padrão', value: 'B'}, {label: 'C - Baixa', value: 'C'}]} value={formData.classification || 'B'} onChange={e => handleInputChange('classification', e.target.value as any)} />
              </FormSection>
              
              <div className="mt-6 border-t pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4"/> Histórico de Relacionamento</h4>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="Adicionar nova nota..." value={newHistoryNote} onChange={e => setNewHistoryNote(e.target.value)} className="flex-1" />
                  <Button type="button" onClick={addHistory} disabled={!newHistoryNote}>Adicionar</Button>
                </div>
                <div className="space-y-3 max-h-40 overflow-y-auto bg-slate-50 p-3 rounded-md">
                   {formData.history && formData.history.length > 0 ? formData.history.map((h, i) => (
                     <div key={i} className="text-xs border-b border-slate-200 pb-2 last:border-0">
                       <span className="font-bold text-slate-700">{new Date(h.date).toLocaleDateString()} - {h.user}:</span> {h.note}
                     </div>
                   )) : <p className="text-xs text-gray-400">Nenhum histórico registrado.</p>}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};