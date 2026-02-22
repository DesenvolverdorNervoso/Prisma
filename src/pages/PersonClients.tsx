import React, { useEffect, useState } from 'react';
import { personClientsService } from '../services/personClients.service';
import { PersonClient } from '../domain/types';
import { 
  Button, Input, Select, TextArea, Table, TableHeader, TableRow, TableHead, TableCell, 
  Card, useToast, Modal, Tabs, FormSection, Badge 
} from '../components/UI';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { validatePersonClient } from '../domain/validators';
import { maskPhone, maskCPF, maskZip } from '../utils/format';

export const PersonClients: React.FC = () => {
  const { addToast } = useToast();
  const [clients, setClients] = useState<PersonClient[]>([]);
  const [page] = useState(1);
  const [search, setSearch] = useState('');
  // const [total, setTotal] = useState(0); // Unused

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
    try {
      const result = await personClientsService.list({ page, limit: 10, search });
      setClients(result.data);
    } catch (e) {
      addToast('error', 'Erro ao carregar clientes.');
    }
  };

  useEffect(() => { loadData(); }, [page, search]);

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
        await personClientsService.update(isEditing, formData);
        addToast('success', 'Cliente atualizado.');
      } else {
        await personClientsService.create(formData);
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
    if (confirm('Tem certeza?')) {
      try {
        await personClientsService.delete(id);
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
        <h2 className="text-2xl font-bold">Clientes PF</h2>
        <Button onClick={() => { setIsEditing(null); setFormData(initialFormState); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <div className="flex bg-white p-4 rounded-lg border">
          <Search className="h-4 w-4 text-gray-400 absolute mt-3 ml-3" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Whatsapp</TableHead>
                  <TableHead>Serviço Principal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="sticky right-0 bg-primary-50/90 dark:bg-slate-900/90 z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {clients.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.whatsapp}</TableCell>
                    <TableCell>{c.main_service}</TableCell>
                    <TableCell><Badge variant={c.active ? 'success' : 'neutral'}>{c.active ? 'Ativo' : 'Inativa'}</Badge></TableCell>
                    <TableCell className="sticky right-0 bg-white/90 dark:bg-dark-card/90 z-10 flex gap-2 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                       <Button variant="ghost" size="sm" onClick={() => { setFormData(c); setIsEditing(c.id); setActiveTab('main'); setShowModal(true); }}><Edit className="w-4 h-4" /></Button>
                       <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </Card>

      {showModal && (
        <Modal 
          title={isEditing ? 'Editar Cliente PF' : 'Novo Cliente PF'}
          onClose={() => setShowModal(false)}
          size="lg"
          footer={<><Button variant="ghost" onClick={()=>setShowModal(false)}>Cancelar</Button><Button onClick={()=>handleSave('close')}>Salvar</Button></>}
        >
          <Tabs active={activeTab} onChange={setActiveTab} tabs={[{id:'main',label:'Dados Pessoais'}, {id:'details',label:'Endereço & Complementar'}]} />
          
          {activeTab === 'main' && (
            <div className="animate-in fade-in">
              <FormSection title="Identificação">
                <Input label="Nome Completo" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="CPF" value={formData.cpf || ''} onChange={e => handleInputChange('cpf', e.target.value)} />
                  <Input label="Cidade" value={formData.city || ''} onChange={e => handleInputChange('city', e.target.value)} required />
                </div>
                <Input label="Data de Nascimento" type="date" value={formData.birth_date || ''} onChange={e => handleInputChange('birth_date', e.target.value)} />
              </FormSection>
              <FormSection title="Contato & Status">
                <Input label="WhatsApp" value={formData.whatsapp} onChange={e => handleInputChange('whatsapp', e.target.value)} required />
                <Select label="Status" options={[{label:'Ativo',value:'true'},{label:'Inativo',value:'false'}]} value={String(formData.active)} onChange={e=>handleInputChange('active',e.target.value==='true')} />
              </FormSection>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="animate-in fade-in">
              <FormSection title="Dados Profissionais">
                 <Input label="Profissão" value={formData.profession || ''} onChange={e => handleInputChange('profession', e.target.value)} />
                 <Input label="Serviço de Interesse Principal" value={formData.main_service} onChange={e => handleInputChange('main_service', e.target.value)} required />
                 <Input label="Instagram" value={formData.instagram || ''} onChange={e => handleInputChange('instagram', e.target.value)} />
              </FormSection>
              <FormSection title="Endereço">
                 <div className="grid grid-cols-2 gap-4">
                   <Input label="CEP" value={formData.zip_code || ''} onChange={e => handleInputChange('zip_code', e.target.value)} />
                   <Input label="Bairro" value={formData.neighborhood || ''} onChange={e => handleInputChange('neighborhood', e.target.value)} />
                 </div>
              </FormSection>
              <FormSection title="Notas">
                <TextArea label="Observações Internas" value={formData.notes || ''} onChange={e => handleInputChange('notes', e.target.value)} />
              </FormSection>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};