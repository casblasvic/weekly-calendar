"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/pagination-controls';
import { DateRangePickerPopover } from '@/components/date-range-picker-popover';
import type { DateRange } from 'react-day-picker'; // Import DateRange from react-day-picker
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SlidersHorizontal, Search, X, FileText, RotateCcw, Trash2, Eye, Download, ChevronDown, Lock, LockOpen, FileCheck, FileX } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation'; 
import { useClinicsQuery } from '@/lib/hooks/use-clinic-query'; 
import { cn } from '@/lib/utils'; // Added cn import
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import InvoiceConversionModal from '@/components/invoicing/invoice-conversion-modal-new';
import { useCanInvoice } from '@/lib/hooks/use-can-invoice';
import { toast } from 'sonner';

interface Clinic {
  id: string;
  name: string;
  status?: string; 
}

interface SearchResultItem {
  id: string;
  type: 'Ticket' | 'Factura';
  number: string;
  clientName: string;
  date: string;
  total: number;
  status: string; 
  isInvoiceGenerated: boolean;
  canReopen: boolean;
  ticketId?: string; 
  clinicName: string;
  hasLegalEntity?: boolean;
  finalAmount?: number;
}

export default function BusquedaFacturacionPage() {
  const [searchType, setSearchType] = useState<'Ticket' | 'Factura'>('Ticket');
  const [ticketNumber, setTicketNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [personId, setPersonId] = useState('');
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>(['ALL']); 
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isInitialFilterLoadDone, setIsInitialFilterLoadDone] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: clinicsData, isLoading: isLoadingClinics, error: errorClinics } = useClinicsQuery();
  const availableClinics: Clinic[] = clinicsData || [];

  const generateMockData = (type: 'Ticket' | 'Factura') => [
    {
      id: '1',
      type: type,
      number: type === 'Ticket' ? 'TKT-001' : 'FAC-001',
      clientName: 'Juan Pérez',
      date: '2024-05-27',
      total: 150.75,
      status: 'Pagado',
      isInvoiceGenerated: type === 'Factura' || (type === 'Ticket' && Math.random() > 0.5),
      canReopen: type === 'Ticket' && Math.random() > 0.3,
      ticketId: 'tkt123',
      clinicName: 'Clinica 1', 
      hasLegalEntity: true,
      finalAmount: 150.75,
    },
    {
      id: '2',
      type: type,
      number: type === 'Ticket' ? 'TKT-002' : 'FAC-002',
      clientName: 'Ana López',
      date: '2024-05-28',
      total: 85.00,
      status: 'Pendiente',
      isInvoiceGenerated: type === 'Factura' || (type === 'Ticket' && Math.random() > 0.2),
      canReopen: type === 'Ticket' && Math.random() > 0.6,
      ticketId: 'tkt456',
      clinicName: 'Clinica 2', 
      hasLegalEntity: false,
      finalAmount: 85.00,
    },
  ];

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const urlSearchType = params.get('searchType') as 'Ticket' | 'Factura' | null;
    const urlTicketNumber = params.get('ticketNumber');
    const urlInvoiceNumber = params.get('invoiceNumber');
    const urlPersonId = params.get('personId');
    const urlDateFrom = params.get('dateFrom');
    const urlDateTo = params.get('dateTo');
    const urlClinicIds = params.get('clinicIds');
    const urlPage = params.get('page');
    const urlPageSize = params.get('pageSize');

    let filtersApplied = false;

    if (urlSearchType) { setSearchType(urlSearchType); filtersApplied = true; }
    if (urlTicketNumber) { setTicketNumber(urlTicketNumber); filtersApplied = true; }
    if (urlInvoiceNumber) { setInvoiceNumber(urlInvoiceNumber); filtersApplied = true; }
    if (urlPersonId) { setPersonId(urlPersonId); filtersApplied = true; }
    if (urlDateFrom && urlDateTo) {
      setDateRange({ from: new Date(urlDateFrom), to: new Date(urlDateTo) });
      filtersApplied = true;
    } else if (urlDateFrom) {
      setDateRange({ from: new Date(urlDateFrom), to: undefined });
      filtersApplied = true;
    }
    if (urlClinicIds) { setSelectedClinicIds(urlClinicIds.split(',')); filtersApplied = true; }
    if (urlPage) { setCurrentPage(parseInt(urlPage, 10)); filtersApplied = true; } 
    if (urlPageSize) { setPageSize(parseInt(urlPageSize, 10)); filtersApplied = true; } 
    
    setIsInitialFilterLoadDone(true); 

  }, []); 

  useEffect(() => {
  }, []);

  const handleClearFilters = () => {
    setSearchType('Ticket');
    setTicketNumber('');
    setInvoiceNumber('');
    setDateRange(undefined);
    setPersonId('');
    setSelectedClinicIds(['ALL']); 
    setSearchResults([]);
    setCurrentPage(1);
    setTotalCount(0);
  };

  const handleClinicSelectionChange = (clinicId: string) => {
    setSelectedClinicIds(prev => {
      if (clinicId === 'ALL') {
        return ['ALL'];
      } 
      else if (prev.includes('ALL')) {
        return [clinicId];
      } 
      else if (prev.includes(clinicId)) {
        if (prev.length === 1) {
          return ['ALL'];
        }
        return prev.filter(id => id !== clinicId);
      } 
      else {
        return [...prev, clinicId];
      }
    });
  };

  const handleSearch = useCallback(async (pageToFetch = 1, sizeOfPage = pageSize) => {
    const query = new URLSearchParams();
    query.set('searchType', searchType);
    if (ticketNumber) query.set('ticketNumber', ticketNumber);
    if (searchType === 'Factura' && invoiceNumber) query.set('invoiceNumber', invoiceNumber);
    if (dateRange?.from) query.set('dateFrom', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) query.set('dateTo', format(dateRange.to, 'yyyy-MM-dd'));
    if (personId) query.set('personId', personId);
    
    if (selectedClinicIds.length > 0 && !selectedClinicIds.includes('ALL')) {
      query.set('clinicIds', selectedClinicIds.join(','));
    } else {
    }

    query.set('page', pageToFetch.toString());
    query.set('pageSize', sizeOfPage.toString());

    setIsLoading(true);
    try {
      const response = await fetch(`/api/billing-search?${query.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Network response was not ok');
      }
      const data = await response.json();
      setSearchResults(data.results || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 0);
      setCurrentPage(data.currentPage || 1);

    } catch (error) {
      console.error("Failed to fetch search results:", error);
      setSearchResults([]); 
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [searchType, ticketNumber, invoiceNumber, personId, dateRange, selectedClinicIds, pageSize]);

  useEffect(() => {
    if (isInitialFilterLoadDone) {
      const queryParams = new URLSearchParams();
      if (searchType) queryParams.set('searchType', searchType);
      if (ticketNumber) queryParams.set('ticketNumber', ticketNumber);
      if (invoiceNumber) queryParams.set('invoiceNumber', invoiceNumber);
      if (personId) queryParams.set('personId', personId);
      if (dateRange?.from) queryParams.set('dateFrom', dateRange.from.toISOString());
      if (dateRange?.to) queryParams.set('dateTo', dateRange.to.toISOString());
      if (selectedClinicIds.length > 0 && !(selectedClinicIds.length === 1 && selectedClinicIds[0] === 'ALL')) {
         queryParams.set('clinicIds', selectedClinicIds.join(','));
      } else if (selectedClinicIds.length === 1 && selectedClinicIds[0] === 'ALL') {
      }
      queryParams.set('page', currentPage.toString());
      queryParams.set('pageSize', pageSize.toString());
      
      const newUrl = `/facturacion/busqueda?${queryParams.toString()}`;
      router.replace(newUrl);

      handleSearch(currentPage, pageSize); 
    }
  }, [searchType, ticketNumber, invoiceNumber, personId, dateRange, selectedClinicIds, currentPage, pageSize, isInitialFilterLoadDone, router, handleSearch]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); 
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Búsqueda Avanzada en Facturación</h1>
        {/* Export button moved below */}
      </div>

      <div className="p-6 border rounded-lg shadow-sm bg-white">
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end mb-6">
            <div className="min-w-[180px]">
              <Label htmlFor="searchType" className="text-sm font-medium text-gray-700">Buscar por</Label>
              <Select value={searchType} onValueChange={(value) => setSearchType(value as 'Ticket' | 'Factura')}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ticket">Ticket</SelectItem>
                  <SelectItem value="Factura">Factura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searchType === 'Ticket' && (
              <div className="min-w-[180px]">
                <Label htmlFor="ticketNumber" className="text-sm font-medium text-gray-700">Nº Ticket</Label>
                <Input 
                  id="ticketNumber" 
                  type="text" 
                  placeholder="Ej: TKT-001" 
                  value={ticketNumber} 
                  onChange={(e) => setTicketNumber(e.target.value)} 
                  className="mt-1 block w-full"
                />
              </div>
            )}

            {searchType === 'Factura' && (
              <div className="min-w-[180px]">
                <Label htmlFor="invoiceNumber" className="text-sm font-medium text-gray-700">Nº Factura / Serie</Label>
                <Input 
                  id="invoiceNumber" 
                  type="text" 
                  placeholder="Ej: FAC-A-001" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)} 
                  className="mt-1 block w-full"
                />
              </div>
            )}

            <div className="min-w-[180px]">
              <Label htmlFor="personId" className="text-sm font-medium text-gray-700">Identificador Persona</Label>
              <Input 
                id="personId" 
                type="text" 
                placeholder="ID de la persona" 
                value={personId} 
                onChange={(e) => setPersonId(e.target.value)} 
                className="mt-1 block w-full"
              />
            </div>

            <div className="w-full">
              <Label htmlFor="clinicId" className="text-sm font-medium text-gray-700">Clínica(s)</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between mt-1">
                    {selectedClinicIds.length === 0 ? "Seleccionar clínicas" :
                    selectedClinicIds.includes('ALL') ? "Todas las clínicas" :
                    selectedClinicIds.length === 1 ? availableClinics.find(c => c.id === selectedClinicIds[0])?.name || "1 sel." :
                    `${selectedClinicIds.length} sel.`}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuLabel>Clínicas Disponibles</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={selectedClinicIds.includes('ALL')}
                    onCheckedChange={() => handleClinicSelectionChange('ALL')}
                  >
                    Todas
                  </DropdownMenuCheckboxItem>
                  {availableClinics.map((clinic) => (
                    <DropdownMenuCheckboxItem
                      key={clinic.id}
                      checked={selectedClinicIds.includes('ALL') ? true : selectedClinicIds.includes(clinic.id)} // Si 'ALL' está seleccionado, todas las clínicas están visualmente marcadas.
                      onCheckedChange={() => handleClinicSelectionChange(clinic.id)}
                    >
                      {clinic.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {isLoadingClinics && <DropdownMenuLabel>Cargando...</DropdownMenuLabel>}
                  {errorClinics && <DropdownMenuLabel className="text-red-500">Error</DropdownMenuLabel>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="w-full sm:col-span-2 lg:col-span-1">
              <Label htmlFor="dateRange" className="text-sm font-medium text-gray-700">Rango de Fechas</Label>
              <DateRangePickerPopover 
                dateRange={dateRange} 
                setDateRange={setDateRange} 
                className="w-full" 
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end items-center gap-3">
            <Button variant="outline" onClick={handleClearFilters} className="text-gray-700 border-gray-300 hover:bg-gray-50 px-3 h-9 text-sm">
              <RotateCcw size={15} className="mr-1.5" />
              Limpiar
            </Button>
            <Button variant="outline" className="h-9 text-sm text-blue-600 border-blue-500 hover:bg-blue-50 hover:text-blue-700 px-3">
              <Download size={15} className="mr-1.5" />
              Exportar CSV
            </Button>
            <Button onClick={() => handleSearch()} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-4 h-9 text-sm">
              <Search size={15} className="mr-1.5" />
              Buscar
            </Button>
          </div>
        </div>
      </div>

      {/* Results Table Section */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-gray-600 font-semibold">Tipo</TableHead>
              <TableHead className="text-gray-600 font-semibold">Número</TableHead>
              <TableHead className="text-gray-600 font-semibold">Clínica</TableHead> {/* Added Clínica Header */}
              <TableHead className="text-gray-600 font-semibold">Persona</TableHead>
              <TableHead className="text-gray-600 font-semibold">Fecha</TableHead>
              <TableHead className="text-right text-gray-600 font-semibold">Total</TableHead>
              <TableHead className="text-center text-gray-600 font-semibold">Estado</TableHead>
              <TableHead className="text-right text-gray-600 font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <div className="flex justify-center items-center text-gray-500">
                    <SlidersHorizontal size={20} className="animate-spin mr-2" /> Buscando...
                  </div>
                </TableCell>
              </TableRow>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="py-3">{item.type}</TableCell>
                  <TableCell className="py-3 font-medium text-purple-700">{item.number}</TableCell>
                  <TableCell className="py-3">{item.clinicName}</TableCell> {/* Added Clínica Cell */}
                  <TableCell className="py-3">{item.clientName}</TableCell>
                  <TableCell className="py-3 text-sm text-gray-600">{item.date}</TableCell>
                  <TableCell className="text-right py-3 font-semibold">{item.total.toFixed(2)} €</TableCell>
                  <TableCell className="text-center py-3">
                    <span
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-full",
                        item.status === 'Pagado' && 'bg-green-100 text-green-700',
                        item.status === 'Pendiente' && 'bg-yellow-100 text-yellow-700',
                        item.status === 'Anulado' && 'bg-red-100 text-red-700',
                        item.status === 'ACCOUNTED' && 'bg-blue-100 text-blue-700',
                        !['Pagado', 'Pendiente', 'Anulado', 'ACCOUNTED'].includes(item.status) && 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <div className="flex items-center justify-end space-x-2">
                      {item.type === 'Ticket' && !item.isInvoiceGenerated && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs border-purple-600 text-purple-600 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => {
                            setSelectedTicketId(item.id);
                            setShowInvoiceModal(true);
                          }}
                          disabled={
                            item.status === 'VOID' || 
                            item.status === 'Anulado' ||
                            (item.status !== 'CLOSED' && item.status !== 'ACCOUNTED' && item.status !== 'Cerrado' && item.status !== 'Contabilizado') ||
                            !item.hasLegalEntity ||
                            (item.finalAmount !== undefined && item.finalAmount === 0)
                          }
                          title={
                            item.status === 'VOID' || item.status === 'Anulado' 
                              ? 'No se puede facturar un ticket anulado' 
                              : (item.status !== 'CLOSED' && item.status !== 'ACCOUNTED' && item.status !== 'Cerrado' && item.status !== 'Contabilizado')
                                ? 'El ticket debe estar cerrado o contabilizado para facturarse'
                                : !item.hasLegalEntity 
                                  ? 'La clínica no está asignada a una sociedad'
                                  : (item.finalAmount !== undefined && item.finalAmount === 0)
                                    ? 'No se puede facturar un ticket con importe 0'
                                    : 'Generar factura desde este ticket'
                          }
                        >
                          <FileText size={14} className="mr-1.5" /> Generar Factura
                        </Button>
                      )}
                      {item.type === 'Ticket' && item.canReopen && (
                        <Button variant="outline" size="sm" className="h-8 text-xs border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                          onClick={() => console.log('Reopen ticket', item.id)} // TODO: Implement
                        >
                          <LockOpen size={14} className="mr-1.5" /> Reabrir {/* Changed Unlock to LockOpen */}
                        </Button>
                      )}
                      {item.type === 'Ticket' && !item.canReopen && item.status !== 'Anulado' && (
                         <Button variant="outline" size="sm" className="h-8 text-xs border-gray-300 text-gray-400 cursor-not-allowed" disabled>
                           <Lock size={14} className="mr-1.5" /> Reabrir
                         </Button>
                      )}
                      {item.status !== 'Anulado' && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => console.log('Cancel item', item.id)} // TODO: Implement
                        >
                          <Trash2 size={14} className="mr-1.5" /> Anular
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-600 hover:bg-gray-100"
                        onClick={() => {
                          if (item.type === 'Ticket' && item.ticketId) {
                            const queryParams = new URLSearchParams();
                            if (searchType) queryParams.set('searchType', searchType);
                            if (ticketNumber) queryParams.set('ticketNumber', ticketNumber);
                            if (invoiceNumber) queryParams.set('invoiceNumber', invoiceNumber);
                            if (personId) queryParams.set('personId', personId);
                            if (dateRange?.from) queryParams.set('dateFrom', dateRange.from.toISOString());
                            if (dateRange?.to) queryParams.set('dateTo', dateRange.to.toISOString());
                            if (selectedClinicIds.length > 0) queryParams.set('clinicIds', selectedClinicIds.join(','));
                            if (currentPage) queryParams.set('page', currentPage.toString());
                            if (pageSize) queryParams.set('pageSize', pageSize.toString());

                            const queryString = queryParams.toString();
                            const fromUrl = `/facturacion/busqueda${queryString ? `?${queryString}` : ''}`;
                            router.push(`/facturacion/tickets/editar/${item.ticketId}?from=${encodeURIComponent(fromUrl)}`);
                          } else if (item.type === 'Factura') {
                            // router.push(`/facturacion/facturas/ver/${item.id}`); // TODO: Implement view invoice page
                            console.log('View invoice', item.id);
                          }
                        }}
                      >
                        <Eye size={14} className="mr-1.5" /> Ver
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                  No se encontraron resultados para los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section */}
      {totalCount > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / pageSize)}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalCount={totalCount}
          itemType={searchType === 'Ticket' ? 'tickets' : 'facturas'}
        />
      )}
      <InvoiceConversionModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        ticketId={selectedTicketId}
      />
    </div>
  );
}