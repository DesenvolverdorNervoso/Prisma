import React, { useEffect, useState } from 'react';
import { repositories } from '../data/repositories';
import { ServiceItem } from '../domain/types';
import { Button, Input, Select, TextArea, Table, TableHeader, TableRow, TableHead, TableCell, Card, useToast, Modal, FormSection, Badge } from '../components/UI';
import { Plus, Edit, Trash2 } from 'lucide-react';

export const Services: React.FC = () => {
  const { addToast } = useToast();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  const initialForm: Partial<ServiceItem> = { 
    name: '', category: 'Geral', price_default: 0, active: true, 
    description: '', service_type: 'Outros', price_min: 0, price_max: 0, estimated_duration: '' 
  };
  const [formData, setFormData] = useState<Partial<ServiceItem>>(initialForm);

  const loadData = async () => {
    const res = await repositories.services.list();
    setServices(res.data);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!formData.name) return addToast('warning', 'Nome obrigatório');
    try {
      if (isEditing) await repositories.services.update(isEditing, formData);
      else await repositories.services.create(formData);
      addToast('success', 'Salvo com sucesso');
      setShowModal(false);
      loadData();
    } catch(e: any) { addToast('error', e.message); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir?')) { await repositories.services.remove(id); loadData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Catálogo de Serviços</h2>
        <Button onClick={() => { setIsEditing(null); setFormData(initialForm); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Serviço
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Preço Base</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <tbody>
            {services.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.category}</TableCell>
                <TableCell>R$ {s.price_default.toFixed(2)}</TableCell>
                <TableCell><Badge variant={s.active ? 'success' : 'neutral'}>{s.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                <TableCell className="flex gap-2">
                   <Button variant="ghost" size="sm" onClick={() => { setFormData(s); setIsEditing(s.id); setShowModal(true); }}><Edit className="w-4 h-4" /></Button>
                   <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </Card>
      
      {showModal && (
        <Modal title={isEditing ? 'Editar Serviço' : 'Novo Serviço'} onClose={() => setShowModal(false)} footer={<Button onClick={handleSave}>Salvar</Button>}>
          <FormSection title="Detalhes do Serviço">
             <Input label="Nome do Serviço" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
             <div className="grid grid-cols-2 gap-4">
               <Select label="Tipo" options={['Consultoria','Recrutamento','Treinamento','Outros'].map(c=>({label:c,value:c}))} value={formData.service_type || 'Outros'} onChange={e => setFormData({...formData, service_type: e.target.value as any})} />
               <Input label="Categoria" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
             </div>
             <TextArea label="Descrição" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
          </FormSection>
          <FormSection title="Precificação e Prazos">
             <Input label="Preço Padrão (R$)" type="number" value={formData.price_default} onChange={e => setFormData({...formData, price_default: Number(e.target.value)})} required />
             <div className="grid grid-cols-2 gap-4">
                <Input label="Preço Mínimo" type="number" value={formData.price_min || 0} onChange={e => setFormData({...formData, price_min: Number(e.target.value)})} />
                <Input label="Preço Máximo" type="number" value={formData.price_max || 0} onChange={e => setFormData({...formData, price_max: Number(e.target.value)})} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <Input label="Duração Estimada" value={formData.estimated_duration || ''} onChange={e => setFormData({...formData, estimated_duration: e.target.value})} placeholder="Ex: 2 dias" />
                <Select label="Status" options={[{label:'Ativo',value:'true'},{label:'Inativo',value:'false'}]} value={String(formData.active)} onChange={e => setFormData({...formData, active: e.target.value === 'true'})} />
             </div>
          </FormSection>
        </Modal>
      )}
    </div>
  );
};