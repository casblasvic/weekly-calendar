"use client";

import React, { useState } from 'react';
import { useDebtLedgersQuery, DebtLedgerListItem } from '@/lib/hooks/use-debt-ledgers';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet, XCircle, Eye, SlidersHorizontal } from 'lucide-react';
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
// Button from '@/components/ui/button' is already imported earlier
import { DateRangePickerPopover } from '@/components/date-range-picker-popover';
import type { DateRange } from 'react-day-picker';
import { FilterX, RotateCcw } from 'lucide-react';

interface DebtListProps {
  clinicId?: string;
}

export function DebtList({ clinicId }: DebtListProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<DebtStatus | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);

  const { data, isLoading, refetch } = useDebtLedgersQuery({
    clinicId,
    page: currentPage,
    pageSize,
    status: filterStatus,
    dateFrom: filterDateRange?.from ? format(filterDateRange.from, 'yyyy-MM-dd') : undefined,
    dateTo: filterDateRange?.to ? format(filterDateRange.to, 'yyyy-MM-dd') : undefined,
  });
  const actualDebts = data?.debts || [];

  const { toast } = useToast();
  const [selectedDebt, setSelectedDebt] = useState<DebtLedgerListItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Prepared for when PaginationControls supports pageSize
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handleClearFilters = () => {
    setFilterStatus(null);
    setFilterDateRange(undefined);
    setCurrentPage(1); // Reset to first page
    // refetch(); // Opcional: si los filtros no se aplican en vivo con cada cambio de estado
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
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin"/> Cargando deudas...</div>;
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
          <Button onClick={handleClearFilters} variant="outline" className="h-10 flex items-center">
            <RotateCcw size={16} className="mr-2"/> Limpiar
          </Button>
        </div>
      </div>
      <Table className="rounded-md">
        <TableHeader>
          <TableRow>
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
            <TableRow key={d.id} className="hover:bg-gray-50">
              <TableCell>{d.clinic?.name || '-'}</TableCell>
              <TableCell>{d.ticket?.ticketNumber ?? '-'}</TableCell>
              <TableCell>{d.client ? `${d.client.firstName || ''} ${d.client.lastName || ''}` : '-'}</TableCell>
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
          ))}
          {actualDebts.length === 0 && (
            <TableRow><TableCell colSpan={6} className="py-6 text-center text-gray-500">Sin deudas pendientes.</TableCell></TableRow>
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