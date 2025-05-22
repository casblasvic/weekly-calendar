"use client";

import React, { useEffect, useState } from "react";
import { PaymentMethodType } from "@prisma/client";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { useToast } from "@/components/ui/use-toast";
import { usePaymentMethodsQuery } from "@/lib/hooks/use-api-query";
import { formatCurrency } from "@/lib/utils";

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingAmount: number;
  onConfirm: (payload: { paymentMethodDefinitionId: string; amount: number; transactionReference?: string }) => void;
  /** Id de la clínica donde se liquida (para futuras mejoras). */
  clinicId?: string;
}

export function DebtPaymentModal({ isOpen, onClose, pendingAmount, onConfirm, clinicId }: DebtPaymentModalProps) {
  const { toast } = useToast();
  const { data: paymentMethods = [], isLoading: loadingPaymentMethods } = usePaymentMethodsQuery();
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [amount, setAmount] = useState<number>(pendingAmount);
  const [reference, setReference] = useState<string>("");

  // Filtrar métodos: activos, no tipo Aplazado. En el futuro se puede filtrar por clínica.
  const filteredMethods = React.useMemo(() => {
    return paymentMethods.filter((m: any) => m.type !== PaymentMethodType.DEFERRED_PAYMENT);
  }, [paymentMethods]);

  useEffect(() => {
    if (isOpen) {
      setAmount(parseFloat(pendingAmount.toFixed(2)));
      setPaymentMethodId("");
      setReference("");
    }
  }, [isOpen, pendingAmount]);

  const handleConfirm = () => {
    if (!paymentMethodId) {
      toast({ variant: "destructive", title: "Método de pago requerido" });
      return;
    }
    if (amount <= 0 || amount > pendingAmount + 0.009) {
      toast({ variant: "destructive", title: "Importe inválido" });
      return;
    }
    onConfirm({ paymentMethodDefinitionId: paymentMethodId, amount, transactionReference: reference });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] overflow-hidden p-0">
        <BorderBeam size={150} duration={6} delay={0} colorFrom="#8b5cf6" colorTo="#ec4899" />
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-center">Liquidar pago aplazado</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-center text-gray-600">
              Pendiente:&nbsp;
              <span className="font-semibold text-purple-700">{formatCurrency(pendingAmount)}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="(Elija uno)" />
                </SelectTrigger>
                <SelectContent>
                  {loadingPaymentMethods ? (
                    <SelectItem value="loading" disabled>Cargando...</SelectItem>
                  ) : filteredMethods.length > 0 ? (
                    filteredMethods.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No hay métodos disponibles</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Importe</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount > 0 ? amount.toString() : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^\d*\.?\d{0,2}$/.test(v) || v === "") {
                    setAmount(v === "" ? 0 : parseFloat(v));
                  }
                }}
                className="font-semibold text-right text-red-600 focus:ring-purple-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Referencia (opcional)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={loadingPaymentMethods || !paymentMethodId || amount <= 0}>
              {loadingPaymentMethods ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4 mr-2" />
              )}
              Liquidar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
} 