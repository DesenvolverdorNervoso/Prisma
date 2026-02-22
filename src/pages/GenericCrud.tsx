import React, { useEffect, useState } from 'react';
import { Button, Input, Table, TableHeader, TableRow, TableHead, TableCell, Card, CardHeader, CardTitle, CardContent, useToast } from '../components/UI';
import { Plus, Trash2, Edit, Search } from 'lucide-react';
import { PaginatedResult, QueryParams } from '../domain/types';
import { cleanNumber } from '../domain/validators';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface GenericCrudProps<T extends { id: string }> {
  title: string;
  columns: Column<T>[];
  repo: {
    list: (params?: QueryParams) => Promise<PaginatedResult<T>>;
    create: (data: Partial<T>) => Promise<T>;
    update: (id: string, data: Partial<T>) => Promise<T>;
    remove: (id: string) => Promise<void>;
  };
  fields: { key: keyof T; label: string; type?: 'text' | 'number' }[];
  filters?: { key: string; label: string; options: { label: string; value: string }[] }[];
  validate?: (data: Partial<T>) => { valid: boolean; error?: string };
}

export function GenericCrud<T extends { id: string }>({ title, columns, repo, fields, filters, validate }: GenericCrudProps<T>) {
  const { addToast } = useToast();
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Params State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const loadData = async () => {
    try {
      const result = await repo.list({
        page,
        limit: 10,
        search,
        filters: activeFilters
      });
      setData(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) {
      addToast('error', 'Erro ao carregar dados.');
    }
  };

  useEffect(() => { loadData(); }, [page, search, activeFilters]);

  const handleInputChange = (key: string, value: string) => {
    // If field is whatsapp or looks like a phone, clean it
    if (key === 'whatsapp' || key === 'phone') {
      value = cleanNumber(value);
    }
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (validate) {
      const validation = validate(formData);
      if (!validation.valid) {
        addToast('warning', validation.error || 'Dados inválidos');
        return;
      }
    }

    try {
      if (isEditing) await repo.update(isEditing, formData);
      else await repo.create(formData);
      
      addToast('success', isEditing ? 'Atualizado com sucesso!' : 'Criado com sucesso!');
      setShowModal(false);
      setIsEditing(null);
      setFormData({});
      loadData();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao salvar.');
    }
  };

  const handleEdit = (item: T) => {
    setFormData(item);
    setIsEditing(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza?')) {
      try {
        await repo.remove(id);
        addToast('success', 'Item excluído.');
        loadData();
      } catch (error: any) {
        addToast('error', error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button onClick={() => { setIsEditing(null); setFormData({}); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        
        {filters?.map(f => (
          <select
            key={f.key}
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={activeFilters[f.key] || ''}
            onChange={e => {
               setActiveFilters(prev => ({ ...prev, [f.key]: e.target.value }));
               setPage(1);
            }}
          >
            <option value="">{f.label}: Todos</option>
            {f.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => <TableHead key={String(col.key)}>{col.label}</TableHead>)}
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <tbody>
            {data.length === 0 ? (
               <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-8 text-gray-500">Nenhum registro encontrado.</TableCell></TableRow>
            ) : (
              data.map(item => (
                <TableRow key={item.id}>
                  {columns.map(col => (
                    <TableCell key={String(col.key)}>
                      {col.render ? col.render(item) : String(item[col.key] || '')}
                    </TableCell>
                  ))}
                  <TableCell className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <div>Total: {total} registros</div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="flex items-center px-2">Página {page} de {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>{isEditing ? 'Editar' : 'Novo'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                {fields.map(field => (
                  <Input 
                    key={String(field.key)}
                    label={field.label}
                    type={field.type || 'text'}
                    value={formData[field.key] || ''}
                    onChange={e => handleInputChange(String(field.key), e.target.value)}
                    required
                  />
                ))}
                <div className="flex justify-end gap-2 mt-4">
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