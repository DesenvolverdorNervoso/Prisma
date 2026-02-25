import React, { useEffect, useState } from 'react';
import { ordersService, EnrichedOrder } from '../services/orders.service';
import { PersonClient, Company, ServiceItem, Order } from '../domain/types';
import { Button, Input, Select, Table, TableHeader, TableRow, TableHead, TableCell, Card, useToast, Modal, FormSection, Badge, TextArea } from '../components/UI';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { validateOrder } from '../domain/validators';

export const Orders: React.FC = () => {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [clientsPF, setClientsPF] = useState<PersonClient[]>([]);
  const [clientsPJ, setClientsPJ] = useState<Company[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  // We'll manage finance link visibility by checking existing links
  // NOTE: For simplicity, we assume the user can try to generate, and the service will block duplicates if needed,
  // or we can fetch enriched status. The current mockup service doesn't return "hasFinance" flag directly efficiently.
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  const initialForm: Partial<Order> = {
    client_type: 'PF', status: 'Aberto', value: 0, date: new Date().toISOString().split('T')[0],
    payment_method: 'Pix', is_installments: false, installments_count: 1, priority: 'Média', internal_rep: ''
  };
  const [formData, setFormData] = useState<Partial<Order>>(initialForm);

  const loadData = async () => {
    try {
      const ord = await ordersService.listEnriched();
      setOrders(ord);
      const deps = await ordersService.getDependencies();
      setClientsPF(deps.clientsPF);
      setClientsPJ(deps.companies);
      setServices(deps.services);
    } catch(e) { addToast('error', 'Erro ao carregar'); }
  };

  useEffect(() => { loadData(); }, []);

  const handleServiceSelect = (id: string) => {
    const s = services.find(x => x.id === id);
    setFormData(prev => ({ ...prev, service_id: id, value: s ? s.price_default : 0 }));
  };

  const handleSave = async () => {
    const validation = validateOrder(formData);
    if (!validation.valid) return addToast('warning', validation.error!);
    try {
      if (isEditing) await ordersService.update(isEditing, formData);
      else await ordersService.create(formData);
      addToast('success', 'Salvo');
      setShowModal(false);
      loadData();
    } catch(e:any) { addToast('error', e.message); }
  };

  const handleGenerateFinance = async (order: EnrichedOrder) => {
    if (!confirm(`Gerar lançamento financeiro de ${formatCurrency(order.value)}?`)) return;
    try {
      await ordersService.generateFinanceEntry(order);
      addToast('success', 'Financeiro gerado');
    } catch(e:any) { addToast('error', e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      await ordersService.delete(id);
      addToast('success', 'Excluído com sucesso');
      loadData();
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pedidos</h2>
        <Button onClick={() => { setIsEditing(null); setFormData(initialForm); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Pedido
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Serviço</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <tbody>
            {orders.map(o => (
              <TableRow key={o.id}>
                <TableCell>{formatDate(o.date)}</TableCell>
                <TableCell><div><div className="font-medium">{o.client_name}</div><div className="text-xs text-gray-500">{o.client_type}</div></div></TableCell>
                <TableCell>{o.service_name}</TableCell>
                <TableCell>{formatCurrency(o.value)}</TableCell>
                <TableCell><Badge variant={o.status === 'Concluído' ? 'success' : 'neutral'}>{o.status}</Badge></TableCell>
                <TableCell className="flex gap-2">
                   {o.status === 'Concluído' && (
                      <Button variant="ghost" size="sm" onClick={() => handleGenerateFinance(o)} className="text-green-600" title="Gerar Financeiro"><DollarSign className="w-4 h-4" /></Button>
                   )}
                   <Button variant="ghost" size="sm" onClick={() => { setFormData(o); setIsEditing(o.id); setShowModal(true); }}><Edit className="w-4 h-4" /></Button>
                   <Button variant="ghost" size="sm" onClick={() => handleDelete(o.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </Card>
      
      {showModal && (
        <Modal title={isEditing ? 'Editar Pedido' : 'Novo Pedido'} onClose={() => setShowModal(false)} size="lg" footer={<Button onClick={handleSave}>Salvar</Button>}>
          <FormSection title="Cliente & Serviço">
             <div className="bg-slate-50 p-3 rounded mb-4">
                <div className="flex gap-4 mb-2">
                   <label className="text-sm flex gap-2"><input type="radio" checked={formData.client_type==='PF'} onChange={()=>setFormData({...formData, client_type:'PF', person_client_id: null, company_id: null})} /> Pessoa Física</label>
                   <label className="text-sm flex gap-2"><input type="radio" checked={formData.client_type==='PJ'} onChange={()=>setFormData({...formData, client_type:'PJ', person_client_id: null, company_id: null})} /> Empresa (PJ)</label>
                </div>
                {formData.client_type === 'PF' ? (
                  <Select 
                    label="Selecione o Cliente PF" 
                    options={clientsPF.map(c=>({label:c.name,value:c.id}))} 
                    value={formData.person_client_id || ''} 
                    onChange={e=>setFormData({...formData, person_client_id: e.target.value})} 
                    required 
                  />
                ) : (
                  <Select 
                    label="Selecione a Empresa (PJ)" 
                    options={clientsPJ.map(c=>({label:c.name,value:c.id}))} 
                    value={formData.company_id || ''} 
                    onChange={e=>setFormData({...formData, company_id: e.target.value})} 
                    required 
                  />
                )}
             </div>
             <Select label="Serviço" options={services.map(s=>({label:s.name,value:s.id}))} value={formData.service_id} onChange={e=>handleServiceSelect(e.target.value)} required />
             <div className="grid grid-cols-2 gap-4 mt-4">
                <Input label="Valor Negociado (R$)" type="number" value={formData.value} onChange={e=>setFormData({...formData, value: Number(e.target.value)})} required />
                <Input label="Data do Pedido" type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} required />
             </div>
          </FormSection>
          
          <FormSection title="Pagamento & Gestão">
             <div className="grid grid-cols-2 gap-4">
                <Select label="Forma de Pagamento" options={['Pix','Dinheiro','Transferência','Cartão Crédito','Cartão Débito','Boleto'].map(c=>({label:c,value:c}))} value={formData.payment_method || 'Pix'} onChange={e=>setFormData({...formData, payment_method: e.target.value})} />
                <Select label="Prioridade" options={['Alta','Média','Baixa'].map(c=>({label:c,value:c}))} value={formData.priority || 'Média'} onChange={e=>setFormData({...formData, priority: e.target.value as any})} />
             </div>
             <div className="grid grid-cols-2 gap-4 mt-2">
                <Select label="Parcelado?" options={[{label:'Não',value:'false'},{label:'Sim',value:'true'}]} value={String(formData.is_installments)} onChange={e=>setFormData({...formData, is_installments: e.target.value==='true'})} />
                {formData.is_installments && (
                   <Input label="Nº Parcelas" type="number" value={formData.installments_count || 1} onChange={e=>setFormData({...formData, installments_count: Number(e.target.value)})} />
                )}
             </div>
             <Input label="Responsável Interno" value={formData.internal_rep || ''} onChange={e=>setFormData({...formData, internal_rep: e.target.value})} className="mt-4" />
             <Select label="Status Atual" options={['Aberto','Concluído','Cancelado'].map(c=>({label:c,value:c}))} value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})} className="mt-4" />
             <TextArea label="Observações" value={formData.notes || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setFormData({...formData, notes: e.target.value})} className="mt-4" />
          </FormSection>
        </Modal>
      )}
    </div>
  );
};