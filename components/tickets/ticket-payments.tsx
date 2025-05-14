"use client";

import React from 'react';
import { useFormContext, useFieldArray, Controller, useWatch } from 'react-hook-form';
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

interface TicketPaymentsProps {
  onOpenAddPaymentModal: () => void;
  onRemovePayment?: (paymentId: string) => void;
  // Futuras props para editar/ver pagos si es necesario
  // onOpenEditPaymentModal: (paymentIndex: number) => void;
  // onOpenViewPaymentModal: (paymentIndex: number) => void;
}

// Simulación de formas de pago (deberían venir de la DB/contexto)
const examplePaymentMethods = [
  { id: 'pm_cash', name: 'Efectivo', type: 'CASH' },
  { id: 'pm_card', name: 'Tarjeta Crédito/Débito', type: 'CARD' },
  { id: 'pm_transfer', name: 'Transferencia Bancaria', type: 'BANK_TRANSFER' },
  { id: 'pm_bono', name: 'Bono/Paquete', type: 'INTERNAL_CREDIT' },
  { id: 'pm_bizum', name: 'Bizum', type: 'OTHER' },
];

export function TicketPayments({ onOpenAddPaymentModal, onRemovePayment }: TicketPaymentsProps) {
  const { control } = useFormContext<TicketFormValues>();
  const { fields, remove } = useFieldArray<TicketFormValues, "payments">({
    control,
    name: "payments",
  });
  const payments = useWatch({ control, name: 'payments' }) || [];

  // Resolver el icono del método de pago según el tipo
  const getPaymentMethodIcon = (methodId: string) => {
    // Esto es simplificado, se puede mejorar con un mapeo más completo
    if (methodId?.includes('card')) return CreditCard;
    if (methodId?.includes('cash')) return Wallet;
    if (methodId?.includes('transfer')) return Receipt;
    if (methodId?.includes('bono') || methodId?.includes('internal')) return Clock;
    return CreditCard; // Icono por defecto
  };

  // Función para manejar la eliminación de pagos
  const handleRemovePayment = (index: number, paymentId: string) => {
    // Si se proporcionó una función personalizada para eliminar pagos, úsala
    if (onRemovePayment && paymentId) {
      onRemovePayment(paymentId);
    } else {
      // De lo contrario, usa el remove de useFieldArray
      remove(index);
    }
  };

  return (
    <div className="space-y-2">
      {fields.length > 0 ? (
        <Table className="rounded-md">
          <TableBody>
            {fields.map((field, index) => {
              const payment = payments[index] as TicketPaymentFormValues;
              const paymentMethodInfo = examplePaymentMethods.find(pm => pm.id === payment?.paymentMethodDefinitionId);
              const PaymentIcon = getPaymentMethodIcon(payment?.paymentMethodDefinitionId);
              
              return (
                <TableRow 
                  key={field.id} 
                  className="hover:bg-purple-50/30"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <PaymentIcon className="w-4 h-4 mr-2 text-gray-500" />
                      <span>{paymentMethodInfo?.name || payment?.paymentMethodName || 'Método de pago'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {payment?.amount?.toFixed(2) || '0.00'} €
                  </TableCell>
                  <TableCell className="text-right text-gray-600 text-sm">
                    {payment?.paymentDate 
                      ? format(new Date(payment.paymentDate), 'dd MMM yyyy - HH:mm', { locale: es })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right w-[10%]">
                    {onRemovePayment && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                        onClick={() => handleRemovePayment(index, field.id)}
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
          className="border-purple-600 text-purple-700 hover:bg-purple-50 hover:text-purple-800 shadow-sm"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Pago
        </Button>
      </div>
    </div>
  );
} 