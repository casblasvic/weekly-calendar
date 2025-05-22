"use client";

import React, { useState } from 'react';
import { useDebtLedgersQuery, DebtLedgerListItem } from '@/lib/hooks/use-debt-ledgers';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/utils/api-client';
import { DebtPaymentModal } from '@/components/tickets/debt-payment-modal';

interface DebtListProps {
  clinicId?: string;
}

export function DebtList({ clinicId }: DebtListProps) {
  const { data: debts = [], isLoading, refetch } = useDebtLedgersQuery({ clinicId });
  const { toast } = useToast();
  const [selectedDebt, setSelectedDebt] = useState<DebtLedgerListItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  const liquidate = (debt: DebtLedgerListItem) => {
    setSelectedDebt(debt);
    setShowModal(true);
  };

  const cancelDebt = async (debtId: string) => {
    try {
      await api.post(`/api/debt-ledgers/${debtId}/cancel`, {});
      toast({ description: 'Deuda cancelada.' });
      await refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo cancelar' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin"/> Cargando deudas...</div>;
  }

  return (
    <div className="space-y-4">
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
          {debts.map((d) => (
            <TableRow key={d.id} className="hover:bg-gray-50">
              <TableCell>{d.clinic?.name || '-'}</TableCell>
              <TableCell>{d.ticket?.ticketNumber ?? '-'}</TableCell>
              <TableCell>{d.client ? `${d.client.firstName || ''} ${d.client.lastName || ''}` : '-'}</TableCell>
              <TableCell className="text-right font-medium text-amber-600">{formatCurrency(d.pendingAmount)}</TableCell>
              <TableCell className="text-right text-sm text-gray-600">{format(new Date(d.createdAt), 'dd/MM/yyyy', { locale: es })}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="icon" variant="ghost" className="text-purple-600 hover:bg-purple-50" onClick={() => liquidate(d)}><Wallet className="w-4 h-4"/></Button>
                <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => cancelDebt(d.id)}><XCircle className="w-4 h-4"/></Button>
              </TableCell>
            </TableRow>
          ))}
          {debts.length === 0 && (
            <TableRow><TableCell colSpan={6} className="py-6 text-center text-gray-500">Sin deudas pendientes.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

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
    </div>
  );
} 