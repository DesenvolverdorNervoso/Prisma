
import React, { useState, useEffect } from 'react';
import { jobsService } from '../services/jobs.service';
import { profileService } from '../services/profile.service';
import { authService } from '../services/auth.service';
import { Job, PublicInvite } from '../domain/types';
import { 
  Button, Card, useToast, Table, TableHeader, TableRow, TableHead, TableCell, Badge, Skeleton, Input
} from '../components/UI';
import { Link as LinkIcon, Copy, MessageSquare, Share2, X } from 'lucide-react';

export const InscriptionLinks: React.FC = () => {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<PublicInvite | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const profile = await profileService.getCurrentProfile();
        setTenantId(profile?.tenant_id || null);

        const result = await jobsService.list({ limit: 100, filters: { status: 'Em aberto' } });
        setJobs(result.data);
      } catch (e) {
        addToast('error', 'Erro ao carregar dados.');
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

  const handleGenerateInvite = async (jobId?: string) => {
  setIsGenerating(true);

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // ✅ sempre pega um token válido (e tenta refresh)
    const accessToken = await authService.getValidAccessToken();

    const response = await fetch(`${supabaseUrl}/functions/v1/create-public-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ job_id: jobId ?? null }),
    });

    const raw = await response.text();
    let result: any = null;
    try { result = raw ? JSON.parse(raw) : null; } catch {}

    if (!response.ok) {
      // ✅ log mais útil pra depurar
      const msg = result?.message || result?.error || `HTTP ${response.status}`;
      throw new Error(`${msg} | ${raw.slice(0, 200)}`);
    }

    setGeneratedInvite(result.invite);
    setShowInviteModal(true);
    addToast('success', 'Convite gerado com sucesso!');
  } catch (e: any) {
    addToast('error', 'Erro ao gerar convite: ' + (e?.message || 'Erro desconhecido'));
  } finally {
    setIsGenerating(false);
  }
};

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast('success', `${label} copiado para a área de transferência!`);
  };

  const shareWhatsApp = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary-900 dark:text-dark-text">Links de Inscrição</h2>
          <p className="text-primary-500 mt-1 dark:text-dark-muted">Gere e compartilhe links para candidatos se inscreverem publicamente.</p>
        </div>
      </div>

      {/* General Link Card */}
      <Card className="p-6 border-brand-100 bg-brand-50/30 dark:bg-brand-900/10 dark:border-brand-900/20">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 dark:bg-brand-900/30">
            <LinkIcon className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-primary-900 dark:text-dark-text">Link Geral (Banco de Talentos)</h3>
            <p className="text-sm text-primary-600 dark:text-dark-muted mb-4">Use este link para captação geral de currículos, sem vaga específica.</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Button size="sm" onClick={() => handleGenerateInvite()} disabled={isGenerating}>
                <Share2 className="w-4 h-4 mr-2" /> Gerar Convite Público
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Jobs Links Table */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-primary-900 dark:text-dark-text">Links por Vaga</h3>
        <Card className="overflow-hidden border-0 shadow-medium">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaga</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações de Compartilhamento</TableHead>
              </TableRow>
            </TableHeader>
            <tbody className="divide-y divide-primary-100 dark:divide-dark-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-48 float-right" /></TableCell>
                  </TableRow>
                ))
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-primary-500">
                    Nenhuma vaga em aberto encontrada para gerar links.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-primary-900 dark:text-dark-text">{job.title}</TableCell>
                    <TableCell className="text-primary-600 dark:text-dark-muted">{job.company_name}</TableCell>
                    <TableCell><Badge variant="success">{job.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Gerar Convite"
                          onClick={() => handleGenerateInvite(job.id)}
                          disabled={isGenerating}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </tbody>
          </Table>
        </Card>
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
                      value={buildPublicLink(generatedInvite.token)} 
                      className="bg-slate-50 dark:bg-slate-800/50"
                    />
                    <Button 
                      variant="secondary" 
                      onClick={() => copyToClipboard(buildPublicLink(generatedInvite.token), 'Link')}
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
                    value={generateMessage(buildPublicLink(generatedInvite.token))}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      onClick={() => copyToClipboard(generateMessage(buildPublicLink(generatedInvite.token)), 'Mensagem')}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copiar Mensagem
                    </Button>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => shareWhatsApp(generateMessage(buildPublicLink(generatedInvite.token)))}
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
