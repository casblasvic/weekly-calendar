"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { BorderBeam } from '@/components/ui/border-beam';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { ticketItemSchema, TicketItemFormValues } from '@/lib/schemas/ticket'; // Asegúrate que la ruta es correcta
import { useVatTypesQuery } from '@/lib/hooks/use-vat-query'; // Nombre corregido
import { AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

// Definir un schema local para el formulario del modal, si es necesario,
// o usar directamente campos de TicketItemFormValues
// Ejemplo de schema local si los campos difieren mucho del principal:
/*
const discountFormSchema = z.object({
  vatRateId: z.string().optional().nullable(),
  discountType: z.enum(['finalPrice', 'percentage', 'promotion']),
  finalPriceValue: z.number().optional().nullable(),
  discountPercentage: z.number().min(0).max(100).optional().nullable(),
  appliedPromotionId: z.string().optional().nullable(),
  accumulatedDiscount: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});
type DiscountFormValues = z.infer<typeof discountFormSchema>;
*/

interface ApplyDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIndex: number | null;
  currentItem: TicketItemFormValues | null; // El item actual del formulario principal
  onApplyDiscount: (itemIndex: number, updates: Partial<TicketItemFormValues>) => void;
}

export function ApplyDiscountModal({
  isOpen,
  onClose,
  itemIndex,
  currentItem,
  onApplyDiscount,
}: ApplyDiscountModalProps) {
  const { t } = useTranslation();
  const { data: vatTypesData, isLoading: isLoadingVAT } = useVatTypesQuery();
  // TODO: Reemplazar con datos reales de promociones
  // const { data: promotionsData, isLoading: isLoadingPromotions } = useCompatiblePromotionsQuery(currentItem?.serviceId || currentItem?.productId);
  const promotionsData = [
    { id: 'promo1', name: 'Descuento Verano 10%', systemId: 'sys1' },
    { id: 'promo2', name: 'Promo Especial Cliente VIP', systemId: 'sys1' },
  ];
  const isLoadingPromotions = false;

  // Estados locales para manejar los inputs independientemente de RHF si es más simple
  const [discountType, setDiscountType] = useState<'finalPrice' | 'percentage' | 'promotion'>('percentage');
  const [finalPriceValue, setFinalPriceValue] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<string>('');
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [accumulatedDiscount, setAccumulatedDiscount] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [selectedVatId, setSelectedVatId] = useState<string | null | undefined>(undefined); // undefined para 'Usar actual'

  // Resetear estado cuando el modal se abre o el item cambia
  useEffect(() => {
    if (isOpen && currentItem) {
      // Priorizar el tipo de descuento ya aplicado si existe
      if (currentItem.manualDiscountAmount && currentItem.manualDiscountAmount > 0 && currentItem.originalUnitPrice) {
         // Calcular precio final a partir del descuento por importe
        setDiscountType('finalPrice');
        setFinalPriceValue((currentItem.originalUnitPrice - currentItem.manualDiscountAmount).toFixed(2));
        setDiscountPercentage('');
        setSelectedPromotionId(null);
      } else if (currentItem.manualDiscountPercentage && currentItem.manualDiscountPercentage > 0) {
        setDiscountType('percentage');
        setFinalPriceValue('');
        setDiscountPercentage(currentItem.manualDiscountPercentage.toString());
        setSelectedPromotionId(null);
      } else if (currentItem.appliedPromotionId) {
        setDiscountType('promotion');
        setFinalPriceValue('');
        setDiscountPercentage('');
        setSelectedPromotionId(currentItem.appliedPromotionId);
      } else {
        // Valor por defecto si no hay descuento aplicado
        setDiscountType('percentage');
        setFinalPriceValue('');
        setDiscountPercentage('');
        setSelectedPromotionId(null);
      }

      setAccumulatedDiscount(currentItem.accumulatedDiscount || false);
      setNotes(currentItem.notes || '');
      setSelectedVatId(currentItem.vatRateId ?? undefined); // Si es null/undefined en el item, usar 'Usar actual'
    } else if (!isOpen) {
      // Resetear al cerrar para asegurar que la próxima vez empiece con 'Usar actual'
      setSelectedVatId(undefined);
    }
  }, [isOpen, currentItem]);

  const handleSave = () => {
    if (itemIndex === null || !currentItem) return;

    const originalPrice = currentItem.originalUnitPrice ?? currentItem.unitPrice;

    let updates: Partial<TicketItemFormValues> = {
      notes: notes || null,
      accumulatedDiscount: accumulatedDiscount,
      vatRateId: selectedVatId === undefined ? currentItem.vatRateId : selectedVatId,
      unitPrice: originalPrice,
      originalUnitPrice: originalPrice,
      manualDiscountAmount: 0,
      manualDiscountPercentage: 0,
      appliedPromotionId: null,
      promotionDiscountAmount: 0,
      discountAmount: 0,
    };

    let calculatedManualDiscount = 0;
    let calculatedPromoDiscount = 0;
    let finalPriceForVat = originalPrice;

    switch (discountType) {
      case 'finalPrice':
        const finalPriceNum = parseFloat(finalPriceValue);
        if (!isNaN(finalPriceNum) && finalPriceNum >= 0 && finalPriceNum <= originalPrice) {
          calculatedManualDiscount = originalPrice - finalPriceNum;
          finalPriceForVat = finalPriceNum;
          updates.manualDiscountAmount = calculatedManualDiscount;
        } else {
          console.error("Precio final inválido");
          return;
        }
        break;
      case 'percentage':
        const percentageNum = parseFloat(discountPercentage);
        if (!isNaN(percentageNum) && percentageNum >= 0 && percentageNum <= 100) {
          calculatedManualDiscount = originalPrice * (percentageNum / 100);
          finalPriceForVat = originalPrice - calculatedManualDiscount;
          updates.manualDiscountPercentage = percentageNum;
          updates.manualDiscountAmount = calculatedManualDiscount;
        } else {
          console.error("Porcentaje inválido");
          return;
        }
        break;
      case 'promotion':
        if (selectedPromotionId) {
          updates.appliedPromotionId = selectedPromotionId;
          const promo = promotionsData.find(p => p.id === selectedPromotionId);
          let promoDiscountValue = originalPrice * 0.15;
          calculatedPromoDiscount = Math.min(promoDiscountValue, originalPrice);
          finalPriceForVat = originalPrice - calculatedPromoDiscount;
          updates.promotionDiscountAmount = calculatedPromoDiscount;
        } else {
           console.error("Promoción no seleccionada");
           return;
        }
        break;
    }

    updates.discountAmount = calculatedManualDiscount + calculatedPromoDiscount;
    updates.finalPrice = finalPriceForVat;

    const finalVatIdToUse = updates.vatRateId;
    const vatRateObject = vatTypesData?.find(vat => vat.id === finalVatIdToUse);
    const vatRateToUse = vatRateObject?.rate ?? 0;

    updates.vatRate = vatRateToUse;
    updates.vatAmount = parseFloat(((finalPriceForVat * vatRateToUse) / 100).toFixed(2));

    if(isNaN(updates.vatAmount)) {
      updates.vatAmount = 0;
    }

    console.log("Applying discount updates (v2):", updates);
    onApplyDiscount(itemIndex, updates);
    onClose();
  };

  if (!currentItem) return null; // No renderizar si no hay item

  const currentVatRate = vatTypesData?.find(vat => vat.id === currentItem.vatRateId)?.rate ?? 0;
  const displayedSelectedVatRate = selectedVatId === undefined
    ? currentVatRate
    : vatTypesData?.find(vat => vat.id === selectedVatId)?.rate ?? currentVatRate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="p-6 space-y-6">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-xl font-semibold">
              {t('tickets.applyDiscountModal.title', { item: currentItem.concept || 'Concepto' })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="vatType" className="text-sm">
                {t('tickets.applyDiscountModal.vatTypeLabel')}
              </Label>
              <Select
                value={selectedVatId === undefined ? 'current' : selectedVatId ?? ''}
                onValueChange={(value) => setSelectedVatId(value === 'current' ? undefined : value)}
                disabled={isLoadingVAT}
              >
                <SelectTrigger
                  id="vatType"
                  className={cn(
                    "w-full mt-1",
                    "focus:ring-purple-500 focus:border-purple-500"
                  )}
                >
                  <SelectValue placeholder={t('tickets.applyDiscountModal.vatTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">
                    {t('tickets.applyDiscountModal.useCurrentVat', { vatRate: currentVatRate.toFixed(2) })}
                  </SelectItem>
                  {vatTypesData?.map((vat) => (
                    <SelectItem key={vat.id} value={vat.id}>
                      {vat.name} ({vat.rate.toFixed(2)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('tickets.applyDiscountModal.selectedVatInfo', { vatRate: displayedSelectedVatRate.toFixed(2) })}
              </p>
            </div>

            <RadioGroup
              value={discountType}
              onValueChange={(value) => setDiscountType(value as 'finalPrice' | 'percentage' | 'promotion')}
              className="space-y-3 pt-2"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="finalPrice" id="r1" />
                <Input
                  id="finalPrice"
                  type="number"
                  placeholder={t('tickets.applyDiscountModal.finalPriceLabel')}
                  value={finalPriceValue}
                  onChange={(e) => setFinalPriceValue(e.target.value)}
                  disabled={discountType !== 'finalPrice'}
                  className={cn("flex-1 h-9 text-sm", discountType === 'finalPrice' ? "border-purple-500 focus-visible:ring-purple-500" : "bg-gray-50")}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="flex items-center space-x-3">
                <RadioGroupItem value="percentage" id="r2" />
                <Input
                  id="percentage"
                  type="number"
                  placeholder={t('tickets.applyDiscountModal.percentageLabel')}
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  disabled={discountType !== 'percentage'}
                  className={cn("flex-1 h-9 text-sm", discountType === 'percentage' ? "border-purple-500 focus-visible:ring-purple-500" : "bg-gray-50")}
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div className="flex items-center space-x-3">
                <RadioGroupItem value="promotion" id="r3" />
                <Select
                  value={selectedPromotionId || ''}
                  onValueChange={setSelectedPromotionId}
                  disabled={discountType !== 'promotion'}
                >
                  <SelectTrigger className={cn("flex-1 h-9 text-sm", discountType === 'promotion' ? "border-purple-500 focus-visible:ring-purple-500" : "bg-gray-50")}>
                    <SelectValue placeholder={t('tickets.applyDiscountModal.promotionPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {promotionsData?.length > 0 ? promotionsData.map((promo) => (
                      <SelectItem key={promo.id} value={promo.id} className="text-sm">
                        {promo.name}
                      </SelectItem>
                    )) : (
                      <SelectItem value="no-promo" disabled className="text-sm">
                        {t('tickets.applyDiscountModal.noPromotionsAvailable')}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </RadioGroup>

            <div className="flex items-center space-x-2 pt-3">
               <Checkbox
                 id="accumulatedDiscountCheck"
                checked={accumulatedDiscount}
                onCheckedChange={(checked) => setAccumulatedDiscount(Boolean(checked))}
               />
               <Label htmlFor="accumulatedDiscountCheck" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('tickets.applyDiscountModal.accumulatedDiscountLabel')}
               </Label>
            </div>

            <div className="space-y-1.5 pt-2">
              <Textarea
                id="comments"
               placeholder={t('tickets.applyDiscountModal.commentsPlaceholder')}
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] text-sm"
              />
           </div>

          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>{t('tickets.applyDiscountModal.cancelButton')}</Button>
            <ShimmerButton
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSave}
            >
              {t('tickets.applyDiscountModal.saveButton')}
            </ShimmerButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
} 