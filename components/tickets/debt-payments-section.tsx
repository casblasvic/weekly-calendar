"use client";

import React, { useState } from 'react';
import { useDebtByTicketQuery, useSettleDebtPaymentMutation } from '@/lib/hooks/use-debt-query';
import { DebtPaymentModal } from '@/components/tickets/debt-payment-modal';
import { CancelPaymentModal } from '@/components/debts/cancel-payment-modal';
import { useCancelDebtPaymentMutation } from '@/lib/hooks/use-debt-ledger-detail';
import { DebtStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface DebtPaymentsSectionProps {
  ticketId: string;
  currentClinicId: string;
}

export function DebtPaymentsSection({ ticketId, currentClinicId }: DebtPaymentsSectionProps) {
  const { data: debt, isLoading, refetch } = useDebtByTicketQuery(ticketId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const { toast } = useToast();
  const settleDebtMutation = useSettleDebtPaymentMutation();
  const { mutateAsync: cancelPayment, isPending: cancelling } = useCancelDebtPaymentMutation();

  const pendingAmount = debt?.pendingAmount || 0;
  const canLiquidate = debt && (debt.status === DebtStatus.PENDING || debt.status === DebtStatus.PARTIALLY_PAID) && pendingAmount > 0.009;

  const handleConfirmPayment = async (payload: { paymentMethodDefinitionId: string; amount: number; transactionReference?: string }) => {
    if (!debt) return;
    setIsSubmitting(true);
    try {
      await settleDebtMutation.mutateAsync({
        debtLedgerId: debt.id,
        amount: payload.amount,
        paymentMethodDefinitionId: payload.paymentMethodDefinitionId,
        clinicId: currentClinicId,
        paymentDate: new Date().toISOString(),
        transactionReference: payload.transactionReference,
      });
      toast({ description: 'Pago registrado correctamente.' });
      await refetch();
      setIsModalOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo registrar el pago.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPayment = async (reason: string) => {
    if (!selectedPaymentId) return;
    try {
      await cancelPayment({ paymentId: selectedPaymentId, reason });
      toast({ description: 'Liquidación anulada.' });
      await refetch();
      setCancelModalOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo anular.' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Cargando pagos aplazados...</div>;
  }

  if (!debt) {
    return null; // No hay deuda, no mostrar
  }

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-lg font-semibold">Pagos aplazados</h3>
      <div className="flex flex-wrap gap-6 mb-4 text-sm">
        <span>Importe original: <strong>{formatCurrency(debt.originalAmount)}</strong></span>
        <span>Pagado: <strong>{formatCurrency(debt.paidAmount)}</strong></span>
        <span>Pendiente: <strong className="text-amber-600">{formatCurrency(debt.pendingAmount)}</strong></span>
        <span>Estado: <strong>{debt.status}</strong></span>
      </div>

      <Table className="rounded-md">
        <TableHeader>
          <TableRow>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead className="text-right">Fecha</TableHead>
            <TableHead className="text-right">Usuario</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debt.payments.map((p) => (
            <TableRow key={p.id} className={p.status === 'CANCELLED' ? 'opacity-60' : ''}>
              <TableCell>{p.paymentMethodDefinition?.name || '-'}</TableCell>
              <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
              <TableCell className="text-right">{format(new Date(p.paymentDate), 'dd/MM/yyyy', { locale: es })}</TableCell>
              <TableCell className="text-right">{p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}` : '-'}</TableCell>
              <TableCell>{p.status === 'CANCELLED' ? 'Anulado' : 'Completado'}</TableCell>
              <TableCell>
                {p.status !== 'CANCELLED' && (
                  <Button type="button" size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => { setSelectedPaymentId(p.id); setCancelModalOpen(true); }} title="Anular pago">
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {debt.payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-4 text-center text-gray-500">Aún no hay liquidaciones.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {canLiquidate && (
        <div className="flex justify-end mt-3">
          <Button type="button" onClick={() => setIsModalOpen(true)} size="sm" className="text-white bg-purple-600 hover:bg-purple-700">
            Liquidar pago
          </Button>
        </div>
      )}

      {isModalOpen && (
        <DebtPaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pendingAmount={pendingAmount}
          onConfirm={handleConfirmPayment}
          isSubmitting={isSubmitting}
          clinicId={currentClinicId}
        />
      )}
      {/* Modal Anular Liquidación */}
      <CancelPaymentModal
        open={cancelModalOpen}
        onOpenChange={(v) => { if (!cancelling) setCancelModalOpen(v); }}
        onConfirm={handleCancelPayment}
        isSubmitting={cancelling}
      />
    </div>
  );
}