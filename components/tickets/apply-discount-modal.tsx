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
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { BorderBeam } from '@/components/ui/border-beam';
import { Button as ShadButton } from '@/components/ui/button';
import { ticketItemSchema, TicketItemFormValues } from '@/lib/schemas/ticket'; // Asegúrate que la ruta es correcta
import { useVatTypesQuery } from '@/lib/hooks/use-vat-query'; // Nombre corregido
import { AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

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
  const promotionsData: any[] = []; // Placeholder
  const isLoadingPromotions = false;

  const [discountType, setDiscountType] = useState<'finalPriceIncVAT' | 'percentage' | 'fixedAmount' | 'promotion'>('percentage');
  const [finalPriceIncVATInput, setFinalPriceIncVATInput] = useState<string>(''); // Precio final CON IVA
  const [percentageInput, setPercentageInput] = useState<string>('');
  const [fixedAmountInput, setFixedAmountInput] = useState<string>('');
  const [promotionIdInput, setPromotionIdInput] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');
  const [selectedVatIdInModal, setSelectedVatIdInModal] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen && currentItem) {
      console.log("[ApplyDiscountModal useEffect] currentItem para inicializar modal:", JSON.parse(JSON.stringify(currentItem)));
      const lineBasePrice = (currentItem.unitPrice || 0) * (currentItem.quantity || 0);
      const itemVatRate = currentItem.vatRate || 0;

      // Establecer el VAT del modal al del ítem actual o 'current' si no hay uno específico.
      setSelectedVatIdInModal(currentItem.vatRateId ?? undefined);

      if (currentItem.isPriceOverridden && typeof currentItem.finalPrice === 'number') {
        console.log("[ApplyDiscountModal useEffect] Inicializando en modo PRECIO FINAL DIRECTO");
        setDiscountType('finalPriceIncVAT');
        const priceWithVat = currentItem.finalPrice * (1 + itemVatRate / 100);
        setFinalPriceIncVATInput(priceWithVat.toFixed(2));
        setPercentageInput('');
        setFixedAmountInput('');
      } else if (currentItem.manualDiscountPercentage !== null && currentItem.manualDiscountPercentage !== undefined) {
        console.log("[ApplyDiscountModal useEffect] Inicializando en modo PORCENTAJE");
        setDiscountType('percentage');
        setPercentageInput(currentItem.manualDiscountPercentage.toString());
        setFixedAmountInput('');
        setFinalPriceIncVATInput('');
      } else if (currentItem.manualDiscountAmount !== null && currentItem.manualDiscountAmount !== undefined && currentItem.manualDiscountAmount > 0) {
        console.log("[ApplyDiscountModal useEffect] Inicializando en modo IMPORTE FIJO");
        setDiscountType('fixedAmount');
        setFixedAmountInput(currentItem.manualDiscountAmount.toString());
        if (lineBasePrice > 0 && currentItem.manualDiscountAmount > 0) {
            setPercentageInput(parseFloat(((currentItem.manualDiscountAmount / lineBasePrice) * 100).toFixed(2)).toString());
        } else {
            setPercentageInput('');
        }
        setFinalPriceIncVATInput('');
      } else if (currentItem.appliedPromotionId) {
        console.log("[ApplyDiscountModal useEffect] Inicializando en modo PROMOCIÓN");
        setDiscountType('promotion');
        setPromotionIdInput(currentItem.appliedPromotionId);
        setFinalPriceIncVATInput('');
        setPercentageInput('');
        setFixedAmountInput('');
      } else {
        console.log("[ApplyDiscountModal useEffect] Inicializando a PREDETERMINADO (sin descuento, sugiere porcentaje)");
        setDiscountType('percentage');
        setFinalPriceIncVATInput('');
        setPercentageInput('');
        setFixedAmountInput('');
        setPromotionIdInput(null);
      }
      setNotesInput(currentItem.discountNotes || '');
    }
  }, [isOpen, currentItem]);

  const handleSave = () => {
    if (itemIndex === null || !currentItem) return;

    const lineBasePrice = (currentItem.unitPrice || 0) * (currentItem.quantity || 0);
    const vatInfoToUse = vatTypesData?.find(vat => vat.id === selectedVatIdInModal) ?? 
                         vatTypesData?.find(vat => vat.id === currentItem.vatRateId) ?? 
                         { id: currentItem.vatRateId, rate: currentItem.vatRate, name: 'VAT actual' }; // Fallback
    const vatRateValue = vatInfoToUse?.rate ?? 0;

    let updates: Partial<TicketItemFormValues> = {
      discountNotes: notesInput || null,
      isPriceOverridden: false,
      manualDiscountPercentage: null,
      manualDiscountAmount: null,
      appliedPromotionId: null, 
      promotionDiscountAmount: null,
      vatRateId: vatInfoToUse?.id || null, 
      vatRate: vatRateValue,
    };

    switch (discountType) {
      case 'finalPriceIncVAT':
        const finalPWithVAT = parseFloat(finalPriceIncVATInput);
        if (!isNaN(finalPWithVAT) && finalPWithVAT >= 0) {
          const netFinalPrice = finalPWithVAT / (1 + vatRateValue / 100);
          if (netFinalPrice > lineBasePrice + 0.001 && lineBasePrice > 0) { 
            toast({ title: "Error de Validación", description: `Precio final (neto ${netFinalPrice.toFixed(2)}) no puede ser mayor al precio base de línea (${lineBasePrice.toFixed(2)}).`, variant: "destructive" }); 
            return;
          }
          updates.isPriceOverridden = true;
          updates.finalPrice = parseFloat(netFinalPrice.toFixed(2)); 
          const calculatedDiscountAmount = parseFloat((lineBasePrice - netFinalPrice).toFixed(2));
          updates.manualDiscountAmount = calculatedDiscountAmount;
          // Calcular y añadir manualDiscountPercentage
          if (lineBasePrice > 0 && calculatedDiscountAmount > 0) {
            updates.manualDiscountPercentage = parseFloat(((calculatedDiscountAmount / lineBasePrice) * 100).toFixed(2));
          } else {
            updates.manualDiscountPercentage = null;
          }
          updates.appliedPromotionId = null; 
          updates.promotionDiscountAmount = null;
        } else { 
          toast({ title: "Error de Validación", description: "Precio final (IVA incluido) inválido.", variant: "destructive" });
          return; 
        }
        break;
      case 'percentage':
        const perc = parseFloat(percentageInput);
        if (!isNaN(perc) && perc >= 0 && perc <= 100) {
          updates.isPriceOverridden = false;
          updates.manualDiscountPercentage = perc;
          updates.manualDiscountAmount = parseFloat(((perc / 100) * lineBasePrice).toFixed(2));
          updates.appliedPromotionId = promotionIdInput; 
        } else { 
          toast({ title: "Error de Validación", description: "Porcentaje de descuento inválido (0-100).", variant: "destructive" });
          return; 
        }
        break;
      case 'fixedAmount': 
        const amount = parseFloat(fixedAmountInput);
        if (!isNaN(amount) && amount >= 0 && amount <= lineBasePrice) {
          updates.isPriceOverridden = false;
          updates.manualDiscountAmount = amount;
          if (lineBasePrice > 0) {
            updates.manualDiscountPercentage = parseFloat(((amount / lineBasePrice) * 100).toFixed(2));
          } else {
            updates.manualDiscountPercentage = null;
          }
          updates.appliedPromotionId = promotionIdInput;
        } else { 
          toast({ title: "Error de Validación", description: `Importe de descuento inválido (0 - ${lineBasePrice.toFixed(2)}).`, variant: "destructive" });
          return; 
        }
        break;
      case 'promotion':
        if (promotionIdInput) {
          updates.isPriceOverridden = false;
          updates.appliedPromotionId = promotionIdInput;
          updates.manualDiscountPercentage = null; 
          updates.manualDiscountAmount = null;
          // TODO: Obtener y aplicar el valor de la promoción a updates.promotionDiscountAmount
          // const promo = promotionsData.find(p => p.id === promotionIdInput);
          // if (promo) { updates.promotionDiscountAmount = calcularValorDescuento(promo, lineBasePrice); }
        } else { 
          toast({ title: "Error", description: "Promoción no seleccionada.", variant: "destructive" });
          return; 
        }
        break;
    }
    console.log("[ApplyDiscountModal handleSave] final updates a enviar a page.tsx:", JSON.stringify(updates, null, 2));
    onApplyDiscount(itemIndex, updates);
    onClose();
  };

  if (!currentItem) return null; // No renderizar si no hay item

  const currentItemVatRateForDisplay = selectedVatIdInModal 
    ? (vatTypesData?.find(vat => vat.id === selectedVatIdInModal)?.rate ?? 0)
    : (currentItem.vatRate ?? 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="p-6 space-y-6">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-xl font-semibold">
              {t('tickets.applyDiscountModal.title', { item: currentItem.concept || 'Concepto' })}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('tickets.applyDiscountModal.description', { item: currentItem.concept || 'Concepto' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="vatType" className="text-sm">
                {t('tickets.applyDiscountModal.vatTypeLabel')}
              </Label>
              <Select
                value={selectedVatIdInModal ?? 'current'} // 'current' si selectedVatIdInModal es undefined
                onValueChange={(value) => setSelectedVatIdInModal(value === 'current' ? undefined : value)}
                disabled={isLoadingVAT}
              >
                <SelectTrigger id="vatType" className={cn("w-full mt-1", "focus:ring-purple-500 focus:border-purple-500")}>
                  <SelectValue placeholder={t('tickets.applyDiscountModal.vatTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">
                    {t('tickets.applyDiscountModal.useCurrentVat', { vatRate: (currentItem.vatRate ?? 0).toFixed(2) })}
                  </SelectItem>
                  {vatTypesData?.map((vat) => (
                    <SelectItem key={vat.id} value={vat.id}>
                      {vat.name} ({vat.rate.toFixed(2)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('tickets.applyDiscountModal.selectedVatInfo', { vatRate: currentItemVatRateForDisplay.toFixed(2) })}
              </p>
            </div>

            <RadioGroup
              value={discountType}
              onValueChange={(value) => {
                setDiscountType(value as 'finalPriceIncVAT' | 'percentage' | 'fixedAmount' | 'promotion');
                // Limpiar inputs al cambiar de tipo para evitar valores residuales
                setFinalPriceIncVATInput('');
                setPercentageInput('');
                setFixedAmountInput('');
              }}
              className="space-y-3 pt-2"
            >
              {/* Precio final (IVA incl.) */}
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="finalPriceIncVAT" id="r_finalPrice" />
                <Input
                  id="finalPriceIncVATInput"
                  type="number"
                  placeholder={t('tickets.applyDiscountModal.finalPriceIncVATLabel', 'Precio Final (IVA Incl.)')}
                  value={finalPriceIncVATInput}
                  onChange={(e) => setFinalPriceIncVATInput(e.target.value)}
                  disabled={discountType !== 'finalPriceIncVAT'}
                  className="flex-1 h-9 text-sm border-purple-500 focus-visible:ring-purple-500"
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Descuento porcentaje */}
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="percentage" id="r_percentage" />
                <Input
                  id="percentageInput"
                  type="number"
                  placeholder={t('tickets.applyDiscountModal.percentageLabel')}
                  value={percentageInput}
                  onChange={(e) => setPercentageInput(e.target.value)}
                  disabled={discountType !== 'percentage'}
                  className="flex-1 h-9 text-sm border-purple-500 focus-visible:ring-purple-500"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              {/* Descuento importe fijo */}
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="fixedAmount" id="r_fixedAmount" />
                <Input
                  id="fixedAmountInput"
                  type="number"
                  placeholder={t('tickets.applyDiscountModal.fixedAmountLabel', 'Descuento Fijo (€)')}
                  value={fixedAmountInput}
                  onChange={(e) => setFixedAmountInput(e.target.value)}
                  disabled={discountType !== 'fixedAmount'}
                  className="flex-1 h-9 text-sm border-purple-500 focus-visible:ring-purple-500"
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Promoción */}
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="promotion" id="r_promotion" />
                <Select
                  value={promotionIdInput || ''}
                  onValueChange={setPromotionIdInput}
                  disabled={discountType !== 'promotion' || isLoadingPromotions || promotionsData.length === 0}
                >
                  <SelectTrigger className="flex-1 h-9 text-sm border-purple-500 focus-visible:ring-purple-500">
                    <SelectValue placeholder={t('tickets.applyDiscountModal.promotionPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPromotions && <SelectItem value="loading" disabled>{t('common.loading')}</SelectItem>}
                    {!isLoadingPromotions && promotionsData?.length === 0 && (
                      <SelectItem value="no-promo" disabled className="text-sm">
                        {t('tickets.applyDiscountModal.noPromotionsAvailable')}
                      </SelectItem>
                    )}
                    {promotionsData?.map((promo) => (
                      <SelectItem key={promo.id} value={promo.id} className="text-sm">
                        {promo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </RadioGroup>

            <div className="space-y-1.5 pt-2">
              <Textarea
                id="discountNotesInput"
                placeholder={t('tickets.applyDiscountModal.commentsPlaceholder')}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <ShadButton type="button" variant="outline" onClick={onClose}>{t('tickets.applyDiscountModal.cancelButton')}</ShadButton>
            <ShadButton
              type="button"
              className="h-10 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700"
              onClick={handleSave}
            >
              {t('tickets.applyDiscountModal.saveButton')}
            </ShadButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
} 