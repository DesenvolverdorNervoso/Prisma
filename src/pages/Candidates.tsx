import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { candidatesService } from '../services/candidates.service';
import { Candidate } from '../domain/types';
import { CANDIDATE_CATEGORIES, CANDIDATE_STATUS_OPTIONS } from '../domain/constants';
import { 
  Button, Select, Table, TableHeader, TableRow, TableHead, TableCell, 
  Badge, Card, useToast, Modal, Skeleton 
} from '../components/UI';
import { Plus, ExternalLink, Trash2, Edit, Search, Clock } from 'lucide-react';
import { CandidateWizard } from '../components/CandidateWizard';
import { storageService } from '../services/storage.service';

export const Candidates: React.FC = () => {
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // List State
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sync search state with URL
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null && urlSearch !== search) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<Candidate>>({});

  // CV Viewer Modal State
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvMime, setCvMime] = useState<string | null>(null);
  const [cvName, setCvName] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await candidatesService.list({
        page,
        limit: 10,
        search,
        filters: { category, status: statusFilter }
      });
      setCandidates(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) {
      addToast('error', 'Erro ao carregar candidatos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [page, search, category, statusFilter]);

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

  const handleSave = async (formData: Partial<Candidate>) => {
    try {
      if (isEditing) {
        await candidatesService.update(isEditing, formData);
        addToast('success', 'Candidato atualizado.');
      } else {
        await candidatesService.createInternal(formData);
        addToast('success', 'Candidato criado com sucesso.');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      addToast('error', error.message);
      throw error; // Re-throw for Wizard to handle state
    }
  };

  const handleEdit = (c: Candidate) => {
    setEditingData(c);
    setIsEditing(c.id);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingData({});
    setIsEditing(null);
    setShowModal(true);
  };

  const handleDelete = async (candidate: Candidate) => {
    if (confirm(`Tem certeza que deseja excluir ${candidate.name}?`)) {
      try {
        await candidatesService.delete(candidate.id);
        addToast('success', 'Candidato excluído.');
        loadData();
      } catch (error: any) {
        addToast('error', error.message);
      }
    }
  };

  const handleViewFile = async (c: Candidate) => {
    let urlToOpen = '';
    let mimeType = c.cv_mime || '';
    let fileName = c.cv_name || 'curriculo';

    // 1. Check cv_path (New standard)
    if (c.cv_path) {
      if (!c.cv_path.includes('/')) {
        addToast('warning', 'Este currículo possui um formato antigo e não pode ser aberto.');
        return;
      }
      try {
        const signedUrl = await storageService.getSignedUrl(c.cv_path, 600);
        if (signedUrl) {
          urlToOpen = signedUrl;
        }
      } catch (e) {
        console.error("Erro ao abrir cv_path:", e);
      }
    }

    // 2. Fallback to cv_url (Legacy)
    if (!urlToOpen && c.cv_url) {
      if (c.cv_url.startsWith('http')) {
        urlToOpen = c.cv_url;
      } else {
        // If it's a UUID/ID, try local storage service (IndexedDB)
        try {
          const localUrl = await storageService.getFile(c.cv_url);
          if (localUrl) {
            urlToOpen = localUrl;
          }
        } catch (e) {
          console.error("Erro ao abrir cv_url local:", e);
        }
      }
    }

    // 3. Fallback to resume_path (Legacy)
    if (!urlToOpen && c.resume_path) {
      try {
        const signedUrl = await storageService.getSignedUrl(c.resume_path, 600);
        if (signedUrl) {
          urlToOpen = signedUrl;
        }
      } catch (e) {
        console.error("Erro ao abrir resume_path:", e);
      }
    }

    if (urlToOpen) {
      // If it's an external link that might not work in iframe, or if we just want to open it
      // But the requirement is internal visualization.
      setCvUrl(urlToOpen);
      setCvMime(mimeType);
      setCvName(fileName);
      setIsCvModalOpen(true);
    } else {
      addToast('error', 'Currículo não encontrado ou formato incompatível.');
    }
  };

  const getExpirationBadge = (dateStr?: string) => {
    if (!dateStr) return null;
    const daysLeft = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return <Badge variant="error">Expirado</Badge>;
    if (daysLeft <= 15) return <Badge variant="warning">{daysLeft} dias</Badge>;
    return <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {daysLeft} dias</span>;
  };

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary-900 dark:text-dark-text">Candidatos</h2>
          <p className="text-primary-500 mt-1 dark:text-dark-muted">Gerencie seu banco de talentos e processos seletivos.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">Exportar</Button>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" /> Novo Candidato
          </Button>
        </div>
      </div>

      {/* FILTERS & ACTIONS CARD */}
      <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-soft flex flex-col md:flex-row gap-4 items-center dark:bg-dark-card dark:border-dark-border dark:shadow-dark-soft">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400 dark:text-dark-muted" />
          <input 
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-primary-200 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder:text-slate-500"
            placeholder="Buscar por nome, telefone ou email..." 
            value={search} 
            onChange={e => handleSearchChange(e.target.value)} 
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="w-48">
            <Select 
              options={CANDIDATE_CATEGORIES.map(c => ({ label: c, value: c }))}
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1); }}
              placeholder="Categoria"
            />
          </div>
          <div className="w-48">
            <Select 
              options={CANDIDATE_STATUS_OPTIONS.map(c => ({ label: c, value: c }))}
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              placeholder="Status"
            />
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden border-0 shadow-medium">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin scrollbar-thumb-primary-200 scrollbar-track-transparent">
          <Table className="min-w-[1000px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px] sticky left-0 bg-primary-50/90 backdrop-blur-sm z-30 dark:bg-slate-900/90">Nome / Info</TableHead>
                <TableHead className="w-[180px]">Categoria</TableHead>
                <TableHead className="w-[150px]">Cidade</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="w-[150px]">Validade</TableHead>
                <TableHead className="w-[120px] text-right sticky right-0 bg-primary-50/90 backdrop-blur-sm z-30 dark:bg-slate-900/90">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <tbody className="divide-y divide-primary-100 dark:divide-dark-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="sticky left-0 bg-white/90 backdrop-blur-sm z-10 dark:bg-dark-card/90"><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell className="sticky right-0 bg-white/90 backdrop-blur-sm z-10 dark:bg-dark-card/90"><Skeleton className="h-8 w-full float-right" /></TableCell>
                  </TableRow>
                ))
              ) : candidates.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-primary-500 dark:text-dark-muted">Nenhum candidato encontrado.</TableCell></TableRow>
              ) : (
                candidates.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="sticky left-0 bg-white/90 backdrop-blur-sm z-10 dark:bg-dark-card/90">
                      <div className="flex flex-col max-w-full">
                        <span className="font-semibold text-primary-900 dark:text-dark-text truncate line-clamp-2 whitespace-normal" title={c.name}>{c.name}</span>
                        <span className="text-xs text-primary-500 dark:text-dark-muted truncate">{c.whatsapp}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="neutral">{c.category}</Badge></TableCell>
                    <TableCell className="truncate">{c.city}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'Novo' ? 'warning' : c.status === 'Contratado' ? 'success' : c.status === 'Reprovado' ? 'error' : 'brand'}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getExpirationBadge(c.profile_expires_at)}
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-white/90 backdrop-blur-sm z-10 dark:bg-dark-card/90">
                      <div className="flex justify-end gap-1">
                        {(c.cv_path || c.cv_url || c.resume_file_url || c.resume_path) && (
                          <button 
                              onClick={() => handleViewFile(c)} 
                              className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors dark:text-brand-400 dark:hover:bg-slate-800"
                              title="Ver Currículo"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleEdit(c)} className="p-2 text-primary-500 hover:text-brand-600 hover:bg-primary-50 rounded-lg transition-colors dark:text-dark-muted dark:hover:text-white dark:hover:bg-slate-800"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(c)} className="p-2 text-primary-500 hover:text-error hover:bg-error/10 rounded-lg transition-colors dark:text-dark-muted dark:hover:text-red-400 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
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
          <p className="text-sm text-primary-500 dark:text-dark-muted">Mostrando <span className="font-medium text-primary-900 dark:text-dark-text">{candidates.length}</span> de <span className="font-medium text-primary-900 dark:text-dark-text">{total}</span> registros</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>

      {/* FORM MODAL (WIZARD) */}
      {showModal && (
        <Modal 
          title={isEditing ? 'Editar Candidato' : 'Novo Candidato'} 
          onClose={() => setShowModal(false)}
          size="xl" 
        >
          <CandidateWizard 
            mode="internal"
            initialData={editingData}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}

      {/* CV VIEWER MODAL */}
      {isCvModalOpen && cvUrl && (
        <Modal
          title={`Currículo: ${cvName || 'Visualização'}`}
          onClose={() => {
            setIsCvModalOpen(false);
            setCvUrl(null);
          }}
          size="xl"
        >
          <div className="flex flex-col h-[80vh]">
            <div className="flex-1 bg-slate-100 rounded-lg overflow-hidden relative">
              {cvUrl.toLowerCase().includes('.pdf') || cvMime?.includes('pdf') ? (
                <iframe 
                  src={`${cvUrl}#toolbar=0`} 
                  className="w-full h-full border-none"
                  title="PDF Viewer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img 
                    src={cvUrl} 
                    alt="Currículo" 
                    className="max-w-full h-auto shadow-lg rounded"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCvModalOpen(false)}>
                Fechar
              </Button>
              <Button onClick={() => window.open(cvUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" /> Baixar / Abrir Original
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};