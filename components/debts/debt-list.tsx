"use client";

import React, { useState } from 'react';
import { useDebtLedgersQuery, DebtLedgerListItem } from '@/lib/hooks/use-debt-ledgers';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet, XCircle, ChevronDown, ChevronRight, Circle, Eye, SlidersHorizontal, FilterX, RotateCcw, Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/utils/api-client';
import { DebtPaymentModal } from '@/components/tickets/debt-payment-modal';
import { DebtAdjustmentModal, AdjustmentPayload } from './debt-adjustment-modal';
import { DebtAdjustmentType, DebtStatus } from '@prisma/client';
import { PaginationControls } from '@/components/pagination-controls';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePickerPopover } from '@/components/date-range-picker-popover';
import type { DateRange } from 'react-day-picker';

interface DebtListProps {
  clinicId?: string;
}

export function DebtList({ clinicId }: DebtListProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter states for UI
  const [filterStatus, setFilterStatus] = useState<DebtStatus | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);

  // Applied filter states for query
  const [appliedFilterStatus, setAppliedFilterStatus] = useState<DebtStatus | null>(null);
  const [appliedFilterDateRange, setAppliedFilterDateRange] = useState<DateRange | undefined>(undefined);

  const { data, isLoading, refetch } = useDebtLedgersQuery({
    clinicId,
    page: currentPage,
    pageSize,
    status: appliedFilterStatus, // Use applied filters
    dateFrom: appliedFilterDateRange?.from ? format(appliedFilterDateRange.from, 'yyyy-MM-dd') : undefined,
    dateTo: appliedFilterDateRange?.to ? format(appliedFilterDateRange.to, 'yyyy-MM-dd') : undefined,
  });
  const actualDebts = data?.debts || [];

  const { toast } = useToast();
  const [selectedDebt, setSelectedDebt] = useState<DebtLedgerListItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Prepared for when PaginationControls supports pageSize
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handleSearchClick = () => {
    setAppliedFilterStatus(filterStatus);
    setAppliedFilterDateRange(filterDateRange);
    setCurrentPage(1); // Reset to first page when applying new filters
    // refetch() se llamará automáticamente debido al cambio en appliedFilters o currentPage si es necesario, 
    // o podemos llamarlo explícitamente si la query no reacciona a los cambios de appliedFilterStatus/DateRange por sí misma.
    // Dado que useDebtLedgersQuery depende de appliedFilterStatus y appliedFilterDateRange, el cambio en estos estados debería desencadenar una nueva obtención de datos.
  };

  const handleClearFilters = () => {
    setFilterStatus(null);
    setFilterDateRange(undefined);
    setAppliedFilterStatus(null); // Clear applied filters as well
    setAppliedFilterDateRange(undefined);
    setCurrentPage(1); // Reset to first page
    // refetch(); // Similar a handleSearchClick, el cambio en appliedFilters debería ser suficiente.
  };

  // Nuevos estados para el modal de ajuste
  const [selectedDebtForAdjustment, setSelectedDebtForAdjustment] = useState<DebtLedgerListItem | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const liquidate = (debt: DebtLedgerListItem) => {
    setSelectedDebt(debt);
    setShowModal(true);
  };

  // Nueva función para abrir el modal de ajuste
  const openAdjustmentModal = (debt: DebtLedgerListItem) => {
    setSelectedDebtForAdjustment(debt);
    setShowAdjustmentModal(true);
  };



  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
        <p className="mt-4 text-lg text-gray-700">Cargando deudas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-md bg-slate-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="filterStatus">Estado</Label>
            <Select 
              value={filterStatus ?? 'ALL'}
              onValueChange={(value) => setFilterStatus(value === 'ALL' ? null : value as DebtStatus)}
            >
              <SelectTrigger id="filterStatus">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value={DebtStatus.PENDING}>Pendiente</SelectItem>
                <SelectItem value={DebtStatus.PARTIALLY_PAID}>Pagado Parcialmente</SelectItem>
                <SelectItem value={DebtStatus.PAID}>Pagado</SelectItem>
                <SelectItem value={DebtStatus.CANCELLED}>Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1 md:col-span-1">
            <Label htmlFor="filterDateRange">Rango de Fechas</Label>
            <DateRangePickerPopover
              dateRange={filterDateRange}
              setDateRange={setFilterDateRange}
              className="w-full"
            />
          </div>
          <div className="flex flex-wrap justify-end items-center gap-3">
            <Button onClick={handleClearFilters} variant="outline" className="h-9 text-sm text-gray-700 border-gray-300 hover:bg-gray-50 px-3">
              <RotateCcw size={15} className="mr-1.5" /> Limpiar
            </Button>
            <Button variant="outline" className="h-9 text-sm text-blue-600 border-blue-500 hover:bg-blue-50 hover:text-blue-700 px-3" onClick={() => { /* TODO: Implementar exportación */ alert('Exportar CSV no implementado'); }}>
              <Download size={15} className="mr-1.5" /> Exportar CSV
            </Button>
            <Button onClick={handleSearchClick} className="h-9 text-sm bg-purple-600 hover:bg-purple-700 text-white px-4">
              <Search size={15} className="mr-1.5" /> Buscar
            </Button>
          </div>
        </div>
      </div>
      <Table className="rounded-md">
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Clínica</TableHead>
            <TableHead>Nº Ticket</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Pendiente</TableHead>
            <TableHead className="text-right">Creada</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actualDebts.map((d) => (
            <React.Fragment key={d.id}>
              {/* MAIN ROW */}
              <TableRow className="hover:bg-gray-50">
                <TableCell className="w-4">
                  <Button variant="ghost" size="icon" onClick={() => setExpandedRows(prev => ({ ...prev, [d.id]: !prev[d.id] }))}>
                    {expandedRows[d.id] ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                  </Button>
                </TableCell>
                <TableCell className="w-4">
                  <Circle className="w-3 h-3" style={{ color: d.status === 'PAID' ? '#16a34a' : d.status === 'PARTIALLY_PAID' ? '#f97316' : '#dc2626' }}/>
                </TableCell>
                <TableCell>{d.clinic?.name || '-'}</TableCell>
                <TableCell>{d.ticket?.ticketNumber ?? '-'}</TableCell>
                <TableCell>{d.person ? `${d.person.firstName || ''} ${d.person.lastName || ''}` : '-'}</TableCell>
                <TableCell className="text-right font-medium text-amber-600">{formatCurrency(d.pendingAmount)}</TableCell>
                <TableCell className="text-right text-sm text-gray-600">{format(new Date(d.createdAt), 'dd/MM/yyyy', { locale: es })}</TableCell>
                <TableCell className="text-right space-x-1">
                  {/* Botón Liquidar Deuda */}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-purple-600 hover:bg-purple-50" 
                    onClick={() => liquidate(d)} 
                    title="Liquidar Deuda"
                    disabled={d.ticket?.cashSession?.status === 'OPEN'}
                  >
                    <Wallet className="w-4 h-4"/>
                  </Button>
                  
                  {/* Botón Ajustar/Cancelar Deuda */}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => openAdjustmentModal(d)}
                    title="Cancelar/Ajustar Deuda"
                    disabled={d.ticket?.cashSession?.status === 'OPEN'} 
                  >
                    <XCircle className="w-4 h-4"/>
                  </Button>

                  {/* Botón Ver/Editar Ticket (sin cambios) */}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-blue-600 hover:bg-blue-50"
                    onClick={() => router.push(`/facturacion/tickets/editar/${d.ticketId}?from=${encodeURIComponent(pathname)}`)}
                    title="Ver/Editar Ticket"
                  >
                    <Eye className="w-4 h-4"/>
                  </Button>
                </TableCell>
              </TableRow>
              {/* EXPANDED ROW */}
              {expandedRows[d.id] && (
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={8} className="p-4">
                    <ExpandedDebtDetail debtId={d.id} />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
          {actualDebts.length === 0 && (
            <TableRow><TableCell colSpan={8} className="py-6 text-center text-gray-500">Sin deudas pendientes.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      {data && (data.totalCount > 0 || isLoading) && (
        <PaginationControls 
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalCount={data.totalCount}
          itemType="deudas"
        />
      )}

      {selectedDebt && (
        <DebtPaymentModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          pendingAmount={selectedDebt.pendingAmount}
          onConfirm={async (payload) => {
            try {
              await api.post('/api/payments/debt', {
                debtLedgerId: selectedDebt.id,
                clinicId: selectedDebt.clinicId,
                amount: payload.amount,
                paymentMethodDefinitionId: payload.paymentMethodDefinitionId,
                paymentDate: new Date().toISOString(),
                transactionReference: payload.transactionReference,
              });
              toast({ description: 'Liquidación registrada.' });
              setShowModal(false);
              await refetch();
            } catch (e: any) {
              toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo liquidar' });
            }
          }}
          clinicId={selectedDebt.clinicId}
        />
      )}

      {selectedDebtForAdjustment && (
        <DebtAdjustmentModal
          isOpen={showAdjustmentModal}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedDebtForAdjustment(null);
          }}
          debtLedger={selectedDebtForAdjustment}
          onConfirm={async (payload: AdjustmentPayload) => {
            if (!selectedDebtForAdjustment) return;
            try {
              await api.post('/api/debt-adjustments', {
                debtLedgerId: selectedDebtForAdjustment.id,
                adjustmentType: payload.adjustmentType,
                amount: payload.amount,
                reason: payload.reason,
              });
              toast({ description: 'Ajuste de deuda registrado con éxito.' });
              setShowAdjustmentModal(false);
              setSelectedDebtForAdjustment(null);
              await refetch(); // Refrescar la lista de deudas
            } catch (e: any) {
              toast({ 
                variant: 'destructive', 
                title: 'Error al ajustar deuda', 
                description: e.response?.data?.error || e.message || 'No se pudo registrar el ajuste.' 
              });
            }
          }}
        />
      )}
    </div>
  );
} 


// --- COMPONENTE DETALLE EXPANDIDO ---
import { useDebtLedgerDetailQuery, DebtLedgerDetailResponse, useCancelDebtPaymentMutation } from '@/lib/hooks/use-debt-ledger-detail';
import { CancelPaymentModal } from './cancel-payment-modal';

function ExpandedDebtDetail({ debtId }: { debtId: string }) {
  const { data, isLoading } = useDebtLedgerDetailQuery(debtId);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutateAsync: cancelPayment, isPending: cancelling } = useCancelDebtPaymentMutation();
  const { toast } = useToast();

  if (isLoading || !data) {
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin"/> Cargando...</div>;
  }

  const handleCancel = async (reason: string) => {
    if (!selectedPaymentId) return;
    try {
      await cancelPayment({ paymentId: selectedPaymentId, reason });
      toast({ description: 'Liquidación anulada.' });
      setIsModalOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo anular.' });
    }
  };

  return (
    <div className="space-y-4">
      {/* resumen */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span>Original: <strong>{formatCurrency(data.originalAmount)}</strong></span>
        <span>Liquidado: <strong>{formatCurrency(data.paidAmount)}</strong></span>
        <span>Pendiente: <strong>{formatCurrency(data.pendingAmount)}</strong></span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead className="text-right">Fecha</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.payments.map(p => (
            <TableRow key={p.id} className={p.status === 'CANCELLED' ? 'opacity-60' : ''}>
              <TableCell>{p.paymentMethodDefinition?.name ?? '-'}</TableCell>
              <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
              <TableCell className="text-right text-sm text-gray-600">{format(new Date(p.paymentDate), 'dd/MM/yyyy', { locale: es })}</TableCell>
              <TableCell>{p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}` : '-'}</TableCell>
              <TableCell>{p.status === 'CANCELLED' ? 'Anulado' : 'Completado'}</TableCell>
              <TableCell>
                {p.status !== 'CANCELLED' && (
                  <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => { setSelectedPaymentId(p.id); setIsModalOpen(true); }} title="Anular pago">
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* modal */}
      <CancelPaymentModal open={isModalOpen} onOpenChange={v => { if (!cancelling) setIsModalOpen(v);} } onConfirm={handleCancel} isSubmitting={cancelling} />
    </div>
  );
}