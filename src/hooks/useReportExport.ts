import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  summaryData?: { label: string; value: string }[];
}

export function useReportExport() {
  const exportToExcel = useCallback((options: ExportOptions) => {
    try {
      const { filename, columns, data, title, subtitle, summaryData } = options;

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Prepare data rows
      const wsData: (string | number)[][] = [];

      // Add title
      wsData.push([title]);
      if (subtitle) {
        wsData.push([subtitle]);
      }
      wsData.push([]); // Empty row

      // Add summary if provided
      if (summaryData && summaryData.length > 0) {
        summaryData.forEach(item => {
          wsData.push([item.label, item.value]);
        });
        wsData.push([]); // Empty row
      }

      // Add headers
      wsData.push(columns.map(col => col.header));

      // Add data rows
      data.forEach(row => {
        wsData.push(columns.map(col => {
          const value = row[col.key];
          return value !== undefined && value !== null ? String(value) : '';
        }));
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = columns.map(col => ({ wch: col.width || 20 }));

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

      // Generate file
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success('Relatório exportado para Excel!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Erro ao exportar para Excel');
    }
  }, []);

  const exportToPDF = useCallback((options: ExportOptions) => {
    try {
      const { filename, columns, data, title, subtitle, summaryData } = options;

      // Create PDF document
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 20);

      // Add subtitle
      if (subtitle) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(subtitle, 14, 28);
      }

      let yPosition = subtitle ? 35 : 30;

      // Add summary cards
      if (summaryData && summaryData.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(60);
        
        summaryData.forEach((item, index) => {
          const xPos = 14 + (index % 2) * 95;
          const yPos = yPosition + Math.floor(index / 2) * 12;
          
          doc.setFont('helvetica', 'normal');
          doc.text(item.label + ':', xPos, yPos);
          doc.setFont('helvetica', 'bold');
          doc.text(item.value, xPos + 50, yPos);
        });
        
        yPosition += Math.ceil(summaryData.length / 2) * 12 + 10;
      }

      // Add table
      doc.setTextColor(0);
      autoTable(doc, {
        startY: yPosition,
        head: [columns.map(col => col.header)],
        body: data.map(row => 
          columns.map(col => {
            const value = row[col.key];
            return value !== undefined && value !== null ? String(value) : '';
          })
        ),
        theme: 'striped',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        margin: { top: 10, left: 14, right: 14 },
        styles: {
          cellPadding: 3,
          overflow: 'linebreak',
        },
      });

      // Add footer with date
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
          14,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
      }

      // Save PDF
      doc.save(`${filename}.pdf`);
      toast.success('Relatório exportado para PDF!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Erro ao exportar para PDF');
    }
  }, []);

  return { exportToExcel, exportToPDF };
}
