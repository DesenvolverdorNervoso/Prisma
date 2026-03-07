import React, { useState, useEffect, useMemo } from 'react';
import { jobsService } from '../services/jobs.service';
import { profileService } from '../services/profile.service';
import { supabase } from '../lib/supabaseClient';
import { Job, PublicInvite } from '../domain/types';
import { 
  Button, Card, useToast, Table, TableHeader, TableRow, TableHead, TableCell, Badge, Skeleton, Input,
  Tabs, cn
} from '../components/UI';
import { Link as LinkIcon, Copy, MessageSquare, Share2, X, Trash2, Power, Search, Filter, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type InviteStatus = 'Ativo' | 'Expirado' | 'Usado' | 'Inativo';

export const InscriptionLinksV2: React.FC = () => {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invites, setInvites] = useState<PublicInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<Partial<PublicInvite> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadJobs = async () => {
    try {
      const result = await jobsService.list({ limit: 100, filters: { status: 'Em aberto' } });
      setJobs(result.data);
    } catch (e) {
      addToast('error', 'Erro ao carregar vagas.');
    }
  };

  const loadInvites = async (tId: string) => {
    setInvitesLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_invites')
        .select('*')
        .eq('tenant_id', tId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const allInvites = data || [];
      setInvites(allInvites);

      // Identify expired invites that are still active
      const now = new Date();
      const expiredIds = allInvites
        .filter(invite => invite.is_active && new Date(invite.expires_at) < now)
        .map(invite => invite.id);

      if (expiredIds.length > 0) {
        console.log(`Deactivating ${expiredIds.length} expired invites...`);
        const { error: updateError } = await supabase
          .from('public_invites')
          .update({ is_active: false })
          .in('id', expiredIds);

        if (updateError) {
          console.error('Error auto-deactivating expired invites:', updateError);
        } else {
          // Update local state to reflect changes
          setInvites(prev => prev.map(invite => 
            expiredIds.includes(invite.id) ? { ...invite, is_active: false } : invite
          ));
        }
      }
    } catch (e) {
      console.error('Error loading invites:', e);
      addToast('error', 'Erro ao carregar convites.');
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const profile = await profileService.getCurrentProfile();
        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id);
          await Promise.all([
            loadJobs(),
            loadInvites(profile.tenant_id)
          ]);
        }
      } catch (e) {
        addToast('error', 'Erro ao carregar dados iniciais.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const buildPublicLink = (token: string) => {
    if (!tenantId) return '';
    return `https://prisma-two-ruby.vercel.app/#/inscription?t=${tenantId}&token=${token}`;
  };

  const generateMessage = (link: string) => {
    return `Olá 👋

Você foi convidado(a) para se cadastrar no banco de talentos da Prisma RH.

Para concluir sua inscrição, acesse o link abaixo:

🔗 ${link}

⚠️ O link possui validade limitada.`;
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleGenerateInvite = async (jobId?: string) => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addToast('error', 'Sessão expirada. Faça login novamente.');
        return;
      }

      if (!tenantId) {
        addToast('error', 'Tenant não encontrado.');
        return;
      }

      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('public_invites')
        .insert({
          tenant_id: tenantId,
          job_id: jobId ?? null,
          token: token,
          mode: jobId ? 'job' : 'general',
          expires_at: expiresAt.toISOString(),
          max_uses: 1,
          uses: 0,
          is_active: true,
          created_by: session.user.id
        })
        .select('*')
        .single();

      if (error) throw new Error(`Erro ao gerar convite: ${error.message}`);
      if (!data) throw new Error('Erro ao gerar convite: Nenhum dado retornado.');

      setGeneratedInvite(data);
      setShowInviteModal(true);
      addToast('success', 'Convite gerado com sucesso!');
      
      // Refresh list
      loadInvites(tenantId);
    } catch (e: any) {
      console.error('Invite generation error:', e);
      addToast('error', e.message || 'Erro desconhecido ao gerar convite.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeactivateInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('public_invites')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      addToast('success', 'Convite desativado com sucesso!');
      if (tenantId) loadInvites(tenantId);
    } catch (e) {
      addToast('error', 'Erro ao desativar convite.');
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este convite?')) return;
    try {
      const { error } = await supabase
        .from('public_invites')
        .delete()
        .eq('id', id);

      if (error) throw error;
      addToast('success', 'Convite excluído com sucesso!');
      if (tenantId) loadInvites(tenantId);
    } catch (e) {
      addToast('error', 'Erro ao excluir convite.');
    }
  };

  const getInviteStatus = (invite: PublicInvite): InviteStatus => {
    if (!invite.is_active) {
      // Check if it was deactivated because it expired or was used
      if (new Date(invite.expires_at) < new Date()) return 'Expirado';
      if (invite.max_uses !== null && invite.uses >= invite.max_uses) return 'Usado';
      return 'Inativo';
    }
    if (new Date(invite.expires_at) < new Date()) return 'Expirado';
    if (invite.max_uses !== null && invite.uses >= invite.max_uses) return 'Usado';
    return 'Ativo';
  };

  const getStatusBadge = (status: InviteStatus) => {
    switch (status) {
      case 'Ativo': return <Badge variant="success">Ativo</Badge>;
      case 'Expirado': return <Badge variant="warning">Expirado</Badge>;
      case 'Usado': return <Badge variant="brand">Usado</Badge>;
      case 'Inativo': return <Badge variant="neutral">Inativo</Badge>;
    }
  };

  const filteredInvites = useMemo(() => {
    return invites.filter(invite => {
      const status = getInviteStatus(invite);
      const matchesStatus = statusFilter === 'all' || status.toLowerCase() === statusFilter;
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        invite.token.toLowerCase().includes(searchLower) ||
        invite.mode.toLowerCase().includes(searchLower) ||
        (invite.job_id && invite.job_id.toLowerCase().includes(searchLower));

      return matchesStatus && matchesSearch;
    });
  }, [invites, searchQuery, statusFilter]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast('success', `${label} copiado para a área de transferência!`);
  };

  const shareWhatsApp = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const tabs = [
    { id: 'all', label: 'Todos' },
    { id: 'ativo', label: 'Ativos' },
    { id: 'expirado', label: 'Expirados' },
    { id: 'usado', label: 'Usados' },
    { id: 'inativo', label: 'Inativos' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Links de Inscrição V2</h2>
          <p className="text-slate-500 mt-1 dark:text-slate-400">Gere e compartilhe links para candidatos se inscreverem publicamente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Generation Cards */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 border-brand-100 bg-brand-50/30 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 dark:bg-brand-900/30">
                <LinkIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Link Geral</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Captação geral de currículos para o banco de talentos.</p>
                <Button className="w-full" onClick={() => handleGenerateInvite()} disabled={isGenerating}>
                  <Share2 className="w-4 h-4 mr-2" /> Gerar Convite Geral
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="w-4 h-4" /> Links por Vaga
            </h3>
            <Card className="overflow-hidden border-0 shadow-medium dark:bg-slate-900 max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vaga</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 float-right" /></TableCell>
                      </TableRow>
                    ))
                  ) : jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-slate-500 text-xs">
                        Nenhuma vaga em aberto.
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobs.map(job => (
                      <TableRow key={job.id}>
                        <TableCell className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px]">{job.title}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleGenerateInvite(job.id)}
                            disabled={isGenerating}
                            title="Gerar link para esta vaga"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </tbody>
              </Table>
            </Card>
          </div>
        </div>

        {/* Right Column: Invites Listing */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Convites Gerados</h3>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Buscar por token ou modo..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Tabs tabs={tabs} active={statusFilter} onChange={setStatusFilter} />

          <Card className="overflow-hidden border-0 shadow-medium dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invitesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 float-right" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredInvites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      Nenhum convite encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvites.map(invite => {
                    const status = getInviteStatus(invite);
                    const link = buildPublicLink(invite.token);
                    const message = generateMessage(link);
                    const job = jobs.find(j => j.id === invite.job_id);

                    return (
                      <TableRow key={invite.id}>
                        <TableCell>
                          <span className="font-mono text-sm font-bold text-brand-600">{invite.token}</span>
                        </TableCell>
                        <TableCell>
                          {!invite.job_id ? (
                            <Badge variant="neutral">Banco de Talentos</Badge>
                          ) : job ? (
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{job.title}</span>
                          ) : (
                            <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Vaga não encontrada
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {format(new Date(invite.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {format(new Date(invite.expires_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {invite.uses} / {invite.max_uses || '∞'}
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" size="sm" 
                              onClick={() => copyToClipboard(link, 'Link')}
                              title="Copiar Link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" size="sm" 
                              onClick={() => shareWhatsApp(message)}
                              className={cn(
                                "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20",
                                (status === 'Expirado' || status === 'Inativo' || status === 'Usado') && "opacity-30 grayscale pointer-events-none"
                              )}
                              title={status === 'Ativo' ? "Compartilhar no WhatsApp" : "Convite indisponível"}
                              disabled={status !== 'Ativo'}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                            {status === 'Ativo' && (
                              <Button 
                                variant="ghost" size="sm" 
                                onClick={() => handleDeactivateInvite(invite.id)}
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                title="Desativar Convite"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" size="sm" 
                              onClick={() => handleDeleteInvite(invite.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Excluir Convite"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && generatedInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center text-brand-600">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Convite Gerado</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Link Público</label>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={buildPublicLink(generatedInvite.token!)} 
                      className="bg-slate-50 dark:bg-slate-800/50"
                    />
                    <Button 
                      variant="secondary" 
                      onClick={() => copyToClipboard(buildPublicLink(generatedInvite.token!), 'Link')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensagem para Candidato</label>
                  <textarea 
                    readOnly 
                    rows={8}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200"
                    value={generateMessage(buildPublicLink(generatedInvite.token!))}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      onClick={() => copyToClipboard(generateMessage(buildPublicLink(generatedInvite.token!)), 'Mensagem')}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copiar Mensagem
                    </Button>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => shareWhatsApp(generateMessage(buildPublicLink(generatedInvite.token!)))}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button onClick={() => setShowInviteModal(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
