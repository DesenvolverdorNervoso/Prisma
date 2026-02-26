import React, { useEffect, useState, useMemo } from 'react';
import { ordersService, EnrichedOrder } from '../services/orders.service';
import { PersonClient, Company, ServiceItem, Order } from '../domain/types';
import { Button, Input, Select, Table, TableHeader, TableRow, TableHead, TableCell, Card, useToast, Modal, FormSection, Badge, TextArea, Skeleton } from '../components/UI';
import { Plus, Edit, Trash2, DollarSign, Filter, X, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { validateOrder } from '../domain/validators';

export const Orders: React.FC = () => {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsPF, setClientsPF] = useState<PersonClient[]>([]);
  const [clientsPJ, setClientsPJ] = useState<Company[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  const initialForm: Partial<Order> = {
    client_type: 'PF', status: 'Em andamento', value: 0, date: new Date().toISOString().split('T')[0],
    payment_method: 'Pix', is_installments: false, installments_count: 1, priority: 'Média', internal_rep: ''
  };
  const [formData, setFormData] = useState<Partial<Order>>(initialForm);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ord = await ordersService.listEnriched();
      setOrders(ord);
      const deps = await ordersService.getDependencies();
      setClientsPF(deps.clientsPF);
      setClientsPJ(deps.companies);
      setServices(deps.services);
    } catch(e) { 
      addToast('error', 'Erro ao carregar dados'); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = !debouncedSearch || 
        o.client_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        o.service_name.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesStatus = statusFilter === 'Todos' || o.status === statusFilter;
      const matchesType = typeFilter === 'Todos' || o.client_type === typeFilter;
      
      const matchesDate = (!dateStart || o.date >= dateStart) && (!dateEnd || o.date <= dateEnd);

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [orders, debouncedSearch, statusFilter, typeFilter, dateStart, dateEnd]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('Todos');
    setTypeFilter('Todos');
    setDateStart('');
    setDateEnd('');
  };

  const handleServiceSelect = (id: string) => {
    const s = services.find(x => x.id === id);
    setFormData(prev => ({ ...prev, service_id: id, value: s ? s.price_default : 0 }));
  };

  const handleSave = async () => {
    const validation = validateOrder(formData);
    if (!validation.valid) return addToast('warning', validation.error!);
    
    // Convert 'Aberto' to 'Em andamento' if necessary
    const dataToSave = { ...formData };
    if (dataToSave.status === 'Aberto' as any) {
      dataToSave.status = 'Em andamento';
    }

    try {
      if (isEditing) {
        await ordersService.update(isEditing, dataToSave);
        addToast('success', 'Pedido atualizado com sucesso');
      } else {
        await ordersService.create(dataToSave);
        addToast('success', 'Pedido criado com sucesso');
      }
      setShowModal(false);
      loadData();
    } catch(e:any) { addToast('error', e.message); }
  };

  const handleEdit = (order: EnrichedOrder) => {
    // Ensure status is compatible
    const status = order.status === 'Aberto' as any ? 'Em andamento' : order.status;
    
    setFormData({
      client_type: order.client_type,
      company_id: order.company_id,
      person_client_id: order.person_client_id,
      service_id: order.service_id,
      value: order.value,
      status: status,
      date: order.date,
      payment_method: order.payment_method,
      is_installments: order.is_installments,
      installments_count: order.installments_count,
      internal_rep: order.internal_rep,
      priority: order.priority,
      notes: order.notes
    });
    setIsEditing(order.id);
    setShowModal(true);
  };

  const handleGenerateFinance = async (order: EnrichedOrder) => {
    if (!confirm(`Gerar lançamento financeiro de ${formatCurrency(order.value)}?`)) return;
    try {
      await ordersService.generateFinanceEntry(order);
      addToast('success', 'Lançamento financeiro gerado');
    } catch(e:any) { addToast('error', e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      await ordersService.delete(id);
      addToast('success', 'Pedido excluído');
      loadData();
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Pedidos</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie e acompanhe todos os pedidos de serviço.</p>
        </div>
        <Button onClick={() => { setIsEditing(null); setFormData(initialForm); setShowModal(true); }} className="shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4 mr-2" /> Novo Pedido
        </Button>
      </div>

      {/* FILTROS */}
      <Card className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-1">
            <Input 
              placeholder="Buscar cliente ou serviço..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-slate-800"
            />
          </div>
          <Select 
            options={['Todos', 'Em andamento', 'Concluído', 'Cancelado'].map(s => ({ label: s, value: s }))}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-slate-800"
          />
          <Select 
            options={['Todos', 'PF', 'PJ'].map(t => ({ label: t, value: t }))}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-white dark:bg-slate-800"
          />
          <div className="flex gap-2 items-center">
            <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-white dark:bg-slate-800 text-xs" />
            <span className="text-slate-400">/</span>
            <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-white dark:bg-slate-800 text-xs" />
          </div>
          <Button variant="ghost" onClick={clearFilters} size="sm" className="h-10 text-slate-500">
            <X className="w-4 h-4 mr-2" /> Limpar
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden border-0 shadow-medium">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[1100px]">
            <div className="max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead className="w-[280px]">Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right w-[120px]">Valor</TableHead>
                    <TableHead className="w-[150px]">Status</TableHead>
                    <TableHead className="text-right sticky right-0 bg-white/95 dark:bg-dark-card/95 z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.12)]">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map(o => (
                <TableRow key={o.id} className="group">
                  <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 opacity-50" />
                      {formatDate(o.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium max-w-[280px] break-words whitespace-normal">
                      <span className="font-bold text-slate-900 dark:text-slate-100" title={o.client_name}>{o.client_name}</span>
                      <Badge variant="neutral" className="w-fit mt-1 text-[10px] px-1.5 py-0 opacity-70">
                        {o.client_type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[260px] break-words whitespace-normal text-slate-600 dark:text-slate-400">
                      {o.service_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(o.value)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.status === 'Concluído' ? 'success' : o.status === 'Cancelado' ? 'error' : 'warning'} className="capitalize">
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right sticky right-0 bg-white/95 dark:bg-dark-card/95 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.12)]">
                    <div className="flex justify-end gap-1">
                       {o.status === 'Concluído' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleGenerateFinance(o)} 
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20" 
                            title="Gerar Financeiro"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                       )}
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => handleEdit(o)} 
                         className="text-primary-600 hover:text-brand-600 dark:text-dark-muted dark:hover:text-white"
                         title="Editar"
                       >
                         <Edit className="w-4 h-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => handleDelete(o.id)} 
                         className="text-primary-600 hover:text-red-600 dark:text-dark-muted dark:hover:text-red-400"
                         title="Excluir"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Filter className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Nenhum pedido encontrado</p>
                    <p className="text-sm">Tente ajustar seus filtros de busca.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  </div>
</Card>
      
      {showModal && (
        <Modal title={isEditing ? 'Editar Pedido' : 'Novo Pedido'} onClose={() => setShowModal(false)} size="lg" footer={<Button onClick={handleSave}>Salvar</Button>}>
          <FormSection title="Cliente & Serviço">
             <div className="bg-primary-50/40 dark:bg-slate-900/40 p-4 rounded-lg border border-slate-200 dark:border-dark-border mb-4">
                <div className="flex gap-4 mb-4">
                   <label className="text-sm flex gap-2 items-center dark:text-dark-muted cursor-pointer">
                     <input type="radio" checked={formData.client_type==='PF'} onChange={()=>setFormData({...formData, client_type:'PF', person_client_id: null, company_id: null})} className="text-brand-600 focus:ring-brand-500" /> 
                     Pessoa Física
                   </label>
                   <label className="text-sm flex gap-2 items-center dark:text-dark-muted cursor-pointer">
                     <input type="radio" checked={formData.client_type==='PJ'} onChange={()=>setFormData({...formData, client_type:'PJ', person_client_id: null, company_id: null})} className="text-brand-600 focus:ring-brand-500" /> 
                     Empresa (PJ)
                   </label>
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
             <Select label="Status Atual" options={['Em andamento','Concluído','Cancelado'].map(c=>({label:c,value:c}))} value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})} className="mt-4" />
             <TextArea label="Observações" value={formData.notes || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setFormData({...formData, notes: e.target.value})} className="mt-4" />
          </FormSection>
        </Modal>
      )}
    </div>
  );
};