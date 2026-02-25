import React, { useEffect, useState } from 'react';
import { repositories } from '../data/repositories';
import { FinanceTransaction, FinanceCategory } from '../domain/types';
import { 
  Button, Input, Select, TextArea, Table, TableHeader, TableRow, TableHead, TableCell, 
  Badge, Card, useToast, Modal, FormSection, Skeleton 
} from '../components/UI';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, FilterX } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { validateFinance } from '../domain/validators';
import { cn } from '../ui';

export const Finance: React.FC = () => {
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<FinanceTransaction>>({ 
    type: 'Entrada', 
    status: 'Pendente', 
    value: 0, 
    date: new Date().toISOString().split('T')[0] 
  });
  const [summary, setSummary] = useState({ in: 0, out: 0, balance: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await repositories.finance.list({ limit: 50 });
      const cats = await repositories.financeCategories.list({ limit: 100 });
      setTransactions(res.data);
      setCategories(cats.data);
      
      // Summary logic
      const all = res.data;
      const totalIn = all.filter(t => t.type === 'Entrada').reduce((acc, t) => acc + t.value, 0);
      const totalOut = all.filter(t => t.type === 'Saída').reduce((acc, t) => acc + t.value, 0);
      setSummary({ in: totalIn, out: totalOut, balance: totalIn - totalOut });
    } catch (e) {
      addToast('error', 'Erro ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
     const val = validateFinance(formData);
     if (!val.valid) return addToast('warning', val.error!);
     try {
       await repositories.finance.create(formData);
       addToast('success', 'Lançamento salvo com sucesso!');
       setShowModal(false);
       loadData();
     } catch(e:any) { 
       addToast('error', e.message); 
     }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) { 
      try {
        await repositories.finance.remove(id); 
        addToast('success', 'Lançamento excluído.');
        loadData(); 
      } catch (e) {
        addToast('error', 'Erro ao excluir lançamento.');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary-900 dark:text-dark-text">Financeiro</h2>
          <p className="text-primary-500 mt-1 dark:text-dark-muted">Acompanhe as entradas, saídas e o fluxo de caixa da sua empresa.</p>
        </div>
        <Button onClick={() => { setFormData({ type: 'Entrada', status: 'Pendente', value: 0, date: new Date().toISOString().split('T')[0] }); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-success shadow-soft bg-white dark:bg-dark-card dark:border-dark-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-primary-500 dark:text-dark-muted uppercase tracking-wider">Entradas</span>
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <div className="text-3xl font-bold text-primary-900 dark:text-dark-text">{formatCurrency(summary.in)}</div>
        </Card>
        
        <Card className="p-6 border-l-4 border-l-error shadow-soft bg-white dark:bg-dark-card dark:border-dark-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-primary-500 dark:text-dark-muted uppercase tracking-wider">Saídas</span>
            <div className="p-2 bg-error/10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-error" />
            </div>
          </div>
          <div className="text-3xl font-bold text-primary-900 dark:text-dark-text">{formatCurrency(summary.out)}</div>
        </Card>
        
        <Card className="p-6 border-l-4 border-l-brand-500 shadow-soft bg-white dark:bg-dark-card dark:border-dark-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-primary-500 dark:text-dark-muted uppercase tracking-wider">Saldo Atual</span>
            <div className="p-2 bg-brand-500/10 rounded-lg">
              <Wallet className="w-5 h-5 text-brand-500" />
            </div>
          </div>
          <div className={cn(
            "text-3xl font-bold",
            summary.balance >= 0 ? "text-primary-900 dark:text-dark-text" : "text-error"
          )}>
            {formatCurrency(summary.balance)}
          </div>
        </Card>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden border-0 shadow-medium">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] scrollbar-thin scrollbar-thumb-primary-200 scrollbar-track-transparent">
          <Table className="min-w-[900px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] sticky top-0 bg-primary-50/90 backdrop-blur-sm z-20 dark:bg-slate-900/90">Data</TableHead>
                <TableHead className="w-[300px] sticky top-0 bg-primary-50/90 backdrop-blur-sm z-20 dark:bg-slate-900/90">Descrição</TableHead>
                <TableHead className="w-[180px] sticky top-0 bg-primary-50/90 backdrop-blur-sm z-20 dark:bg-slate-900/90">Categoria</TableHead>
                <TableHead className="w-[150px] sticky top-0 bg-primary-50/90 backdrop-blur-sm z-20 dark:bg-slate-900/90">Valor</TableHead>
                <TableHead className="w-[120px] sticky top-0 bg-primary-50/90 backdrop-blur-sm z-20 dark:bg-slate-900/90">Status</TableHead>
                <TableHead className="w-[100px] text-right sticky top-0 right-0 bg-primary-50/90 backdrop-blur-sm z-30 dark:bg-slate-900/90">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <tbody className="divide-y divide-primary-100 dark:divide-dark-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell className="sticky right-0 bg-white/90 backdrop-blur-sm z-10 dark:bg-dark-card/90"><Skeleton className="h-8 w-full float-right" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4 dark:bg-slate-800">
                        <FilterX className="w-8 h-8 text-primary-300 dark:text-slate-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-primary-900 dark:text-dark-text">Nenhum lançamento encontrado</h3>
                      <p className="text-primary-500 mt-1 mb-6 max-w-xs dark:text-dark-muted">Você ainda não registrou nenhuma movimentação financeira.</p>
                      <Button onClick={() => setShowModal(true)} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm text-primary-600 dark:text-dark-muted">{formatDate(t.date)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-primary-900 dark:text-dark-text truncate" title={t.description}>{t.description}</span>
                        {t.payment_method && <span className="text-[10px] uppercase font-bold text-primary-400 dark:text-slate-600 tracking-wider">{t.payment_method}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" className="bg-primary-50 text-primary-600 border-primary-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                        {t.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-bold text-sm",
                        t.type === 'Entrada' ? "text-success" : "text-error"
                      )}>
                        {t.type === 'Entrada' ? '+' : '-'} {formatCurrency(t.value)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'Pago' ? 'success' : 'warning'}>
                        {t.status === 'Pago' ? 'Pago/Recebido' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-white/90 backdrop-blur-sm z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.12)] dark:bg-dark-card/90 dark:shadow-black/20">
                      <button 
                        onClick={() => handleDelete(t.id)} 
                        className="p-2 text-primary-500 hover:text-error hover:bg-error/10 rounded-lg transition-colors dark:text-dark-muted dark:hover:text-red-400 dark:hover:bg-red-900/20"
                        title="Excluir Lançamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          title="Lançamento Financeiro" 
          onClose={() => setShowModal(false)} 
          size="xl"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar Lançamento</Button>
            </div>
          }
        >
          <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <FormSection title="Dados Gerais">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Select label="Tipo *" options={[{label:'Entrada',value:'Entrada'},{label:'Saída',value:'Saída'}]} value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as any})} required />
                </div>
                <div className="md:col-span-1">
                  <Select label="Status *" options={[{label:'Pendente',value:'Pendente'},{label:'Pago/Recebido',value:'Pago'}]} value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})} required />
                </div>
                <div className="md:col-span-2">
                  <Input label="Descrição *" value={formData.description || ''} onChange={e=>setFormData({...formData, description: e.target.value})} required placeholder="Ex: Pagamento Fornecedor X" />
                </div>
                <div className="md:col-span-4">
                  <Select label="Categoria *" options={categories.map(c=>({label:c.name,value:c.name}))} value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} required placeholder="Selecione uma categoria" />
                </div>
              </div>
            </FormSection>

            <div className="my-6 border-t border-primary-100 dark:border-dark-border" />

            <FormSection title="Valores e Pagamento">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input label="Valor (R$) *" type="number" step="0.01" value={formData.value} onChange={e=>setFormData({...formData, value: Number(e.target.value)})} required />
                <Input label="Data *" type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} required />
                <Select label="Forma Pagamento" options={['Pix','Boleto','Cartão','Dinheiro'].map(c=>({label:c,value:c}))} value={formData.payment_method || 'Pix'} onChange={e=>setFormData({...formData, payment_method: e.target.value})} />
                <Input label="Centro de Custo" value={formData.cost_center || ''} onChange={e=>setFormData({...formData, cost_center: e.target.value})} placeholder="Ex: Operacional" />
                
                <div className="md:col-span-2 lg:col-span-1">
                  <Input label="Nº Documento" value={formData.document_number || ''} onChange={e=>setFormData({...formData, document_number: e.target.value})} placeholder="Ex: NF-001" />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <TextArea label="Observação Interna" value={formData.internal_notes || ''} onChange={e=>setFormData({...formData, internal_notes: e.target.value})} className="min-h-[90px]" placeholder="Notas adicionais sobre este lançamento..." />
                </div>
              </div>
            </FormSection>
          </div>
        </Modal>
      )}
    </div>
  );
};
