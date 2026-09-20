import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportTable {
  headers: string[];
  rows: string[][];
}

export interface SimulationReport {
  catalog: string;
  algorithm: string;
  filename: string;
  inputLines: string[];
  resultLines: string[];
  resultTable?: ReportTable;
  conclusion: string[];
}

const MARGIN = 16;
const PRIMARY: [number, number, number] = [29, 78, 216];

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed < pageHeight - 16) {
    return y;
  }
  doc.addPage();
  return 20;
}

function writeParagraphs(doc: jsPDF, lines: string[], y: number): number {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(18, 32, 51);
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, width) as string[];
    y = ensureSpace(doc, y, wrapped.length * 5.4 + 2);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 5.4 + 2.4;
  }
  return y;
}

export function downloadSimulationPdf(report: SimulationReport): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const date = new Date().toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, width, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(report.algorithm, MARGIN, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${report.catalog}  ·  ${date}`, MARGIN, 21);

  let y = 40;
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Entrada de la simulación', MARGIN, y);
  y = writeParagraphs(doc, report.inputLines, y + 8);

  y += 4;
  y = ensureSpace(doc, y, 12);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Resultado de la ejecución', MARGIN, y);
  y = writeParagraphs(doc, report.resultLines, y + 8);

  if (report.resultTable && report.resultTable.rows.length) {
    y = ensureSpace(doc, y, 20);
    autoTable(doc, {
      startY: y,
      head: [report.resultTable.headers],
      body: report.resultTable.rows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: PRIMARY, textColor: 255 },
      alternateRowStyles: { fillColor: [243, 246, 251] },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  }

  y = ensureSpace(doc, y, 16);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Conclusión', MARGIN, y);
  y = writeParagraphs(doc, report.conclusion, y + 8);

  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text('Algoritmos y simuladores  ·  AOA · APPSO · ARD', MARGIN, doc.internal.pageSize.getHeight() - 10);

  doc.save(report.filename);
}

export function reportFilename(prefix: string, slug: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${slug}-${stamp}.pdf`;
}
