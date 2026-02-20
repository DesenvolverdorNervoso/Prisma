import React, { useEffect, useState } from 'react';
import { repositories } from '../data/repositories';
import { FinanceTransaction, FinanceCategory } from '../domain/types';
import { Button, Input, Select, TextArea, Table, TableHeader, TableRow, TableHead, TableCell, Badge, Card, useToast, Modal, FormSection } from '../components/UI';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { validateFinance } from '../utils/validators';

export const Finance: React.FC = () => {
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<FinanceTransaction>>({ type: 'Entrada', status: 'Pendente', value: 0, date: new Date().toISOString().split('T')[0] });
  const [summary, setSummary] = useState({ in: 0, out: 0, balance: 0 });

  const loadData = async () => {
    const res = await repositories.finance.list({ limit: 50 }); // Simplified for brevity
    const cats = await repositories.financeCategories.list({ limit: 100 });
    setTransactions(res.data);
    setCategories(cats.data);
    
    // Summary logic
    const all = res.data;
    const totalIn = all.filter(t => t.type === 'Entrada').reduce((acc, t) => acc + t.value, 0);
    const totalOut = all.filter(t => t.type === 'Saída').reduce((acc, t) => acc + t.value, 0);
    setSummary({ in: totalIn, out: totalOut, balance: totalIn - totalOut });
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
     const val = validateFinance(formData);
     if (!val.valid) return addToast('warning', val.error!);
     try {
       await repositories.finance.create(formData);
       addToast('success', 'Salvo');
       setShowModal(false);
       loadData();
     } catch(e:any) { addToast('error', e.message); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir?')) { await repositories.finance.remove(id); loadData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Financeiro</h2>
        <Button onClick={() => { setFormData({ type: 'Entrada', status: 'Pendente', value: 0, date: new Date().toISOString().split('T')[0] }); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200 p-4"><div className="text-green-700">Entradas</div><div className="text-2xl font-bold text-green-800">{formatCurrency(summary.in)}</div></Card>
        <Card className="bg-red-50 border-red-200 p-4"><div className="text-red-700">Saídas</div><div className="text-2xl font-bold text-red-800">{formatCurrency(summary.out)}</div></Card>
        <Card className="bg-slate-50 border-slate-200 p-4"><div className="text-slate-700">Saldo</div><div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.balance)}</div></Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <tbody>
             {transactions.map(t => (
               <TableRow key={t.id}>
                 <TableCell>{formatDate(t.date)}</TableCell>
                 <TableCell>{t.description}<br/><span className="text-xs text-gray-400">{t.payment_method}</span></TableCell>
                 <TableCell>{t.category}</TableCell>
                 <TableCell className={t.type==='Entrada'?'text-green-600':'text-red-600'}>{formatCurrency(t.value)}</TableCell>
                 <TableCell><Badge variant={t.status==='Pago'?'success':'warning'}>{t.status}</Badge></TableCell>
                 <TableCell><Button variant="ghost" size="sm" onClick={()=>handleDelete(t.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></Button></TableCell>
               </TableRow>
             ))}
          </tbody>
        </Table>
      </Card>

      {showModal && (
        <Modal title="Lançamento Financeiro" onClose={() => setShowModal(false)} footer={<Button onClick={handleSave}>Salvar</Button>}>
           <FormSection title="Dados Gerais">
             <div className="grid grid-cols-2 gap-4">
               <Select label="Tipo" options={[{label:'Entrada',value:'Entrada'},{label:'Saída',value:'Saída'}]} value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as any})} required />
               <Select label="Status" options={[{label:'Pendente',value:'Pendente'},{label:'Pago/Recebido',value:'Pago'}]} value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})} required />
             </div>
             <Input label="Descrição" value={formData.description || ''} onChange={e=>setFormData({...formData, description: e.target.value})} required />
             <Select label="Categoria" options={categories.map(c=>({label:c.name,value:c.name}))} value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} required />
           </FormSection>
           <FormSection title="Valores e Pagamento">
             <div className="grid grid-cols-2 gap-4">
                <Input label="Valor (R$)" type="number" value={formData.value} onChange={e=>setFormData({...formData, value: Number(e.target.value)})} required />
                <Input label="Data" type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} required />
             </div>
             <div className="grid grid-cols-2 gap-4 mt-2">
                <Select label="Forma Pagamento" options={['Pix','Boleto','Cartão','Dinheiro'].map(c=>({label:c,value:c}))} value={formData.payment_method || 'Pix'} onChange={e=>setFormData({...formData, payment_method: e.target.value})} />
                <Input label="Centro de Custo" value={formData.cost_center || ''} onChange={e=>setFormData({...formData, cost_center: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-4 mt-2">
                <Input label="Nº Documento" value={formData.document_number || ''} onChange={e=>setFormData({...formData, document_number: e.target.value})} />
                <TextArea label="Observação Interna" value={formData.internal_notes || ''} onChange={e=>setFormData({...formData, internal_notes: e.target.value})} className="h-10" />
             </div>
           </FormSection>
        </Modal>
      )}
    </div>
  );
};