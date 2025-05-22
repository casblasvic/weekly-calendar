"use client";

import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TicketPaymentFormValues } from '@/lib/schemas/ticket';
import { usePaymentMethodsQuery } from '@/lib/hooks/use-api-query';
import { formatCurrency } from '@/lib/utils';
import { BorderBeam } from '@/components/ui/border-beam';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { PaymentMethodType } from '@prisma/client';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPayment: (payment: TicketPaymentFormValues) => void;
  pendingAmount: number;
  /**
   * Lista opcional de tipos de método de pago que NO deben mostrarse en el selector.
   * Ej.: [PaymentMethodType.DEFERRED_PAYMENT]
   */
  excludedPaymentMethodTypes?: PaymentMethodType[];
}

export function AddPaymentModal({ 
  isOpen, 
  onClose, 
  onAddPayment, 
  pendingAmount,
  excludedPaymentMethodTypes = [],
}: AddPaymentModalProps) {
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [amount, setAmount] = useState<number>(pendingAmount);
  const [reference, setReference] = useState<string>('');
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: paymentMethods = [], isLoading: loadingPaymentMethods } = usePaymentMethodsQuery();

  // Filtrar métodos de pago según exclusiones solicitadas
  const filteredPaymentMethods = React.useMemo(() => {
    if (!excludedPaymentMethodTypes || excludedPaymentMethodTypes.length === 0) return paymentMethods;
    return paymentMethods.filter((m: { type?: PaymentMethodType }) => !m.type || !excludedPaymentMethodTypes.includes(m.type));
  }, [paymentMethods, excludedPaymentMethodTypes]);

  useEffect(() => {
    if (isOpen) {
      // Redondear el pendiente a 2 decimales al iniciar
      setAmount(parseFloat(pendingAmount.toFixed(2)));
      setPaymentMethodId(''); // Resetear método de pago
      setReference(''); // Resetear referencia
    }
  }, [pendingAmount, isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir números y un punto decimal
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setAmount(value === '' ? 0 : parseFloat(value));
    }
  };
  
  const handleAddClick = () => {
    if (!paymentMethodId) {
      toast({
        title: t('tickets.addPaymentModal.paymentMethodRequiredTitle'),
        description: t('tickets.addPaymentModal.paymentMethodRequiredDesc'),
        variant: "destructive",
      });
      return;
    }
    
    if (amount <= 0) {
      toast({
        title: t('tickets.addPaymentModal.invalidAmountTitle'),
        description: t('tickets.addPaymentModal.invalidAmountDesc'),
        variant: "destructive",
      });
      return;
    }

    const selectedMethod = paymentMethods.find((m: any) => m.id === paymentMethodId);

    onAddPayment({
      paymentMethodDefinitionId: paymentMethodId,
      paymentMethodName: selectedMethod?.name || 'Desconocido',
      paymentMethodCode: selectedMethod?.code || undefined,
      amount: amount,
      paymentDate: new Date(),
      transactionReference: reference,
      id: `temp-${Date.now()}-${Math.random()}` // Generar ID temporal único
    });
    onClose();
  };

  const renderSubmitButton = () => {
    if (loadingPaymentMethods || amount <= 0 || !paymentMethodId) {
      return (
        <Button
          disabled={true}
          className="w-full text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {t('tickets.addPaymentModal.confirmButton')}
        </Button>
      );
    }
    return (
      <Button
        onClick={handleAddClick}
        className="w-full text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        {t('tickets.addPaymentModal.confirmButton')}
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Ajustar tamaño máximo y padding */}
      <DialogContent className="sm:max-w-[480px] overflow-hidden p-0">
        {/* BorderBeam sutil */}
        <BorderBeam size={150} duration={6} delay={0} colorFrom="#8b5cf6" colorTo="#ec4899" />
        
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-center">
              {t('tickets.addPaymentModal.title')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Importe Pendiente (solo informativo) */}
            <div className="text-sm text-center text-gray-600">
              {t('tickets.addPaymentModal.pendingInfo')}
              <span className="ml-1 font-semibold text-purple-700">
                {formatCurrency(pendingAmount)}
              </span>
            </div>

            {/* Método de Pago */}
            <div className="space-y-1.5">
              <Label htmlFor="payment-method">{t('tickets.addPaymentModal.paymentMethodLabel')}</Label>
              <Select 
                value={paymentMethodId}
                onValueChange={setPaymentMethodId}
              >
                {/* Quitar clase de borde explícita si existe, usar estilos por defecto */}
                <SelectTrigger id="payment-method" className="w-full focus:ring-purple-500/50">
                  <SelectValue placeholder={t('tickets.addPaymentModal.paymentMethodPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {loadingPaymentMethods ? (
                    <SelectItem value="loading" disabled>{t('tickets.addPaymentModal.loadingMethods')}</SelectItem>
                  ) : (
                    filteredPaymentMethods.length > 0 ? (
                      filteredPaymentMethods.map((method: any) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {t('tickets.addPaymentModal.noMethodsAvailable', 'Sin métodos disponibles')}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Importe a Pagar */}
            <div className="space-y-1.5">
              <Label htmlFor="amount-to-pay">{t('tickets.addPaymentModal.amountLabel')}</Label>
              <Input 
                id="amount-to-pay"
                type="number" 
                step="0.01" 
                min="0.01"
                placeholder="0.00"
                value={amount > 0 ? amount.toString() : ''} // Mostrar cadena vacía si es 0
                onChange={handleAmountChange}
                className="font-semibold text-right text-red-600 focus:ring-purple-500/50"
              />
            </div>

            {/* Referencia (Opcional) */}
            <div className="space-y-1.5">
              <Label htmlFor="reference">{t('tickets.addPaymentModal.referenceLabel')}</Label>
              <Input 
                id="reference"
                placeholder={t('tickets.addPaymentModal.referencePlaceholder')}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="focus:ring-purple-500/50"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              variant="outline"
              onClick={onClose}
              className="mr-2"
            >
              {t('common.cancel')}
            </Button>
            {renderSubmitButton()}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
} 