"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input"; // Necesario para importes en futuras ediciones en línea
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Para formas de pago
import { PlusCircle, XCircle, CreditCard, Wallet, Receipt, Clock } from 'lucide-react';
import type { TicketFormValues, TicketPaymentFormValues } from '@/lib/schemas/ticket';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PaymentMethodType } from '@prisma/client';

interface SimplePaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType | string;
  code?: string | null;
}

interface TicketPaymentsProps {
  payments: TicketPaymentFormValues[];
  deferredAmount?: number; // Monto pendiente aplazado (para mostrar línea virtual)
  onOpenAddPaymentModal: () => void;
  onRemovePayment?: (paymentId: string) => void;
  readOnly?: boolean;
  paymentMethodsCatalog?: SimplePaymentMethod[]; // Lista de métodos para mostrar nombres/iconos reales
}

// Simulación de formas de pago (deberían venir de la DB/contexto)
const examplePaymentMethods = [
  { id: 'pm_cash', name: 'Efectivo', type: 'CASH' },
  { id: 'pm_card', name: 'Tarjeta Crédito/Débito', type: 'CARD' },
  { id: 'pm_transfer', name: 'Transferencia Bancaria', type: 'BANK_TRANSFER' },
  { id: 'pm_bono', name: 'Bono/Paquete', type: 'INTERNAL_CREDIT' },
  { id: 'pm_bizum', name: 'Bizum', type: 'OTHER' },
];

export function TicketPayments({ 
  payments, 
  deferredAmount = 0, 
  onOpenAddPaymentModal, 
  onRemovePayment, 
  readOnly = false,
  paymentMethodsCatalog = [],
}: TicketPaymentsProps) {
  // Resolver el icono del método de pago según el tipo
  const getPaymentMethodIcon = (methodId: string) => {
    // Esto es simplificado, se puede mejorar con un mapeo más completo
    if (methodId?.includes('card')) return CreditCard;
    if (methodId?.includes('cash')) return Wallet;
    if (methodId?.includes('transfer')) return Receipt;
    if (methodId?.includes('bono') || methodId?.includes('internal') || methodId?.includes('deferred')) return Clock;
    return CreditCard; // Icono por defecto
  };

  const allPayments = React.useMemo(() => {
    const currentPayments = [...payments];

    // Añadir línea virtual de "Pago Aplazado" si se detecta deuda pendiente (deferredAmount > 0)
    if (deferredAmount && deferredAmount > 0.009) {
      const deferredPaymentEntry: TicketPaymentFormValues & { isDeferred?: boolean } = {
        id: 'deferred-line-system',
        paymentMethodDefinitionId: 'SYS_DEFERRED_PAYMENT',
        paymentMethodName: 'Pago Aplazado',
        paymentMethodCode: 'SYS_DEFERRED_PAYMENT',
        amount: deferredAmount,
        paymentDate: new Date(), // Placeholder, no se mostrará
        isDeferred: true,
        transactionReference: undefined,
        notes: undefined,
      };
      currentPayments.push(deferredPaymentEntry as TicketPaymentFormValues);
    }

    return currentPayments;
  }, [payments, deferredAmount]);

  // Función para manejar la eliminación de pagos
  const handleRemovePayment = (paymentId: string) => {
    if (onRemovePayment && paymentId) {
      onRemovePayment(paymentId);
    } 
  };

  return (
    <div className="space-y-2">
      {allPayments.length > 0 ? (
        <Table className="rounded-md">
          <TableBody>
            {allPayments.map((payment, index) => {
              const paymentMethodInfo = paymentMethodsCatalog.find(pm => pm.id === payment.paymentMethodDefinitionId);
              const PaymentIcon = getPaymentMethodIcon(payment?.paymentMethodDefinitionId);
              
              // Verificar si es la línea de pago aplazado usando la propiedad 'isDeferred'
              const isDeferredLine = !!(payment as any).isDeferred;
              
              return (
                <TableRow 
                  key={payment.id || `payment-${index}`}
                  className={cn(
                    "hover:bg-purple-50/30",
                    isDeferredLine && "bg-blue-50/30 hover:bg-blue-100/50" // Estilo opcional para la línea aplazada
                  )}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <PaymentIcon className="w-4 h-4 mr-2 text-gray-500" />
                      <span>
                        {isDeferredLine 
                          ? payment.paymentMethodName // Muestra "Pago Aplazado"
                          : (paymentMethodInfo?.name || payment?.paymentMethodName || 'Método de pago')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {payment?.amount?.toFixed(2) || '0.00'} €
                  </TableCell>
                  <TableCell className="text-right text-gray-600 text-sm">
                    {payment?.paymentDate && !isDeferredLine // No mostrar fecha para la línea aplazada
                      ? format(new Date(payment.paymentDate), 'dd MMM yyyy - HH:mm', { locale: es })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right w-[10%]">
                    {onRemovePayment && !isDeferredLine && !readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 rounded-full",
                          "text-red-500 hover:text-red-700 hover:bg-red-50"
                        )}
                        onClick={() => payment.id && handleRemovePayment(payment.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-6 text-gray-500 bg-gray-50/30 rounded-md">
          <p className="text-sm">No hay pagos registrados para este ticket</p>
        </div>
      )}
      
      <div className="flex justify-end pt-2">
        <Button 
          type="button"
          onClick={onOpenAddPaymentModal}
          variant="outline"
          size="sm"
          className="h-8 border-purple-600 text-purple-700 hover:bg-purple-50 hover:text-purple-800 shadow-sm"
          disabled={readOnly}
        >
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
          Añadir Pago
        </Button>
      </div>
    </div>
  );
} 