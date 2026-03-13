import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, Candidate, Job, Company, PersonClient } from '../domain/types';
import { formatCurrency, formatDate } from '../utils/format';

export const pdfService = {
  generateContractPDF: async (
    contract: Contract,
    candidate: Candidate,
    job?: Job | null,
    contractor?: Company | PersonClient | null
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header - Prisma RH
    doc.setFontSize(24);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont('helvetica', 'bold');
    doc.text('Prisma RH', 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('helvetica', 'normal');
    doc.text('Consultoria em Recursos Humanos e Gestão de Talentos', 20, 32);
    
    // Horizontal Line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 38, pageWidth - 20, 38);
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRATO DE TRABALHO', pageWidth / 2, 55, { align: 'center' });
    
    let y = 75;
    
    // Section Helper
    const drawSectionHeader = (title: string, currentY: number) => {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(20, currentY - 6, pageWidth - 40, 8, 'F');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFont('helvetica', 'bold');
      doc.text(title, 22, currentY);
      return currentY + 12;
    };

    // Candidate Data
    y = drawSectionHeader('DADOS DO CANDIDATO', y);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome Completo: ${candidate.name}`, 25, y);
    y += 7;
    doc.text(`WhatsApp: ${candidate.whatsapp || 'Não informado'}`, 25, y);
    y += 7;
    doc.text(`E-mail: ${(candidate as any).email || 'Não informado'}`, 25, y);
    y += 7;
    doc.text(`Cidade: ${candidate.city || 'Não informado'}`, 25, y);
    y += 15;
    
    // Job Data
    if (job) {
      y = drawSectionHeader('DADOS DA VAGA', y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Título da Vaga: ${job.title}`, 25, y);
      y += 15;
    }
    
    // Contractor Data
    y = drawSectionHeader('DADOS DO CONTRATANTE', y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const contractorType = contract.contractor_type === 'company' ? 'Empresa (PJ)' : 'Cliente PF';
    doc.text(`Tipo de Contratante: ${contractorType}`, 25, y);
    y += 7;
    doc.text(`Nome: ${contractor?.name || contract.contractor_name || 'Não informado'}`, 25, y);
    y += 15;
    
    // Contract Details
    y = drawSectionHeader('DETALHES DO CONTRATO', y);
    
    const tableData = [
      ['Status', contract.status],
      ['Tipo de Contrato', contract.contract_type],
      ['Salário Mensal', formatCurrency(contract.salary)],
      ['Data de Início', formatDate(contract.start_date)],
      ['Data de Término', contract.end_date ? formatDate(contract.end_date) : 'Indeterminado']
    ];
    
    autoTable(doc, {
      startY: y - 4,
      head: [['Campo', 'Informação']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      margin: { left: 20, right: 20 }
    });
    
    y = (doc as any).lastAutoTable.finalY + 15;
    
    // Notes
    if (contract.notes) {
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 30;
      }
      y = drawSectionHeader('OBSERVAÇÕES ADICIONAIS', y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(contract.notes, pageWidth - 50);
      doc.text(splitNotes, 25, y);
      y += splitNotes.length * 5 + 15;
    }
    
    // Signatures
    if (y > doc.internal.pageSize.getHeight() - 70) {
      doc.addPage();
      y = 40;
    } else {
      y += 10;
    }
    
    const today = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(10);
    doc.text(`Emitido em: ${today}`, 20, y);
    y += 35;
    
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.line(25, y, 90, y);
    doc.line(120, y, 185, y);
    
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Responsável (Prisma RH)', 25, y);
    doc.text('Candidato', 120, y);
    
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(candidate.name, 120, y);
    
    // Footer Page Number
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save
    const safeName = candidate.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const fileName = `contrato-${safeName}.pdf`;
    doc.save(fileName);
  }
};
