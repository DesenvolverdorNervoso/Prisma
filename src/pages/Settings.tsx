import React, { useEffect, useState } from 'react';
import { authService } from '../services/auth.service';
import { repositories } from '../data/repositories';
import { integrityService } from '../services/integrity.service';
import { 
  Button, Input, Select, Table, TableHeader, TableRow, TableHead, TableCell, 
  Card, CardHeader, CardTitle, CardContent, Badge, useToast 
} from '../components/UI';
import { Edit, Trash2, Plus, ShieldAlert, CheckCircle2, XCircle, Search, Building } from 'lucide-react';
import { Label, CandidateCategory, FinanceCategory, ServiceItem, PaginatedResult, Tenant } from '../domain/types';

// --- Generic Settings Component ---

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'color';
  options?: { label: string; value: string }[];
}

interface GenericSettingsCrudProps<T> {
  title: string;
  repo: any;
  fields: FieldDef[];
  columns: { key: string; label: string; render?: (item: T) => React.ReactNode }[];
  defaultValues: Partial<T>;
  onDeleteCheck?: (item: T) => Promise<void>;
}

function GenericSettingsCrud<T extends { id: string, active?: boolean }>({ 
  title, repo, fields, columns, defaultValues, onDeleteCheck
}: GenericSettingsCrudProps<T>) {
  const { addToast } = useToast();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Pagination
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<T>>(defaultValues);

  const loadData = async () => {
    setLoading(true);
    try {
      const result: PaginatedResult<T> = await repo.list({
        page,
        limit: itemsPerPage,
        search: searchTerm,
        filters: filterActive !== 'all' ? { active: filterActive === 'active' } : {}
      });
      setData(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) {
      addToast('error', 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [page, searchTerm, filterActive]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) await repo.update(isEditing, formData);
      else await repo.create(formData);
      
      setShowModal(false);
      handleReset();
      loadData();
      addToast('success', 'Salvo com sucesso!');
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  const handleEdit = (item: T) => {
    setFormData(item);
    setIsEditing(item.id);
    setShowModal(true);
  };

  const handleDelete = async (item: T) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      try {
        if (onDeleteCheck) {
          await onDeleteCheck(item);
        }
        await repo.remove(item.id);
        loadData();
        addToast('success', 'Item excluído.');
      } catch (e: any) {
        addToast('error', e.message);
      }
    }
  };

  const handleReset = () => {
    setFormData(defaultValues);
    setIsEditing(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        <Button onClick={() => { handleReset(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar
        </Button>
      </div>

      <div className="flex gap-4 mb-4 bg-slate-50 p-3 rounded-md border dark:bg-slate-900 dark:border-slate-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar..." 
            value={searchTerm} 
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select 
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          value={filterActive}
          onChange={(e) => { setFilterActive(e.target.value as any); setPage(1); }}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-gray-500 py-8 dark:text-slate-500">Nenhum registro encontrado.</TableCell></TableRow>
          ) : (
            data.map(item => (
              <TableRow key={item.id}>
                {columns.map(col => (
                  <TableCell key={col.key}>
                    {col.render ? col.render(item) : String((item as any)[col.key] || '')}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Edit className="w-4 h-4 text-slate-500" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm flex items-center text-slate-600 dark:text-slate-400">Página {page} de {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-800 dark:border-slate-700">
            <CardHeader><CardTitle>{isEditing ? 'Editar Item' : 'Novo Item'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                {fields.map(field => (
                  <div key={field.key}>
                    {field.type === 'boolean' ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={!!(formData as any)[field.key]}
                          onChange={e => setFormData({...formData, [field.key]: e.target.checked})}
                          className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{field.label}</span>
                      </label>
                    ) : field.type === 'select' ? (
                      <Select 
                        label={field.label}
                        options={field.options || []}
                        value={String((formData as any)[field.key] || '')}
                        onChange={e => setFormData({...formData, [field.key]: e.target.value})}
                      />
                    ) : (
                      <Input 
                        type={field.type}
                        label={field.label}
                        value={(formData as any)[field.key] || ''}
                        onChange={e => setFormData({...formData, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value})}
                        required={field.key === 'name'}
                      />
                    )}
                  </div>
                ))}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Main Settings Page ---

export const Settings: React.FC = () => {
  const user = authService.getUser();
  const [activeTab, setActiveTab] = useState<'tenants' | 'tags' | 'candidates' | 'finance' | 'services'>('tags');

  // Initial check: if admin, allow 'tenants' tab, else default to 'tags'
  useEffect(() => {
    if (user.role === 'admin' && activeTab === 'tags') {
      setActiveTab('tenants'); // Admin starts at tenants for visibility
    }
  }, []);

  // Permission Check
  if (user.role !== 'admin' && !user.allowedSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Acesso Negado</h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md">Você não tem permissão para acessar as configurações do sistema. Contate o administrador.</p>
      </div>
    );
  }

  const tabs = [
    ...(user.role === 'admin' ? [{ id: 'tenants', label: 'Consultorias (Tenants)' }] : []),
    { id: 'tags', label: 'Etiquetas (Tags)' },
    { id: 'candidates', label: 'Categorias de Candidatos' },
    { id: 'finance', label: 'Categorias Financeiras' },
    { id: 'services', label: 'Catálogo de Serviços' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Configurações do Sistema</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">Gerencie tabelas auxiliares, categorias e serviços.</p>
      </div>

      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id 
                  ? 'border-slate-900 text-slate-900 dark:text-white dark:border-white' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'tenants' && user.role === 'admin' && (
          <GenericSettingsCrud<Tenant>
            title="Gerenciar Consultorias"
            repo={repositories.tenants}
            defaultValues={{ active: true }}
            columns={[
              { key: 'name', label: 'Nome da Consultoria' },
              { key: 'id', label: 'ID (Referência)', render: (t) => <span className="font-mono text-xs">{t.id}</span> },
              { key: 'active', label: 'Status', render: (l) => l.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="error">Inativo</Badge> }
            ]}
            fields={[
              { key: 'name', label: 'Nome da Consultoria', type: 'text' },
              { key: 'active', label: 'Ativo', type: 'boolean' }
            ]}
          />
        )}

        {activeTab === 'tags' && (
          <GenericSettingsCrud<Label>
            title="Gerenciar Etiquetas"
            repo={repositories.labels}
            defaultValues={{ active: true, color: '#e2e8f0', entityType: 'candidate' }}
            columns={[
              { key: 'name', label: 'Nome' },
              { key: 'entityType', label: 'Entidade', render: (l) => (
                <Badge variant="neutral">{l.entityType === 'person_client' ? 'Cliente PF' : l.entityType === 'company' ? 'Empresa' : 'Candidato'}</Badge>
              )},
              { key: 'color', label: 'Cor', render: (l) => (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: l.color }}></div>
                  <span className="text-xs text-gray-500 dark:text-slate-400">{l.color}</span>
                </div>
              )},
              { key: 'active', label: 'Status', render: (l) => l.active ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-300" /> }
            ]}
            fields={[
              { key: 'name', label: 'Nome da Etiqueta', type: 'text' },
              { key: 'color', label: 'Cor (Hex)', type: 'color' },
              { key: 'entityType', label: 'Aplica-se a', type: 'select', options: [
                { label: 'Candidato', value: 'candidate' },
                { label: 'Empresa', value: 'company' },
                { label: 'Cliente PF', value: 'person_client' }
              ]},
              { key: 'active', label: 'Ativo', type: 'boolean' }
            ]}
          />
        )}

        {activeTab === 'candidates' && (
          <GenericSettingsCrud<CandidateCategory>
            title="Áreas de Interesse (Candidatos)"
            repo={repositories.candidateCategories}
            defaultValues={{ active: true }}
            onDeleteCheck={async (item) => await integrityService.checkCandidateCategoryDeletion(item.name)}
            columns={[
              { key: 'name', label: 'Nome da Área' },
              { key: 'active', label: 'Status', render: (l) => l.active ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-300" /> }
            ]}
            fields={[
              { key: 'name', label: 'Nome', type: 'text' },
              { key: 'active', label: 'Ativo', type: 'boolean' }
            ]}
          />
        )}

        {activeTab === 'finance' && (
          <GenericSettingsCrud<FinanceCategory>
            title="Categorias Financeiras"
            repo={repositories.financeCategories}
            defaultValues={{ active: true, allowedType: 'Ambos' }}
            onDeleteCheck={async (item) => await integrityService.checkFinanceCategoryDeletion(item.name)}
            columns={[
              { key: 'name', label: 'Nome da Categoria' },
              { key: 'allowedType', label: 'Tipo Permitido', render: (l) => (
                <Badge variant={l.allowedType === 'Entrada' ? 'success' : l.allowedType === 'Saída' ? 'error' : 'neutral'}>{l.allowedType}</Badge>
              )},
              { key: 'active', label: 'Status', render: (l) => l.active ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-300" /> }
            ]}
            fields={[
              { key: 'name', label: 'Nome', type: 'text' },
              { key: 'allowedType', label: 'Tipo', type: 'select', options: [
                { label: 'Entrada', value: 'Entrada' },
                { label: 'Saída', value: 'Saída' },
                { label: 'Ambos', value: 'Ambos' }
              ]},
              { key: 'active', label: 'Ativo', type: 'boolean' }
            ]}
          />
        )}

        {activeTab === 'services' && (
          <GenericSettingsCrud<ServiceItem>
            title="Catálogo de Serviços"
            repo={repositories.services}
            defaultValues={{ active: true, price_default: 0, category: 'Geral' }}
            onDeleteCheck={async (item) => await integrityService.checkServiceDeletion(item.id)}
            columns={[
              { key: 'name', label: 'Serviço' },
              { key: 'category', label: 'Categoria' },
              { key: 'price_default', label: 'Preço Base', render: (s) => `R$ ${s.price_default.toFixed(2)}` },
              { key: 'active', label: 'Status', render: (l) => l.active ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-300" /> }
            ]}
            fields={[
              { key: 'name', label: 'Nome do Serviço', type: 'text' },
              { key: 'category', label: 'Categoria', type: 'text' },
              { key: 'price_default', label: 'Preço Padrão (R$)', type: 'number' },
              { key: 'description', label: 'Descrição', type: 'text' },
              { key: 'active', label: 'Ativo', type: 'boolean' }
            ]}
          />
        )}
      </div>
    </div>
  );
};