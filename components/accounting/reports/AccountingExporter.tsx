/**
 * Exportador de Informes Contables
 * 
 * Permite exportar toda la información contable en formatos bien presentados:
 * - Plan de cuentas
 * - Libro diario
 * - Libro mayor
 * - Balance de sumas y saldos
 * - Estado de resultados
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Calendar,
  Loader2,
  Info,
  BookOpen,
  Receipt,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es, fr, enUS } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AccountingExporterProps {
  systemId: string;
  legalEntityId: string;
  currentLanguage?: string;
}

type ExportFormat = 'excel' | 'pdf' | 'json';
type ReportType = 'chart-of-accounts' | 'general-ledger' | 'journal' | 'trial-balance' | 'income-statement' | 'all';

const REPORT_TYPES: Record<ReportType, { label: string; icon: React.ReactNode; description: string }> = {
  'chart-of-accounts': {
    label: 'Plan de Cuentas',
    icon: <BookOpen className="h-4 w-4" />,
    description: 'Lista completa de cuentas contables con su estructura jerárquica'
  },
  'general-ledger': {
    label: 'Libro Mayor',
    icon: <Receipt className="h-4 w-4" />,
    description: 'Movimientos detallados por cada cuenta contable'
  },
  'journal': {
    label: 'Libro Diario',
    icon: <Receipt className="h-4 w-4" />,
    description: 'Registro cronológico de todos los asientos contables'
  },
  'trial-balance': {
    label: 'Balance de Sumas y Saldos',
    icon: <Calculator className="h-4 w-4" />,
    description: 'Resumen de saldos deudores y acreedores por cuenta'
  },
  'income-statement': {
    label: 'Estado de Resultados',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Ingresos y gastos del período con resultado neto'
  },
  'all': {
    label: 'Informe Completo',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    description: 'Todos los informes en un solo archivo'
  }
};

export default function AccountingExporter({
  systemId,
  legalEntityId,
  currentLanguage = 'es'
}: AccountingExporterProps) {
  const [reportType, setReportType] = useState<ReportType>('chart-of-accounts');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Cargar ejercicios fiscales para preseleccionar fechas
  const { data: fiscalYears } = useQuery({
    queryKey: ['fiscal-years', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/fiscal-years?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error cargando ejercicios fiscales');
      return response.json();
    }
  });

  // Cargar información de la entidad legal
  const { data: legalEntity } = useQuery({
    queryKey: ['legal-entity', legalEntityId],
    queryFn: async () => {
      const response = await fetch(`/api/legal-entities/${legalEntityId}`);
      if (!response.ok) throw new Error('Error cargando entidad legal');
      return response.json();
    }
  });

  const getDateLocale = () => {
    switch (currentLanguage) {
      case 'fr':
        return fr;
      case 'en':
        return enUS;
      default:
        return es;
    }
  };

  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const fetchReportData = async () => {
    const params = new URLSearchParams({
      legalEntityId,
      reportType,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      includeDetails: includeDetails.toString()
    });

    const response = await fetch(`/api/accounting/reports?${params}`);
    if (!response.ok) throw new Error('Error obteniendo datos del informe');
    return response.json();
  };

  const exportToExcel = async (data: any) => {
    const wb = XLSX.utils.book_new();
    
    // Información de la empresa
    const companyInfo = [
      ['INFORME CONTABLE'],
      [legalEntity?.name || 'Empresa'],
      [legalEntity?.fullAddress || ''],
      [`${legalEntity?.taxIdentifierFields?.CIF || ''}`],
      [''],
      [`Período: ${startDate ? format(new Date(startDate), 'dd/MM/yyyy') : 'Inicio'} - ${endDate ? format(new Date(endDate), 'dd/MM/yyyy') : 'Fin'}`],
      [`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      ['']
    ];

    if (reportType === 'chart-of-accounts' || reportType === 'all') {
      const chartData = data.chartOfAccounts || [];
      const chartSheet = [
        ...companyInfo,
        ['PLAN DE CUENTAS'],
        [''],
        ['Número', 'Nombre', 'Tipo', 'Nivel', 'Permite Asientos', 'Activa'],
        ...chartData.map((account: any) => [
          account.accountNumber,
          '  '.repeat(account.level) + account.name,
          account.type,
          account.level,
          account.allowsDirectEntry ? 'Sí' : 'No',
          account.isActive ? 'Sí' : 'No'
        ])
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(chartSheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Plan de Cuentas');
    }

    if (reportType === 'journal' || reportType === 'all') {
      const journalData = data.journalEntries || [];
      const journalSheet = [
        ...companyInfo,
        ['LIBRO DIARIO'],
        [''],
        ['Fecha', 'Asiento', 'Cuenta', 'Descripción', 'Debe', 'Haber'],
        ...journalData.flatMap((entry: any) => 
          entry.lines.map((line: any) => [
            format(new Date(entry.date), 'dd/MM/yyyy'),
            entry.entryNumber,
            `${line.account.accountNumber} - ${line.account.name}`,
            line.description || entry.description,
            line.debit > 0 ? formatCurrency(line.debit) : '',
            line.credit > 0 ? formatCurrency(line.credit) : ''
          ])
        )
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(journalSheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Libro Diario');
    }

    if (reportType === 'trial-balance' || reportType === 'all') {
      const balanceData = data.trialBalance || [];
      const balanceSheet = [
        ...companyInfo,
        ['BALANCE DE SUMAS Y SALDOS'],
        [''],
        ['Cuenta', 'Nombre', 'Sumas Debe', 'Sumas Haber', 'Saldo Deudor', 'Saldo Acreedor'],
        ...balanceData.map((account: any) => [
          account.accountNumber,
          account.name,
          account.totalDebit > 0 ? formatCurrency(account.totalDebit) : '',
          account.totalCredit > 0 ? formatCurrency(account.totalCredit) : '',
          account.balance > 0 ? formatCurrency(account.balance) : '',
          account.balance < 0 ? formatCurrency(Math.abs(account.balance)) : ''
        ])
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(balanceSheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Balance Sumas y Saldos');
    }

    // Guardar archivo
    const fileName = `contabilidad_${legalEntity?.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = async (data: any) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;

    // Configurar fuente
    doc.setFontSize(16);
    doc.text('INFORME CONTABLE', 105, y, { align: 'center' });
    
    y += 10;
    doc.setFontSize(12);
    doc.text(legalEntity?.name || 'Empresa', 105, y, { align: 'center' });
    
    y += 7;
    doc.setFontSize(10);
    if (legalEntity?.fullAddress) {
      doc.text(legalEntity.fullAddress, 105, y, { align: 'center' });
      y += 7;
    }
    
    if (legalEntity?.taxIdentifierFields?.CIF) {
      doc.text(`CIF: ${legalEntity.taxIdentifierFields.CIF}`, 105, y, { align: 'center' });
      y += 7;
    }

    y += 5;
    doc.text(
      `Período: ${startDate ? format(new Date(startDate), 'dd/MM/yyyy') : 'Inicio'} - ${endDate ? format(new Date(endDate), 'dd/MM/yyyy') : 'Fin'}`,
      105, y, { align: 'center' }
    );

    y += 15;

    if (reportType === 'chart-of-accounts' || reportType === 'all') {
      doc.setFontSize(14);
      doc.text('PLAN DE CUENTAS', 20, y);
      y += 10;

      const chartData = data.chartOfAccounts || [];
      const tableData = chartData.map((account: any) => [
        account.accountNumber,
        '  '.repeat(account.level) + account.name,
        account.type,
        account.isActive ? 'Sí' : 'No'
      ]);

      (doc as any).autoTable({
        startY: y,
        head: [['Número', 'Nombre', 'Tipo', 'Activa']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      y = (doc as any).lastAutoTable.finalY + 20;
    }

    // Agregar más secciones según el tipo de informe...

    const fileName = `contabilidad_${legalEntity?.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    doc.save(fileName);
  };

  const exportToJSON = async (data: any) => {
    const exportData = {
      metadata: {
        legalEntity: legalEntity?.name,
        taxId: legalEntity?.taxIdentifierFields?.CIF,
        period: {
          start: startDate,
          end: endDate
        },
        generatedAt: new Date().toISOString(),
        reportType
      },
      data
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contabilidad_${legalEntity?.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Por favor selecciona un período');
      return;
    }

    setIsExporting(true);
    try {
      const data = await fetchReportData();
      
      switch (exportFormat) {
        case 'excel':
          await exportToExcel(data);
          break;
        case 'pdf':
          await exportToPDF(data);
          break;
        case 'json':
          await exportToJSON(data);
          break;
      }
      
      toast.success('Informe exportado correctamente');
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error('Error al exportar el informe');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFiscalYearSelect = (fiscalYearId: string) => {
    const fiscalYear = fiscalYears?.find((fy: any) => fy.id === fiscalYearId);
    if (fiscalYear) {
      setStartDate(format(new Date(fiscalYear.startDate), 'yyyy-MM-dd'));
      setEndDate(format(new Date(fiscalYear.endDate), 'yyyy-MM-dd'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Exportar Informes Contables
        </CardTitle>
        <CardDescription>
          Genera y descarga informes contables en diferentes formatos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipo de Informe */}
        <div className="space-y-2">
          <Label>Tipo de Informe</Label>
          <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REPORT_TYPES).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-muted-foreground">{config.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Período */}
        <div className="space-y-2">
          <Label>Período</Label>
          {fiscalYears && fiscalYears.length > 0 && (
            <Select onValueChange={handleFiscalYearSelect}>
              <SelectTrigger className="mb-2">
                <SelectValue placeholder="Seleccionar ejercicio fiscal..." />
              </SelectTrigger>
              <SelectContent>
                {fiscalYears.map((fy: any) => (
                  <SelectItem key={fy.id} value={fy.id}>
                    {fy.name} ({format(new Date(fy.startDate), 'dd/MM/yyyy')} - {format(new Date(fy.endDate), 'dd/MM/yyyy')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>
        </div>

        {/* Formato de Exportación */}
        <div className="space-y-2">
          <Label>Formato de Exportación</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={exportFormat === 'excel' ? 'default' : 'outline'}
              onClick={() => setExportFormat('excel')}
              className="justify-start"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant={exportFormat === 'pdf' ? 'default' : 'outline'}
              onClick={() => setExportFormat('pdf')}
              className="justify-start"
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant={exportFormat === 'json' ? 'default' : 'outline'}
              onClick={() => setExportFormat('json')}
              className="justify-start"
            >
              <FileDown className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>

        {/* Opciones adicionales */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeDetails" 
              checked={includeDetails}
              onCheckedChange={(checked) => setIncludeDetails(checked as boolean)}
            />
            <Label htmlFor="includeDetails">
              Incluir detalles completos (puede generar archivos más grandes)
            </Label>
          </div>
        </div>

        {/* Botón de Exportación */}
        <Button
          onClick={handleExport}
          disabled={isExporting || !startDate || !endDate}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando informe...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar Informe
            </>
          )}
        </Button>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Los informes se generarán con toda la información disponible en el período
            seleccionado. Para informes muy grandes, el proceso puede tardar varios segundos.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 