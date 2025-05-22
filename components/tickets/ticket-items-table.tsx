"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, XCircle, Tag, Gift, Percent, PlusCircle, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TicketFormValues, TicketItemFormValues } from '@/lib/schemas/ticket';
import { formatCurrency } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useTranslation } from 'react-i18next';

// Datos de ejemplo para tipos de IVA
const exampleVatTypes = [
  { id: 'vat_1', name: 'IVA General 21%', percentage: 21 },
  { id: 'vat_2', name: 'IVA Reducido 10%', percentage: 10 },
  { id: 'vat_3', name: 'IVA Superreducido 4%', percentage: 4 },
  { id: 'vat_4', name: 'Exento 0%', percentage: 0 },
];

// Interfaz para las props del componente
interface TicketItemsTableProps {
  onOpenAddItemModal: () => void;
  onOpenBonosModal: (itemIndex: number) => void;
  onOpenDiscountModal: (itemIndex: number) => void;
  items: TicketItemFormValues[];
  onRemoveItem: (index: number) => void;
  onQuantityChange: (index: number, quantity: number) => void;
  readOnly?: boolean;
  currencyCode: string;
  currencySymbol: string;
}

export function TicketItemsTable({
  onOpenAddItemModal,
  onOpenBonosModal,
  onOpenDiscountModal,
  items,
  onRemoveItem,
  onQuantityChange,
  readOnly = false,
  currencyCode,
  currencySymbol,
}: TicketItemsTableProps) {
  const { t } = useTranslation();
  const { control, watch, setValue, getValues } = useFormContext<TicketFormValues>();
  const { fields, append, remove } = useFieldArray<TicketFormValues, "items">({
    control,
    name: "items",
  });

  const allItems = watch("items");

  // Actualizar totales generales del ticket cuando los items cambian
  useEffect(() => {
    if (allItems?.length) {
      // Calcular subtotal general (suma de precios netos de línea)
      const subtotal = allItems.reduce((acc, item) => acc + (item.finalPrice || 0), 0);
      setValue('subtotalAmount', subtotal);
      
      // Calcular impuestos generales (suma de los IVA de línea ya calculados)
      const taxAmount = allItems.reduce((acc, item) => {
        return acc + (item.vatAmount || 0); // Usar el vatAmount del item directamente
      }, 0);
      setValue('taxAmount', taxAmount);
      
      // Total general
      setValue('totalAmount', subtotal + taxAmount);
    }
  }, [allItems, setValue]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-medium text-gray-700">{t('tickets.itemsTable.title')}</h2>
      </div>
      
      <div className="mt-4 overflow-x-auto border rounded-md">
        <Table className="min-w-full">
          <TableHeader className="bg-gray-50/50">
            <TableRow className="border-b">
              <TableHead className="p-2">{t('tickets.itemsTable.concept')}</TableHead>
              <TableHead className="text-right w-[100px] p-2">{t('tickets.itemsTable.quantity')}</TableHead>
              <TableHead className="text-right w-[120px] p-2">{t('tickets.itemsTable.unitPrice')}</TableHead>
              <TableHead className="text-right w-[80px] p-2">{t('tickets.itemsTable.discountPercent')}</TableHead>
              <TableHead className="text-right w-[100px] p-2">{t('tickets.itemsTable.discountAmount')}</TableHead>
              <TableHead className="text-right w-[80px] p-2">{t('tickets.itemsTable.vat')}</TableHead>
              <TableHead className="text-right w-[120px] p-2">{t('tickets.itemsTable.total')}</TableHead>
              {!readOnly && <TableHead className="text-right w-[80px] p-2">{t('tickets.itemsTable.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="py-8 text-center text-muted-foreground">
                  {t('tickets.itemsTable.noItems')}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => {
                const finalPrice = item.finalPrice || 0;
                
                return (
                  <TableRow 
                    key={item.id || index} 
                    className="border-b hover:bg-gray-50/50"
                  >
                    <TableCell className="px-3 py-2 font-medium">{item.concept}</TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      {!readOnly ? (
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value, 10);
                            if (!isNaN(newQuantity) && newQuantity >= 1) {
                              onQuantityChange(index, newQuantity);
                            } else if (e.target.value === '') {
                              onQuantityChange(index, 1);
                            }
                          }}
                          className="w-16 h-8 px-1 text-right border rounded-md focus-visible:ring-purple-500/50"
                          min="1"
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">{formatCurrency(item.unitPrice, currencySymbol)}</TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      {item.manualDiscountPercentage != null && item.manualDiscountPercentage > 0 ? `${item.manualDiscountPercentage.toFixed(2)}%` : '-'}
                      {item.appliedPromotionId && (item.manualDiscountPercentage == null || item.manualDiscountPercentage <= 0) &&
                        <HoverCard openDelay={100} closeDelay={50}>
                          <HoverCardTrigger asChild>
                            <span className="ml-1 font-semibold text-purple-600 cursor-help">P</span>
                          </HoverCardTrigger>
                          <HoverCardContent side="top" className="w-auto p-1 text-xs">
                            Promoción aplicada
                          </HoverCardContent>
                        </HoverCard>
                      }
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      {item.manualDiscountAmount != null && item.manualDiscountAmount > 0 ? formatCurrency(item.manualDiscountAmount, currencySymbol) : '-'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">{`${(item.vatRate || 0).toFixed(2)}%`}</TableCell>
                    <TableCell className="px-3 py-2 font-semibold text-right">
                      {formatCurrency((item.finalPrice || 0) + (item.vatAmount || 0), currencySymbol)}
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="px-2 py-1 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <HoverCard openDelay={100} closeDelay={50}>
                            <HoverCardTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(`w-6 h-6 hover:text-purple-700 hover:bg-purple-100/50`, 
                                  item.appliedPromotionId || 
                                  (item.manualDiscountAmount != null && item.manualDiscountAmount > 0) || 
                                  (item.manualDiscountPercentage != null && item.manualDiscountPercentage > 0) ? 
                                  'text-purple-600 fill-purple-600' : 'text-gray-400')}
                                onClick={() => onOpenDiscountModal(index)}
                                aria-label="Aplicar descuento/promoción"
                              >
                                <Tag className="w-4 h-4" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-auto p-1 text-xs">
                              {t('tickets.itemsTable.applyDiscountTooltip')}
                            </HoverCardContent>
                          </HoverCard>

                          {/* Botón para aplicar Bono */}
                          <HoverCard openDelay={100} closeDelay={50}>
                            <HoverCardTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6 text-blue-500 hover:text-blue-700 hover:bg-blue-100/50"
                                onClick={() => onOpenBonosModal(index)}
                                aria-label={t('tickets.itemsTable.applyBonoAriaLabel')}
                                disabled={true}
                              >
                                <Gift className="w-4 h-4" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-auto p-1 text-xs">
                              {t('tickets.itemsTable.applyBonoTooltip')}
                            </HoverCardContent>
                          </HoverCard>

                          <HoverCard openDelay={100} closeDelay={50}>
                            <HoverCardTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6 text-red-500 hover:text-red-700 hover:bg-red-100/50"
                                onClick={() => onRemoveItem(index)}
                                aria-label={t('tickets.itemsTable.deleteItemAriaLabel')}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-auto p-1 text-xs">
                              {t('tickets.itemsTable.deleteItemTooltip')}
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Botones flotantes debajo de la tabla */}
      <div className="flex items-center justify-end py-1 mt-3 space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => alert("Modal Cheque Regalo Pendiente")}
          className="px-2 text-xs text-purple-700 border-purple-200 h-7 hover:bg-purple-50"
          disabled={readOnly}
        >
          Añadir cheque regalo
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => alert("Modal Código Promoción Pendiente")}
          className="px-2 text-xs text-purple-700 border-purple-200 h-7 hover:bg-purple-50"
          disabled={readOnly}
        >
          Código de promoción
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onOpenAddItemModal}
          className="px-2 text-xs text-purple-700 border-purple-200 h-7 hover:bg-purple-50"
          disabled={readOnly}
        >
          <PlusCircle className="mr-1 h-3.5 w-3.5" />
          Añadir Producto/Servicio
        </Button>
      </div>
    </div>
  );
} 