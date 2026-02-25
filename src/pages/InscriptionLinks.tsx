
import React, { useState, useEffect } from 'react';
import { jobsService } from '../services/jobs.service';
import { profileService } from '../services/profile.service';
import { Job } from '../domain/types';
import { 
  Button, Card, useToast, Table, TableHeader, TableRow, TableHead, TableCell, Badge, Skeleton
} from '../components/UI';
import { Link as LinkIcon, Copy, Share2, ExternalLink, MessageSquare } from 'lucide-react';

export const InscriptionLinks: React.FC = () => {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

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

  const getBaseUrl = () => {
    // In production this would be the real domain
    return window.location.origin + '/#/public/apply';
  };

  const buildLink = (jobId?: string) => {
    if (!tenantId) return '';
    let url = `${getBaseUrl()}?t=${tenantId}`;
    if (jobId) url += `&j=${jobId}`;
    // In Step 2, we will add a security token 'k' here
    return url;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('success', 'Link copiado para a área de transferência!');
  };

  const shareWhatsApp = (link: string, title?: string) => {
    const message = title 
      ? `Olá! Candidate-se para a vaga de *${title}* na Prisma RH através deste link: ${link}`
      : `Olá! Cadastre seu currículo em nosso banco de talentos da Prisma RH: ${link}`;
    
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
              <Button size="sm" onClick={() => copyToClipboard(buildLink())}>
                <Copy className="w-4 h-4 mr-2" /> Copiar Link Geral
              </Button>
              <Button size="sm" variant="secondary" onClick={() => shareWhatsApp(buildLink())}>
                <MessageSquare className="w-4 h-4 mr-2" /> Enviar no WhatsApp
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
                          title="Copiar Link"
                          onClick={() => copyToClipboard(buildLink(job.id))}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="WhatsApp"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => shareWhatsApp(buildLink(job.id), job.title)}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Testar Link"
                          onClick={() => window.open(buildLink(job.id), '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
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
    </div>
  );
};
