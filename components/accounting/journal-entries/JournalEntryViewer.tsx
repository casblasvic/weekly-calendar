/**
 * Visor de Asientos Contables
 * 
 * Permite a los contables:
 * - Ver todos los asientos contables del ejercicio
 * - Filtrar por fecha, cuenta, tipo de documento
 * - Ver detalles completos de cada asiento
 * - Exportar asientos seleccionados
 * - Verificar cuadre contable
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BookOpen,
  Filter,
  Download,
  Eye,
  Calendar,
  FileText,
  CreditCard,
  Banknote,
  CheckCircle,
  XCircle,
  Info,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  FolderOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// Importar componentes de asientos manuales y plantillas
import dynamic from 'next/dynamic';
const ManualJournalEntryForm = dynamic(
  () => import('./ManualJournalEntryForm'),
  { ssr: false }
);
const JournalEntryTemplates = dynamic(
  () => import('./JournalEntryTemplates'),
  { ssr: false }
);

interface JournalEntryViewerProps {
  systemId: string;
  legalEntityId: string;
  fiscalYearId?: string;
  currentLanguage?: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  ticketId?: string;
  paymentId?: string;
  cashSessionId?: string;
  lines: JournalEntryLine[];
  ticket?: {
    ticketNumber: string;
    type: string;
  };
  payment?: {
    id: string;
    amount: number;
  };
  cashSession?: {
    sessionNumber: string;
  };
}

interface JournalEntryLine {
  id: string;
  accountId: string;
  account: {
    accountNumber: string;
    name: string;
  };
  debit: number;
  credit: number;
  description?: string;
  vatAmount?: number;
  order: number;
}

export default function JournalEntryViewer({
  systemId,
  legalEntityId,
  fiscalYearId,
  currentLanguage = 'es'
}: JournalEntryViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedDocumentType, setSelectedDocumentType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Cargar asientos contables
  const { data: journalEntries, isLoading, refetch } = useQuery({
    queryKey: ['journal-entries', legalEntityId, fiscalYearId, currentPage, pageSize, searchTerm, selectedAccount, selectedDocumentType, startDate, endDate],
    queryFn: async () => {
      let url = `/api/journal-entries?legalEntityId=${legalEntityId}&page=${currentPage}&pageSize=${pageSize}`;
      
      if (fiscalYearId) url += `&fiscalYearId=${fiscalYearId}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (selectedAccount !== 'all') url += `&accountId=${selectedAccount}`;
      if (selectedDocumentType !== 'all') url += `&documentType=${selectedDocumentType}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Error cargando asientos');
      return response.json();
    }
  });

  // Cargar cuentas para el filtro
  const { data: accounts } = useQuery({
    queryKey: ['chart-accounts-filter', legalEntityId],
    queryFn: async () => {
      const response = await fetch(`/api/chart-of-accounts?legalEntityId=${legalEntityId}&isActive=true`);
      if (!response.ok) throw new Error('Error cargando cuentas');
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getDocumentTypeIcon = (entry: JournalEntry) => {
    if (entry.ticketId) return <FileText className="h-4 w-4" />;
    if (entry.paymentId) return <CreditCard className="h-4 w-4" />;
    if (entry.cashSessionId) return <Banknote className="h-4 w-4" />;
    return <BookOpen className="h-4 w-4" />;
  };

  const getDocumentTypeLabel = (entry: JournalEntry) => {
    if (entry.ticketId) return 'Ticket';
    if (entry.paymentId) return 'Pago';
    if (entry.cashSessionId) return 'Cierre Caja';
    return 'Manual';
  };

  const isBalanced = (entry: JournalEntry) => {
    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        legalEntityId,
        ...(fiscalYearId && { fiscalYearId }),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedAccount !== 'all' && { accountId: selectedAccount }),
        ...(selectedDocumentType !== 'all' && { documentType: selectedDocumentType }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        format: 'excel'
      });

      const response = await fetch(`/api/journal-entries/export?${params}`);
      if (!response.ok) throw new Error('Error exportando asientos');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asientos_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Asientos exportados correctamente');
    } catch (error) {
      toast.error('Error al exportar asientos');
    }
  };

  const handleViewDetails = (entry: JournalEntry) => {
    setSelectedEntry(entry);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Libro Diario de Asientos
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTemplates(true)}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Plantillas
              </Button>
              <Button onClick={() => setShowManualEntry(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Asiento
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Visualiza y gestiona todos los asientos contables del ejercicio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Número, descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Cuenta</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Todas las cuentas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  {accounts?.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountNumber} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo</Label>
              <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="ticket">Tickets</SelectItem>
                  <SelectItem value="payment">Pagos</SelectItem>
                  <SelectItem value="cash">Cierres de Caja</SelectItem>
                  <SelectItem value="manual">Manuales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleExport} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Filtros de fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Desde</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Hasta</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          {/* Tabla de asientos */}
          {isLoading ? (
            <div className="text-center py-8">Cargando asientos...</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalEntries?.entries?.map((entry: JournalEntry) => {
                      const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
                      const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
                      const balanced = isBalanced(entry);

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-sm">
                            {entry.entryNumber}
                          </TableCell>
                          <TableCell>
                            {format(new Date(entry.date), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.description}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDocumentTypeIcon(entry)}
                              <span className="text-sm">{getDocumentTypeLabel(entry)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(totalDebit)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(totalCredit)}
                          </TableCell>
                          <TableCell>
                            {balanced ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Cuadrado
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Descuadrado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(entry)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {journalEntries?.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {journalEntries.totalPages} ({journalEntries.totalEntries} asientos)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(journalEntries.totalPages, prev + 1))}
                      disabled={currentPage === journalEntries.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Resumen */}
          {journalEntries?.summary && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="flex gap-4 text-sm">
                  <span>Total Debe: <strong>{formatCurrency(journalEntries.summary.totalDebit)}</strong></span>
                  <span>Total Haber: <strong>{formatCurrency(journalEntries.summary.totalCredit)}</strong></span>
                  <span>Diferencia: <strong className={journalEntries.summary.difference === 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(journalEntries.summary.difference)}
                  </strong></span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalles */}
      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Asiento {selectedEntry.entryNumber}</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedEntry.date), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Información General</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Descripción:</dt>
                  <dd>{selectedEntry.description}</dd>
                  
                  {selectedEntry.reference && (
                    <>
                      <dt className="text-muted-foreground">Referencia:</dt>
                      <dd>{selectedEntry.reference}</dd>
                    </>
                  )}
                  
                  {selectedEntry.ticket && (
                    <>
                      <dt className="text-muted-foreground">Ticket:</dt>
                      <dd>{selectedEntry.ticket.ticketNumber}</dd>
                    </>
                  )}
                  
                  {selectedEntry.cashSession && (
                    <>
                      <dt className="text-muted-foreground">Sesión Caja:</dt>
                      <dd>{selectedEntry.cashSession.sessionNumber}</dd>
                    </>
                  )}
                </dl>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Líneas del Asiento</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.lines
                      .sort((a, b) => a.order - b.order)
                      .map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-mono text-sm">
                            {line.account.accountNumber} - {line.account.name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {line.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="font-semibold">
                      <TableCell colSpan={2}>Totales</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(selectedEntry.lines.reduce((sum, line) => sum + line.debit, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(selectedEntry.lines.reduce((sum, line) => sum + line.credit, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {!isBalanced(selectedEntry) && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este asiento no está cuadrado. La diferencia es de {
                      formatCurrency(Math.abs(
                        selectedEntry.lines.reduce((sum, line) => sum + line.debit, 0) -
                        selectedEntry.lines.reduce((sum, line) => sum + line.credit, 0)
                      ))
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Asiento Manual */}
      {showManualEntry && (
        <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Asiento Manual</DialogTitle>
              <DialogDescription>
                Crea un nuevo asiento contable con múltiples líneas
              </DialogDescription>
            </DialogHeader>
            <ManualJournalEntryForm
              systemId={systemId}
              legalEntityId={legalEntityId}
              currentLanguage={currentLanguage}
              onSuccess={() => {
                setShowManualEntry(false);
                refetch(); // Recargar la lista de asientos
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Plantillas */}
      {showTemplates && (
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Plantillas de Asientos</DialogTitle>
              <DialogDescription>
                Gestiona y utiliza plantillas de asientos recurrentes
              </DialogDescription>
            </DialogHeader>
            <JournalEntryTemplates
              systemId={systemId}
              legalEntityId={legalEntityId}
              currentLanguage={currentLanguage}
              onUseTemplate={(template) => {
                setShowTemplates(false);
                setShowManualEntry(true);
                // TODO: Pasar los datos de la plantilla al formulario manual
                toast.info('Funcionalidad de aplicar plantilla pendiente de implementar');
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 