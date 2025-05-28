"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea'; // Para el campo 'reason'
import { DebtLedgerListItem } from '@/lib/hooks/use-debt-ledgers';
import { DebtAdjustmentType } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';

export interface AdjustmentPayload {
  adjustmentType: DebtAdjustmentType;
  amount: number;
  reason: string;
}

interface DebtAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtLedger: DebtLedgerListItem;
  onConfirm: (payload: AdjustmentPayload) => Promise<void>;
}

export function DebtAdjustmentModal({ isOpen, onClose, debtLedger, onConfirm }: DebtAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<DebtAdjustmentType | undefined>(undefined);
  const [amount, setAmount] = useState<number | string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Resetear estado al abrir
      setAdjustmentType(undefined);
      setAmount('');
      setReason('');
      setIsSubmitting(false);
      setAmountError(null);
    } else {
      // Limpiar errores al cerrar si no se envió
      setAmountError(null);
    }
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      setAmountError('El monto debe ser un número positivo.');
    } else if (numericValue > debtLedger.pendingAmount) {
      setAmountError(`El monto no puede exceder la deuda pendiente de ${formatCurrency(debtLedger.pendingAmount)}.`);
    } else {
      setAmountError(null);
    }
  };

  const handleSubmit = async () => {
    if (!adjustmentType || !amount || !reason.trim() || amountError) {
      // Podríamos añadir una validación más explícita aquí o usar un toast
      alert('Por favor, complete todos los campos correctamente.');
      return;
    }

    const numericAmount = parseFloat(amount.toString());
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > debtLedger.pendingAmount) {
      alert('Monto inválido.'); // Debería estar cubierto por amountError
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        adjustmentType,
        amount: numericAmount,
        reason: reason.trim(),
      });
      // onClose(); // El componente padre se encarga de cerrar al confirmar exitosamente
    } catch (error) {
      // El error se maneja en el componente padre (DebtList)
      console.error("Error in modal submission", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Ajustar Deuda</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            Deuda de: <strong>{debtLedger.client?.firstName} {debtLedger.client?.lastName}</strong><br />
            Ticket: {debtLedger.ticket?.ticketNumber}<br />
            Pendiente: <span className="font-semibold text-amber-600">{formatCurrency(debtLedger.pendingAmount)}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjustmentType">Tipo de Ajuste</Label>
            <Select onValueChange={(value) => setAdjustmentType(value as DebtAdjustmentType)} value={adjustmentType}>
              <SelectTrigger id="adjustmentType">
                <SelectValue placeholder="Seleccione un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DebtAdjustmentType.CANCELLATION}>Cancelación/Condonación</SelectItem>
                <SelectItem value={DebtAdjustmentType.ADMINISTRATIVE_CORRECTION}>Corrección Administrativa</SelectItem>
                <SelectItem value={DebtAdjustmentType.OTHER}>Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Monto del Ajuste</Label>
            <Input 
              id="amount" 
              type="number" 
              value={amount} 
              onChange={handleAmountChange}
              placeholder={`Máx. ${formatCurrency(debtLedger.pendingAmount)}`}
              min="0.01"
              step="0.01"
              max={debtLedger.pendingAmount.toString()} // HTML5 max
            />
            {amountError && <p className="text-sm text-red-600">{amountError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Razón del Ajuste</Label>
            <Textarea 
              id="reason" 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="Describa el motivo del ajuste..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !adjustmentType || !amount || !reason.trim() || !!amountError}>
            {isSubmitting ? 'Registrando...' : 'Confirmar Ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
