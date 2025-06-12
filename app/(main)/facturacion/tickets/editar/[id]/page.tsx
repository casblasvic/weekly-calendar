"use client";

import React, { useEffect, useState, use, useCallback } from 'react';
import { useForm, FormProvider, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketFormSchema, defaultTicketFormValues, type TicketFormValues, type TicketItemFormValues, type TicketPaymentFormValues } from '@/lib/schemas/ticket';
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Agregado Label
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, HelpCircle, Printer, Save, AlertTriangle, PlusCircle, RotateCcw, CheckCircle, Info } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from "@/components/ui/use-toast";
import { ClientSelectorSearch } from '@/components/tickets/client-selector-search';
import { TicketItemsTable } from '@/components/tickets/ticket-items-table';
import { TicketPayments } from '@/components/tickets/ticket-payments';
import { DebtPaymentsSection } from '@/components/tickets/debt-payments-section';
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MagicCard } from "@/components/ui/magic-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { Skeleton } from "@/components/ui/skeleton";
import { AddItemModal } from '@/components/tickets/add-item-modal';
import { LoadingSpinner } from '@/components/loading-spinner';
import { AddPaymentModal } from '@/components/tickets/add-payment-modal';
import { ApplyDiscountModal } from '@/components/tickets/apply-discount-modal';
import { useClinic } from '@/contexts/clinic-context';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import { 
  useTicketDetailQuery, 
  useUpdateTicketMutation, 
  useReopenTicketMutation,
  useCompleteAndCloseTicketMutation,
  useAddTicketItemMutation,
  useCreatePaymentMutation,
  type AddTicketItemPayload,
  type CreatePaymentPayload,
  useSaveTicketBatchMutation,
  type BatchUpdateTicketPayload,
  ticketKeys,
  useCreateTicketMutation 
} from '@/lib/hooks/use-ticket-query';
import { useUsersByClinicQuery, type UserForSelector } from "@/lib/hooks/use-user-query";
import { type PersonForSelector } from '@/lib/hooks/use-person-query';
import { TicketStatus, DiscountType, type User, PaymentMethodDefinition, Prisma, CashSessionStatus } from '@prisma/client';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from '@tanstack/react-query';
import { prefetchCommonData } from '@/lib/hooks/use-api-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChangeLogsAccordion } from '@/components/tickets/change-logs-accordion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { User as UserIcon, Phone, Mail, MapPin, Building2 } from 'lucide-react';

// Define o importa la constante para el código del método de pago aplazado
const DEFERRED_PAYMENT_METHOD_CODE = "SYS_DEFERRED_PAYMENT";

interface EditTicketPageProps {
  params: Promise<{
    id: string
  }>
}

// Helper para mapear el tamaño de impresión de la API al del formulario
const mapPrintSizeToFormEnum = (value?: string | null): TicketFormValues['printSize'] => {
  if (!value) return defaultTicketFormValues.printSize || '80mm'; // Usar default del schema
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'a4') return 'A4';
  if (lowerValue === '58mm') return '58mm';
  if (lowerValue === '80mm') return '80mm';
  return defaultTicketFormValues.printSize || '80mm'; // Fallback al default del schema
};

export default function EditarTicketPage({ params }: EditTicketPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get('from');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [isApplyDiscountModalOpen, setIsApplyDiscountModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [defaultPaymentAmount, setDefaultPaymentAmount] = useState<number>(0);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState<string | null>(null);
  const [isTicketClosable, setIsTicketClosable] = useState(false);
  const [showConfirmDelayedPaymentModal, setShowConfirmDelayedPaymentModal] = useState(false);
  const [showPaymentRequiredModal, setShowPaymentRequiredModal] = useState(false);
  const [pendingAmountForModal, setPendingAmountForModal] = useState<number>(0);
  const [isReopenConfirmModalOpen, setIsReopenConfirmModalOpen] = useState(false); // <<< NUEVO ESTADO
  const [hasServiceReceiver, setHasServiceReceiver] = useState(false);
  const [serviceReceiverClient, setServiceReceiverClient] = useState<PersonForSelector | null>(null);
  
  const { id } = use(params);
  const isNewTicket = id === 'new'; // << NUEVO
  const { activeClinic } = useClinic();
  const { t } = useTranslation();

  const [isReadOnly, setIsReadOnly] = useState(isNewTicket ? false : true); // default editable for new
  // <<< INICIO: Variables para control de reapertura >>>
  const [canReopenTicket, setCanReopenTicket] = useState(false);
  const [reopenButtonTooltip, setReopenButtonTooltip] = useState('');
  // Mantiene el spinner activo hasta que la navegación haya ocurrido tras cerrar el ticket
  const [redirectingAfterClose, setRedirectingAfterClose] = useState(false);
  // Estado para controlar el cierre del ticket
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  
  // Estado para forzar un re-renderizado después de cerrar
  const [closingTicket, setClosingTicket] = useState(false);
  // Evitar parpadeo de totales al iniciar / reabrir
  const [totalsReady, setTotalsReady] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [isSavingBeforeClose, setIsSavingBeforeClose] = useState(false);
  // <<< FIN: Variables para control de reapertura >>>

  const {
    data: ticketData, 
    isLoading: isLoadingTicket,
    isError: isErrorTicket,
    error: errorTicket,
    isSuccess: isSuccessTicket,
  } = useTicketDetailQuery(isNewTicket ? null : id); // disabled if new
  
  const queryClient = useQueryClient();
  const updateTicketMutation = useUpdateTicketMutation();
  const reopenTicketMutation = useReopenTicketMutation();
  const completeAndCloseMutation = useCompleteAndCloseTicketMutation();
  const saveTicketBatchMutation = useSaveTicketBatchMutation();
  const createTicketMutation = useCreateTicketMutation(); // << NUEVO
  
  // Prefetch de datos comunes (incluye métodos de pago) para mejorar la UX al abrir modales
  useEffect(() => {
    prefetchCommonData(queryClient);
  }, [queryClient]);

  const {
    data: sellers = [],
    isLoading: isLoadingSellers,
  } = useUsersByClinicQuery(
    { clinicId: activeClinic?.id || "" }, 
    { enabled: !!activeClinic?.id }
  );

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: defaultTicketFormValues,
    mode: 'onChange',
  });
  const { control, handleSubmit, setValue, setError, clearErrors, formState, watch, getValues, trigger, reset } = form;

  // Observar los campos relevantes para calcular el importe pendiente
  const ticketTotalAmount = watch('totalAmount');
  const currentPayments = watch('payments');
  
  // Prefetch de datos comunes (incluye métodos de pago) para mejorar la UX al abrir modales
  useEffect(() => {
    prefetchCommonData(queryClient);
  }, [queryClient]);

  useEffect(() => {
    if (isSuccessTicket && ticketData && activeClinic) {
      const currentTicketStatus = ticketData.status as TicketStatus;
      const readOnlyCalc = currentTicketStatus !== TicketStatus.OPEN;
      setIsReadOnly(readOnlyCalc);

      // <<< INICIO: Lógica de reapertura >>>
      const isContabilizadoOAnulado = ticketData.status === TicketStatus.ACCOUNTED || ticketData.status === TicketStatus.VOID;
      const isCerradoYConCajaNoAbierta = 
          ticketData.status === TicketStatus.CLOSED &&
          ticketData.cashSessionId && 
          ticketData.cashSession?.status !== CashSessionStatus.OPEN;

      const calculatedCanReopen = 
          ticketData.status === TicketStatus.CLOSED &&
          !isContabilizadoOAnulado &&
          (!ticketData.cashSessionId || 
           (ticketData.cashSessionId && ticketData.cashSession?.status === CashSessionStatus.OPEN)
          );
      setCanReopenTicket(calculatedCanReopen);

      let tooltipKey = 'tickets.actions.reopenTooltip'; // Default
      if (isContabilizadoOAnulado) {
        tooltipKey = 'tickets.actions.accountedOrVoidTooltip';
      } else if (isCerradoYConCajaNoAbierta) {
        tooltipKey = 'tickets.actions.closedAndSessionNotOpenTooltip';
      }
      setReopenButtonTooltip(t(tooltipKey));
      // <<< FIN: Lógica de reapertura >>>

      // 1. Process items, applying recalculateItemTotals to each
      const processedItemsForForm = (ticketData.items || []).map((apiItem: any) => {
        let formItem: TicketItemFormValues = {
          id: apiItem.id,
          type: apiItem.itemType,
          itemId: apiItem.itemId,
          concept: apiItem.description || (apiItem.service?.name || apiItem.product?.name || apiItem.bonoDefinition?.name || apiItem.packageDefinition?.name || t('tickets.addItemModal.itemNotSpecified')),
          quantity: apiItem.quantity,
          originalUnitPrice: apiItem.originalUnitPrice ?? null,
          unitPrice: apiItem.unitPrice,
          manualDiscountPercentage: apiItem.manualDiscountPercentage ?? null,
          manualDiscountAmount: apiItem.manualDiscountAmount ?? null,
          isPriceOverridden: apiItem.isPriceOverridden ?? false,
          discountNotes: apiItem.discountNotes ?? null,
          appliedPromotionId: apiItem.appliedPromotionId || undefined,
          promotionDiscountAmount: apiItem.promotionDiscountAmount || 0,
          vatRateId: apiItem.vatRate?.id || apiItem.vatRateId || undefined,
          vatRate: apiItem.vatRate?.rate || 0,
          finalPrice: 0, // Placeholder
          vatAmount: 0,  // Placeholder
          accumulatedDiscount: apiItem.accumulatedDiscount ?? false,
          bonoInstanceId: apiItem.consumedBonoInstanceId || undefined,
        };
        if (formItem.isPriceOverridden) {
          if (apiItem.finalPrice !== null && apiItem.finalPrice !== undefined) {
            formItem.finalPrice = apiItem.finalPrice;
          } else if (formItem.manualDiscountAmount !== null) {
            const baseLinePriceInit = (formItem.unitPrice || 0) * (formItem.quantity || 0);
            formItem.finalPrice = baseLinePriceInit - formItem.manualDiscountAmount;
          }
        }
        // <<< LOG DE DEBUG >>>
        if (apiItem.id === 'cmaqk6u8l0001y2xwfjy61xpg') { // ID del "Pack Verano Láser Plus"
            console.log("[DEBUG page.tsx useEffect Carga] apiItem 'Pack Verano':", JSON.parse(JSON.stringify(apiItem)));
            console.log("[DEBUG page.tsx useEffect Carga] formItem ANTES de recalculateTotals:", JSON.parse(JSON.stringify(formItem)));
        }
        // <<< FIN LOG >>>
        return recalculateItemTotals(formItem);
      });

      // 2. Process payments
      const processedPaymentsForForm = (ticketData.payments || []).map((p: any) => ({
        id: p.id,
        paymentMethodDefinitionId: p.paymentMethodDefinition?.id,
        paymentMethodName: p.paymentMethodDefinition?.name || t('common.unknown'),
        paymentMethodCode: p.paymentMethodDefinition?.code || null,
        paymentMethodType: p.paymentMethodDefinition?.type || null,
        amount: p.amount,
        paymentDate: p.paymentDate ? new Date(p.paymentDate) : new Date(),
        transactionReference: p.transactionReference || '',
        notes: p.notes || '',
      }));

      // 3. Calculate initial summary totals based on processed items and payments
      const subtotalInit = processedItemsForForm.reduce((sum, itm) => sum + (itm.finalPrice || 0), 0);
      const totalIVAInit = processedItemsForForm.reduce((sum, itm) => sum + (itm.vatAmount || 0), 0);

      // Calcular pagos aplazados para restarlos del cálculo del IVA
      const deferredPayments = processedPaymentsForForm.filter((p: any) => 
        p.paymentMethodCode === 'SYS_DEFERRED_PAYMENT' || 
        (ticketData.payments?.find((tp: any) => tp.id === p.id)?.paymentMethodDefinition?.type === 'DEFERRED_PAYMENT')
      );
      const deferredAmount = deferredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const nonDeferredAmount = processedPaymentsForForm.reduce((sum, p) => sum + (p.amount || 0), 0) - deferredAmount;

      let effectiveGlobalDiscountInit = 0;
      const globalDiscountTypeInit = ticketData.discountType || null;
      const globalDiscountAmountInit = ticketData.discountAmount ?? null;

      if (globalDiscountTypeInit === 'PERCENTAGE') {
        effectiveGlobalDiscountInit = subtotalInit * ((globalDiscountAmountInit || 0) / 100);
      } else if (globalDiscountTypeInit === 'FIXED_AMOUNT') {
        effectiveGlobalDiscountInit = globalDiscountAmountInit || 0;
      }
      effectiveGlobalDiscountInit = Math.max(0, Math.min(effectiveGlobalDiscountInit, subtotalInit));

      const taxableBaseInit = subtotalInit - effectiveGlobalDiscountInit;
      const totalGeneralInit = taxableBaseInit + totalIVAInit;
      
      // Calcular el porcentaje pagado (sin incluir aplazados) para ajustar el IVA
      const paidPercentage = totalGeneralInit > 0 ? nonDeferredAmount / totalGeneralInit : 0;
      const adjustedBase = taxableBaseInit * paidPercentage; // Base ajustada
      const adjustedIVA = totalIVAInit * paidPercentage; // IVA ajustado
      const adjustedTotal = adjustedBase + adjustedIVA; // Total ajustado
      
      const amountPaidInit = adjustedBase; // "Pagado" es la base imponible sin IVA

      // 4. Construct the complete formValues object for reset
      const formValues: Partial<TicketFormValues> = {
        personId: ticketData.personId,
        clientName: ticketData.person 
          ? `${ticketData.person.firstName} ${ticketData.person.lastName || ''}`.trim()
          : '',
        clientDetails: ticketData.person,
        sellerId: ticketData.sellerUser?.id || null,
        series: ticketData.ticketSeries || defaultTicketFormValues.series,
        printSize: mapPrintSizeToFormEnum(ticketData.clinic?.ticketSize),
        observations: ticketData.notes || defaultTicketFormValues.observations,
        status: ticketData.status as TicketFormValues['status'],
        items: processedItemsForForm,
        payments: processedPaymentsForForm,
        ticketDate: ticketData.issueDate ? new Date(ticketData.issueDate) : (defaultTicketFormValues.ticketDate || new Date()),
        ticketNumber: ticketData.ticketNumber,
        globalDiscountType: globalDiscountTypeInit,
        globalDiscountAmount: globalDiscountAmountInit,
        globalDiscountReason: ticketData.discountReason || null,
        subtotalAmount: parseFloat(subtotalInit.toFixed(2)),
        taxableBaseAmount: parseFloat(taxableBaseInit.toFixed(2)),
        taxAmount: parseFloat(adjustedIVA.toFixed(2)),
        totalAmount: parseFloat(adjustedTotal.toFixed(2)),
        amountPaid: parseFloat(amountPaidInit.toFixed(2)),
        amountDeferred: ticketData.dueAmount && ticketData.dueAmount > 0 ? ticketData.dueAmount : 0,
      };

      // 5. Reset the form with all pre-calculated values
      reset(formValues as TicketFormValues); 
      console.log("[DEBUG page.tsx useEffect] FIN. Formulario reseteado. formState.isDirty DESPUÉS de reset:", form.formState.isDirty);
      setTotalsReady(true);
    }
  }, [isSuccessTicket, ticketData, ticketData?.status, activeClinic, reset, getValues, t, mapPrintSizeToFormEnum]); // <<< AÑADIDO ticketData.status aquí

  useEffect(() => {
    console.log('[EditarTicketPage] Form state debug:', {
      isDirty: form.formState.isDirty,
      dirtyFields: form.formState.dirtyFields,
    });
  }, [form.formState.isDirty, form.formState.dirtyFields]);

  useEffect(() => {
    if (ticketData?.personId) {
      setHasServiceReceiver(true);
      // Buscar la persona receptora
      fetch(`/api/persons/${ticketData.personId}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setServiceReceiverClient(data);
          }
        })
        .catch(err => console.error('Error cargando persona receptora:', err));
    }
  }, [ticketData?.personId]);

  const watchedItems = watch("items");
  const watchedPayments = watch("payments");
  const watchedTotalAmountFromForm = watch('totalAmount');

  useEffect(() => {
    // Ensure ticketData and activeClinic are loaded, and ticket is OPEN
    if (!ticketData || !activeClinic || (ticketData.status as string) !== TicketStatus.OPEN) {
      setIsTicketClosable(false);
      return;
    }

    // Use watched values for direct reactivity
    const currentTotalAmount = watchedTotalAmountFromForm || 0;
    const currentPaymentsArray = watchedPayments || [];

    const totalPaid = currentPaymentsArray.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    // Ensure dueAmount is not negative for the check, and use a small epsilon for float comparisons.
    const dueAmount = Math.max(0, currentTotalAmount - totalPaid); 
    
    // Update pendingAmountForModal, ensuring it's 0 if effectively paid.
    setPendingAmountForModal(dueAmount < 0.009 ? 0 : dueAmount);

    const clinicAllowsDelayedPayments = activeClinic.delayedPayments === true;

    // Determine if ticket is closable
    if (dueAmount <= 0.009) { // Using a small epsilon for float comparisons (e.g., $0.009)
      setIsTicketClosable(true);
    } else if (clinicAllowsDelayedPayments) {
      // If clinic allows delayed payments, ticket is closable even if there's a pending amount.
      // handleCompleteAndCloseTicket will manage the deferral process.
      setIsTicketClosable(true);
    } else {
      setIsTicketClosable(false);
    }
  }, [
    ticketData?.status, // More specific dependency
    activeClinic?.delayedPayments, // More specific dependency
    watchedTotalAmountFromForm,
    watchedPayments,
  ]);

  const recalculateItemTotals = (item: TicketItemFormValues): TicketItemFormValues => {
    const unitPrice = Number(item.unitPrice) || 0;
    const quantity = Number(item.quantity) || 0;
    const promoDiscount = Number(item.promotionDiscountAmount) || 0;
    const vatRate = Number(item.vatRate) || 0;
    
    let linePriceNeto: number; 
    let finalManualDiscountAmount = item.manualDiscountAmount ?? 0;
    let finalManualDiscountPercentage = item.manualDiscountPercentage ?? null;
    const baseLinePrice = unitPrice * quantity;

    if (item.isPriceOverridden && typeof item.finalPrice === 'number') {
      // console.debug("[recalculateItemTotals] MODO PRECIO SOBREESCRITO finalPrice:", item.finalPrice);
      linePriceNeto = item.finalPrice; 
      // El descuento en € es la diferencia entre el precio base y el precio final neto sobreescrito
      finalManualDiscountAmount = parseFloat((baseLinePrice - linePriceNeto).toFixed(2));
      if (finalManualDiscountAmount < 0) finalManualDiscountAmount = 0; // No puede ser negativo
      
      // Siempre calcular el porcentaje correspondiente a este descuento en €
      if (baseLinePrice > 0 && finalManualDiscountAmount >= 0) {
        finalManualDiscountPercentage = parseFloat(((finalManualDiscountAmount / baseLinePrice) * 100).toFixed(2));
      } else {
        finalManualDiscountPercentage = null;
      }
    } else {
      // Modo NO sobreescrito: el descuento se determina por porcentaje o por un monto fijo directo.
      if (finalManualDiscountPercentage !== null && finalManualDiscountPercentage !== undefined) {
        // Si hay porcentaje, este tiene prioridad para calcular el monto.
        finalManualDiscountAmount = parseFloat(((finalManualDiscountPercentage / 100) * baseLinePrice).toFixed(2));
      } else if (finalManualDiscountAmount !== null && finalManualDiscountAmount !== undefined) {
        // Si solo hay monto y no porcentaje, calcular el porcentaje si es posible.
        if (baseLinePrice > 0 && finalManualDiscountAmount > 0) {
          finalManualDiscountPercentage = parseFloat(((finalManualDiscountAmount / baseLinePrice) * 100).toFixed(2));
        } else {
          finalManualDiscountPercentage = null; // No se puede calcular % si el precio base es 0
        }
      } else {
        // No hay ningún tipo de descuento manual aplicado
        finalManualDiscountAmount = 0;
        finalManualDiscountPercentage = null;
      }
      // El precio neto de línea es el base menos el descuento calculado (manual + promo)
      linePriceNeto = baseLinePrice - finalManualDiscountAmount - promoDiscount;
    }

    if (linePriceNeto < 0) {
        // console.warn("[recalculateItemTotals] linePriceNeto es negativo, ajustando a 0.");
        linePriceNeto = 0; 
    }

    const itemVatAmount = linePriceNeto * (vatRate / 100);

    const result = {
      ...item,
      manualDiscountAmount: parseFloat(finalManualDiscountAmount.toFixed(2)),
      manualDiscountPercentage: finalManualDiscountPercentage,
      finalPrice: parseFloat(linePriceNeto.toFixed(2)), // finalPrice en formState es NETO PRE-IVA
      vatAmount: parseFloat(itemVatAmount.toFixed(2)),
    };
    // console.debug("[recalculateItemTotals] Ítem A DEVOLVER:", result);
    return result;
  };

  const onSubmit = async (formData: TicketFormValues) => {
    console.log("!!!!!!!! ONSUBMIT DEL FORMULARIO PRINCIPAL (page.tsx) EJECUTADO !!!!!!!!!!"); 
    console.log("----------- ONSUBMIT (BATCH) EJECUTADO ----------- GUARDAR TICKET");
    if (isNewTicket) {
      // 1. Validaciones mínimas
      if (!activeClinic?.id || !activeClinic?.currency) {
        toast({ title: t("common.error"), description: t('tickets.errors.noClinicInfo', 'Información de clínica no disponible.'), variant: "destructive" });
        return;
      }

      // 2. Crear el ticket en blanco primero (para obtener ID y nº)
      const createPayload = {
        clinicId: activeClinic.id,
        currencyCode: activeClinic.currency,
        personId: formData.personId || null,
        sellerUserId: formData.sellerId || null,
        notes: formData.observations || null,
      } as any;

      let createdTicket: any;
      try {
        createdTicket = await createTicketMutation.mutateAsync(createPayload);
      } catch (error: any) {
        console.error("Error creando ticket:", error);
        toast({ title: t("common.error"), description: error?.message || t('tickets.notifications.createError', 'No se pudo crear el ticket.'), variant: "destructive" });
        return;
      }

      const newTicketId = createdTicket.id;

      // 3. Construir payload completo para guardar ítems y pagos (no se hace diff porque el ticket está vacío)
      const batchPayload: BatchUpdateTicketPayload = {};

      // Escalares iniciales (solo si hay datos)
      const scalarUpdates: any = {};
      if (formData.personId) scalarUpdates.personId = formData.personId;
      if (formData.sellerId) scalarUpdates.sellerUserId = formData.sellerId;
      if (formData.observations) scalarUpdates.notes = formData.observations;
      if (formData.series) scalarUpdates.ticketSeries = formData.series;
      if (formData.globalDiscountType) {
        scalarUpdates.discountType = formData.globalDiscountType;
        scalarUpdates.discountAmount = formData.globalDiscountAmount || 0;
        scalarUpdates.discountReason = formData.globalDiscountReason || null;
      }
      if (Object.keys(scalarUpdates).length > 0) batchPayload.scalarUpdates = scalarUpdates;

      // Ítems
      if (formData.items && formData.items.length > 0) {
        batchPayload.itemsToAdd = formData.items.map((itm) => {
          const { id: localId, concept, finalPrice, vatAmount, type, discountNotes, ...itemDataRest } = itm;
          return {
            ...itemDataRest, 
            itemType: (type || 'CUSTOM') as any,
            discountNotes,
            tempId: localId 
          };
        });
      }

      // Pagos directos
      if (formData.payments && formData.payments.length > 0) {
        batchPayload.paymentsToAdd = formData.payments.filter(p => !p.id).map((p) => ({
          amount: Number(p.amount),
          paymentDate: p.paymentDate,
          transactionReference: p.transactionReference,
          notes: p.notes,
          paymentMethodDefinitionId: p.paymentMethodDefinitionId!,
          tempId: p.tempId,
        }));
      }

      // 4. Guardar el resto de datos con la API batch-update
      if (batchPayload.scalarUpdates || batchPayload.itemsToAdd || batchPayload.paymentsToAdd) {
        await new Promise<void>((resolve) => {
          saveTicketBatchMutation.mutate(
            { ticketId: newTicketId, payload: batchPayload },
            {
              onSuccess: () => resolve(),
              onError: (error: any) => {
                console.error("Error guardando ticket recién creado:", error);
                toast({ title: t("common.error"), description: error?.message || t('tickets.notifications.saveError', 'No se pudieron guardar los cambios del ticket.'), variant: "destructive" });
                resolve();
              },
            }
          );
        });
      }

      // 5. Finalmente, navegar a la ruta del nuevo ticket (ya con datos guardados)
      router.replace(`/facturacion/tickets/editar/${newTicketId}?from=${encodeURIComponent(fromPath || '/facturacion/tickets')}`);
      return; // Terminar aquí para evitar continuar con lógica para tickets existentes
    }

    if (!ticketData) {
      toast({ title: t("common.error"), description: "Datos originales del ticket no disponibles.", variant: "destructive" });
      return;
    }
    if (!id) { 
      toast({ title: t("common.error"), description: "ID del ticket no disponible para guardar.", variant: "destructive" });
      return;
    }

    const payload: BatchUpdateTicketPayload = {}; 
    let hasAnyScalarChanges = false; // Flag para rastrear si hubo cambios escalares

    // --- 1. PROCESAR ACTUALIZACIONES ESCALARES --- (fusionado y limpiado)
    if (formData.personId !== (ticketData.personId || null)) {
      payload.scalarUpdates = { ...(payload.scalarUpdates ?? {}), personId: formData.personId || null };
      hasAnyScalarChanges = true;
    }
    if (formData.sellerId !== (ticketData.sellerUser?.id || null)) {
      payload.scalarUpdates = { ...(payload.scalarUpdates ?? {}), sellerUserId: formData.sellerId || null };
      hasAnyScalarChanges = true;
    }
    if (formData.observations !== (ticketData.notes || '')) {
      payload.scalarUpdates = { ...(payload.scalarUpdates ?? {}), notes: formData.observations || null };
      hasAnyScalarChanges = true;
    }
    if (formData.series !== (ticketData.ticketSeries || '')) { 
      payload.scalarUpdates = { ...(payload.scalarUpdates ?? {}), ticketSeries: formData.series || null };
      hasAnyScalarChanges = true;
    }
    
    const formDiscountType = formData.globalDiscountType || null;
    const formDiscountAmount = formData.globalDiscountAmount !== undefined && formData.globalDiscountAmount !== null ? Number(formData.globalDiscountAmount) : null;
    const formDiscountReason = formData.globalDiscountReason || null;

    if (formDiscountType !== (ticketData.discountType || null) ||
        formDiscountAmount !== (ticketData.discountAmount || null) ||
        formDiscountReason !== (ticketData.discountReason || null)) {
      if ((formDiscountAmount !== null && formDiscountAmount > 0 && formDiscountType === null) || 
          (formDiscountType !== null && (formDiscountAmount === null || formDiscountAmount <= 0) ) ) {
          if (! (formDiscountType === null && (formDiscountAmount === null || formDiscountAmount === 0))) {
              toast({ title: t("common.errors.validation_failed"), description: t("tickets.errors.discountConsistency"), variant: "destructive" });
              return;
          }
      }
      payload.scalarUpdates = { ...(payload.scalarUpdates ?? {}), discountType: formDiscountType, discountAmount: (formDiscountType === null) ? null : formDiscountAmount, discountReason: (formDiscountType === null) ? null : formDiscountReason };
      hasAnyScalarChanges = true;
    }

    if (!hasAnyScalarChanges || !payload.scalarUpdates || Object.keys(payload.scalarUpdates).length === 0) {
        delete payload.scalarUpdates; 
    }

    // --- 2. PROCESAR ÍTEMS --- (fusionado y limpiado)
    const originalApiItems = ticketData.items || [];
    const currentFormItems = formData.items || [];
    const itemsToAddForBackend: Array<
      Omit<TicketItemFormValues, 'id' | 'concept' | 'finalPrice' | 'vatAmount'> & {
        itemType: 'SERVICE' | 'PRODUCT' | 'BONO_DEFINITION' | 'PACKAGE_DEFINITION' | 'CUSTOM';
        tempId?: string;
      }
    > = [];
    const itemsToUpdateForBackend: Array<{ id: string; updates: Partial<Omit<TicketItemFormValues, 'id' | 'itemId' | 'type' | 'concept' | 'finalPrice' | 'vatAmount'>>; }> = [];
    const itemIdsToDeleteFromBackend: string[] = [];

    for (const currentItem of currentFormItems) {
      if (!currentItem.id || currentItem.id.startsWith('local-')) {
        const { id: localId, concept, finalPrice, vatAmount, type, discountNotes, ...itemDataRest } = currentItem;
        if (!type) {
          console.error("[onSubmit BATCH] Ítem nuevo no tiene 'type':", currentItem);
          toast({title: "Error de Datos", description: `Un ítem nuevo (${concept}) no tiene tipo asignado.`, variant: "destructive"});
          continue; 
        }
        itemsToAddForBackend.push({ 
          ...itemDataRest, 
          itemType: type as 'SERVICE' | 'PRODUCT' | 'BONO_DEFINITION' | 'PACKAGE_DEFINITION' | 'CUSTOM',
          discountNotes,
          tempId: localId 
        });
      } else { 
        const originalItem = originalApiItems.find(oi => oi.id === currentItem.id);
        if (originalItem) {
          const updates: Partial<TicketItemFormValues> = {};
          let itemChanged = false;
          // ... (tu lógica detallada de comparación de campos de ítem existente) ...
          if (currentItem.quantity !== originalItem.quantity) { updates.quantity = currentItem.quantity; itemChanged = true; }
          if (currentItem.unitPrice !== originalItem.unitPrice) { updates.unitPrice = currentItem.unitPrice; itemChanged = true; }
          if (currentItem.isPriceOverridden !== (originalItem.isPriceOverridden ?? false)) { updates.isPriceOverridden = currentItem.isPriceOverridden; itemChanged = true;}
          if (currentItem.finalPrice !== (originalItem.finalPrice ?? null) && currentItem.isPriceOverridden) { updates.finalPrice = currentItem.finalPrice; itemChanged = true;}
          if ((currentItem.manualDiscountPercentage ?? null) !== (originalItem.manualDiscountPercentage ?? null)) { updates.manualDiscountPercentage = currentItem.manualDiscountPercentage ?? null; itemChanged = true;}
          if ((currentItem.manualDiscountAmount ?? null) !== (originalItem.manualDiscountAmount ?? null)) { updates.manualDiscountAmount = currentItem.manualDiscountAmount ?? null; itemChanged = true;}
          if ((currentItem.discountNotes || null) !== (originalItem.discountNotes || null)) { updates.discountNotes = currentItem.discountNotes || null; itemChanged = true;}
          if ((currentItem.appliedPromotionId || null) !== (originalItem.appliedPromotionId || null)) { updates.appliedPromotionId = currentItem.appliedPromotionId || null; itemChanged = true;}
          if ((currentItem.promotionDiscountAmount || 0) !== (originalItem.promotionDiscountAmount || 0)) { updates.promotionDiscountAmount = currentItem.promotionDiscountAmount || null; itemChanged = true;}
          // ... (fin de tu lógica detallada de comparación) ...
          if (itemChanged) {
            itemsToUpdateForBackend.push({ id: currentItem.id, updates: updates as any });
          }
        }
      }
    }
    for (const originalItem of originalApiItems) {
      if (!currentFormItems.some(ci => ci.id === originalItem.id)) {
        itemIdsToDeleteFromBackend.push(originalItem.id);
      }
    }

    if (itemsToAddForBackend.length > 0) payload.itemsToAdd = itemsToAddForBackend;
    if (itemsToUpdateForBackend.length > 0) payload.itemsToUpdate = itemsToUpdateForBackend;
    if (itemIdsToDeleteFromBackend.length > 0) payload.itemIdsToDelete = itemIdsToDeleteFromBackend;

    // --- 3. PROCESAR PAGOS Y APLAZADOS ---
    const originalApiPayments = ticketData.payments || []; 
    const currentFormPayments = formData.payments || []; 
    
    const paymentsToAddForBackendApi: Array<{
      amount: number;
      paymentDate?: Date;
      transactionReference?: string | null;
      notes?: string | null;
      paymentMethodDefinitionId: string; 
      tempId?: string;
    }> = [];
    const paymentIdsToDeleteFromBackend: string[] = []; // Renombrado para claridad

    console.log("[onSubmit BATCH] INICIO Procesamiento Pagos. currentFormPayments:", JSON.stringify(currentFormPayments));
    console.log("[onSubmit BATCH] INICIO Procesamiento Pagos. originalApiPayments:", JSON.stringify(originalApiPayments));

    // Identificar pagos nuevos (reales o aplazados)
    for (const formPayment of currentFormPayments) {
      // A new payment is identified by having a tempId and no database id
      if (formPayment.tempId && !formPayment.id) {
        // Es un pago NUEVO (real o aplazado)
        console.log("[onSubmit BATCH] Procesando NUEVO PAGO:", JSON.stringify(formPayment));
        if (!formPayment.paymentMethodDefinitionId) {
          console.error("Error: paymentMethodDefinitionId es indefinido para un nuevo pago:", formPayment);
          toast({ title: t("common.errors.validation_failed"), description: `El pago de ${formPayment.amount} no tiene un método de pago definido.`, variant: "destructive" });
          continue; 
        }
        if (typeof formPayment.amount !== 'number' || formPayment.amount <= 0) {
          console.error("Error: El importe del pago es inválido:", formPayment);
          toast({ title: t("common.errors.validation_failed"), description: `El pago para ${formPayment.paymentMethodName} tiene un importe inválido.`, variant: "destructive" });
          continue;
        }
        paymentsToAddForBackendApi.push({
          amount: Number(formPayment.amount),
          paymentDate: formPayment.paymentDate, 
          transactionReference: formPayment.transactionReference,
          notes: formPayment.notes,
          paymentMethodDefinitionId: formPayment.paymentMethodDefinitionId,
          tempId: formPayment.tempId // Use the tempId from the form payment
        });
      } else {
        // Es un pago existente en BD que sigue presente sin cambios significativos
        console.log("[onSubmit BATCH] PAGO EXISTENTE SIN CAMBIOS:", JSON.stringify(formPayment));
      }
    }

    if (paymentsToAddForBackendApi.length > 0) {
      payload.paymentsToAdd = paymentsToAddForBackendApi;
    }

    // Use paymentIdsToDelete from form state, which is populated by handleRemovePayment
    if (formData.paymentIdsToDelete && formData.paymentIdsToDelete.length > 0) {
      payload.paymentIdsToDelete = [...new Set(formData.paymentIdsToDelete)]; // Ensure uniqueness
    }
    // The old logic for deducing paymentIdsToDeleteFromBackend by comparing arrays is no longer needed
    // as handleRemovePayment now correctly manages this in formData.paymentIdsToDelete.
    // Si finalPaymentIdsToDelete está vacío, no se envía la clave `paymentIdsToDelete` al backend (Zod lo manejará con .optional())

    // --- 4. VERIFICAR CAMBIOS Y ENVIAR --- 
    console.log("[onSubmit BATCH] Payload PRE-VALIDACIÓN CAMBIOS:", JSON.parse(JSON.stringify(payload)));
    const finalHasScalarChanges = !!payload.scalarUpdates && Object.keys(payload.scalarUpdates).length > 0;
    const hasItemChanges = !!(payload.itemsToAdd?.length || payload.itemsToUpdate?.length || payload.itemIdsToDelete?.length);
    // Modificado para también considerar si amountToDefer es explícitamente 0 (lo que es un cambio si antes era >0)
    const hasPaymentRelatedChanges = !!(payload.paymentsToAdd?.length || payload.paymentIdsToDelete?.length);


    if (!finalHasScalarChanges && !hasItemChanges && !hasPaymentRelatedChanges) {
      // toast({ title: t("common.information"), description: t("tickets.notifications.noEffectiveChanges") }); // <<< LÍNEA ELIMINADA
      return;
    }

    console.log("[onSubmit BATCH] Payload final a enviar:", JSON.parse(JSON.stringify(payload)));

    // <<< INICIO LOGS ADICIONALES PARA paymentIdsToDelete >>>
    console.log("[onSubmit BATCH] VALOR DE payload.paymentIdsToDelete ANTES DE MUTATE:", JSON.stringify(payload.paymentIdsToDelete, null, 2));
    console.log("[onSubmit BATCH] TIPO DE payload.paymentIdsToDelete:", typeof payload.paymentIdsToDelete, "Es Array?", Array.isArray(payload.paymentIdsToDelete));
    if (Array.isArray(payload.paymentIdsToDelete)) {
      payload.paymentIdsToDelete.forEach((id, index) => {
        console.log(`[onSubmit BATCH] paymentIdsToDelete[${index}]: '${id}', Tipo: ${typeof id}`);
      });
    }
    // <<< FIN LOGS ADICIONALES >>>

    saveTicketBatchMutation.mutate({ ticketId: id, payload }, {
      // onSuccess is handled by the useSaveTicketBatch hook's default options
      // and augmented by the useEffect for isSavingBeforeClose
      onError: (error) => {
        console.error("Error en mutación Batch onSubmit:", error);
        if (isSavingBeforeClose) {
           setIsSavingBeforeClose(false); // Ensure flag is reset on save error during close flow
        }
      }
    });
  };

  const handleClientSelectedInForm = (client: any | null) => {
    // --- INICIO LOGS DETALLADOS PARA SELECCIÓN DE CLIENTE ---
    console.log("[handleClientSelectedInForm] Callback ejecutado. Cliente recibido:", client ? JSON.parse(JSON.stringify(client)) : null);
    // --- FIN LOGS DETALLADOS ---

    // Obtener el cliente actualmente asignado en el formulario
    const currentClientId = getValues('personId');
    const selectedClientId = client?.id ?? null;

    // Si no hay cambio real, no marcar el formulario como dirty ni actualizar valores
    if (currentClientId === selectedClientId) {
      console.log('[handleClientSelectedInForm] Selección de cliente idéntica a la actual. No se modifican valores.');
      return;
    }

    // Determinar si se debe marcar como dirty (solo si hay cambio)
    const shouldMarkDirty = true; // Siempre hay cambio si llegamos aquí

    if (client) {
      console.log(`[handleClientSelectedInForm] Estableciendo personId a: ${client.id}, clientName a: ${client.firstName} ${client.lastName}`);
      // Actualizar tanto personId (nuevo modelo)
      setValue('personId', client.id, { shouldValidate: true, shouldDirty: shouldMarkDirty });
      setValue('clientName', `${client.firstName} ${client.lastName}${client.companyName ? ` (${client.companyName})` : ''}`.trim(), { shouldDirty: shouldMarkDirty });
      setValue('clientDetails', client, { shouldDirty: shouldMarkDirty });
      clearErrors('personId');
    } else {
      console.warn("[handleClientSelectedInForm] Limpiando campos de cliente porque el cliente recibido es null.");
      setValue('personId', undefined, { shouldValidate: true, shouldDirty: shouldMarkDirty });
      setValue('clientName', undefined, { shouldDirty: shouldMarkDirty });
      setValue('clientDetails', undefined, { shouldDirty: shouldMarkDirty });
    }
  };

  const handleServiceReceiverSelect = (client: PersonForSelector | null) => {
    setServiceReceiverClient(client);
    if (client) {
      setValue('personId', client.id, { shouldDirty: true });
    } else {
      setValue('personId', null, { shouldDirty: true });
    }
  };

  const handleOpenAddItemModal = () => setIsAddItemModalOpen(true);
  const handleCloseAddItemModal = () => setIsAddItemModalOpen(false);
  
  const handleAddItem = (itemDataFromModal: TicketItemFormValues) => {
    const currentTicketId = ticketData?.id;
    if (!currentTicketId && !id) {
      // Para un ticket completamente nuevo, aún no hay ID de ticket, está bien.
    }

    if (!itemDataFromModal.itemId || !itemDataFromModal.type) {
        toast({ title: t("common.errors.validation_failed"), description: "Falta información del ítem (ID o tipo) desde el modal.", variant: "destructive" });
        return;
    }

    const newItemId = itemDataFromModal.id || `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newItem: TicketItemFormValues = {
      ...itemDataFromModal,
      id: newItemId, 
    };
    
    console.log("[handleAddItem] Nuevo ítem para añadir localmente:", newItem);
    const currentItems = getValues('items');
    if (!currentItems) {
      setValue('items', [newItem], { shouldDirty: true, shouldValidate: true });
    } else {
      setValue('items', [...currentItems, newItem], { shouldDirty: true, shouldValidate: true });
    }
    
    toast({
      title: t('tickets.notifications.itemAddedToDraftTitle', "Ítem añadido al borrador"),
      description: t('tickets.notifications.itemAddedToDraftDesc', { concept: newItem.concept || 'Concepto' }),
      variant: "default",
      duration: 3000,
    });
    
    setIsAddItemModalOpen(false);
  };

  const handleRemoveItem = (index: number) => {
    const currentItems = watch('items') || [];
    const updatedItems = currentItems.filter((_, i) => i !== index);
    setValue('items', updatedItems, { shouldDirty: true });
    toast({
      description: "Elemento eliminado del ticket.",
      variant: "default",
    });
  };

  const handleQuantityChange = (index: number, newQuantityInput: string | number) => {
    const newQuantity = Number(newQuantityInput);
    if (isNaN(newQuantity)) return;

    const currentItems = getValues('items') || [];
    if (index < 0 || index >= currentItems.length) return;

    if (newQuantity <= 0) {
      const itemToRemove = currentItems[index];
      console.log("[handleQuantityChange] Cantidad <= 0, eliminando ítem localmente:", itemToRemove);
      const updatedItems = currentItems.filter((_, i) => i !== index);
      setValue('items', updatedItems, { shouldDirty: true, shouldValidate: true });
      toast({ description: t('tickets.notifications.itemRemovedDueToZeroQuantity', "Ítem eliminado por cantidad cero."), variant: "default" });
    } else {
      let itemToUpdate = { ...currentItems[index] };
      itemToUpdate.quantity = newQuantity;
      itemToUpdate = recalculateItemTotals(itemToUpdate);
      
      currentItems[index] = itemToUpdate;
      setValue('items', [...currentItems], { shouldDirty: true, shouldValidate: true }); 
      // Disparar validación para el ítem específico puede ser útil para mostrar errores de campo si los hay
      // trigger(`items.${index}`);
    }
  };

  const handleOpenDiscountModal = (index: number) => {
    // --- INICIO LOG ANTES DE ABRIR MODAL ---
    console.log("[handleOpenDiscountModal] Valores del formulario ANTES de abrir modal descuento:", JSON.stringify(getValues(), null, 2));
    // --- FIN LOG ---
    const itemParaModal = getValues(`items.${index}`);
    console.log("[handleOpenDiscountModal] Current item data para modal:", JSON.stringify(itemParaModal, null, 2));
    setEditingItemIndex(index);
    setIsApplyDiscountModalOpen(true);
  };

  const handleCloseDiscountModal = () => {
    setIsApplyDiscountModalOpen(false);
    setEditingItemIndex(null);
  };

  const handleApplyDiscount = (
    itemIndex: number, 
    updates: Partial<Pick<TicketItemFormValues, 'manualDiscountPercentage' | 'manualDiscountAmount' | 'promotionDiscountAmount' | 'appliedPromotionId' | 'discountNotes' | 'isPriceOverridden' | 'finalPrice' | 'vatRateId' | 'vatRate'>>
  ) => {
    if (itemIndex !== null && itemIndex >= 0) {
      const currentItems = getValues('items');
      if (!currentItems || itemIndex >= currentItems.length) { return; }
      let itemToUpdate = { ...currentItems[itemIndex] };
      let changed = false;

      console.log("[handleApplyDiscount] itemToUpdate INICIAL:", JSON.parse(JSON.stringify(itemToUpdate)));
      console.log("[handleApplyDiscount] updates RECIBIDAS del modal:", JSON.parse(JSON.stringify(updates)));

      // Aplicar VAT si viene del modal (especialmente para modo precio final con IVA)
      if (updates.vatRateId !== undefined) itemToUpdate.vatRateId = updates.vatRateId;
      if (updates.vatRate !== undefined) itemToUpdate.vatRate = updates.vatRate;

      if (updates.isPriceOverridden === true && updates.finalPrice !== undefined) {
        console.log("[handleApplyDiscount] Aplicando Precio Final Directo (neto del modal):", updates.finalPrice);
        itemToUpdate.isPriceOverridden = true;
        itemToUpdate.finalPrice = updates.finalPrice; // Este es el precio de línea neto ANTES de IVA
        
        // Conservar el manualDiscountPercentage calculado y enviado por el modal
        itemToUpdate.manualDiscountPercentage = updates.manualDiscountPercentage !== undefined ? updates.manualDiscountPercentage : null;
        
        itemToUpdate.manualDiscountAmount = updates.manualDiscountAmount ?? 0;
        // Anular promoción si se fija precio final
        itemToUpdate.appliedPromotionId = null;
        itemToUpdate.promotionDiscountAmount = 0;
        changed = true;
      } else {
        // Si no se fija precio, asegurar que isPriceOverridden sea false
        if (itemToUpdate.isPriceOverridden === true) changed = true;
        itemToUpdate.isPriceOverridden = false; 

        let percentageHasBeenExplicitlySet = false;
        if (updates.manualDiscountPercentage !== undefined) {
            const newPerc = updates.manualDiscountPercentage ?? null;
            if (newPerc !== itemToUpdate.manualDiscountPercentage) {
                itemToUpdate.manualDiscountPercentage = newPerc;
                changed = true;
            }
            if (newPerc !== null) { 
                percentageHasBeenExplicitlySet = true;
                const baseLinePriceForDiscount = (itemToUpdate.unitPrice || 0) * (itemToUpdate.quantity || 0);
                const calculatedAmount = parseFloat(((newPerc / 100) * baseLinePriceForDiscount).toFixed(2));
                if (calculatedAmount !== (itemToUpdate.manualDiscountAmount ?? null)) {
                    itemToUpdate.manualDiscountAmount = calculatedAmount;
                    changed = true;
                }
            } else { // Porcentaje se pone a null
                if (updates.manualDiscountAmount === undefined && (itemToUpdate.manualDiscountAmount !== null && itemToUpdate.manualDiscountAmount !== 0)) {
                    itemToUpdate.manualDiscountAmount = 0; 
                    changed = true;
                }
            }
        } 
        
        if (!percentageHasBeenExplicitlySet && updates.manualDiscountAmount !== undefined) { 
            const newAmount = updates.manualDiscountAmount ?? null;
            if (newAmount !== itemToUpdate.manualDiscountAmount) {
                itemToUpdate.manualDiscountAmount = newAmount;
                if (itemToUpdate.manualDiscountPercentage !== null && newAmount !== null) changed = true; 
                else if (newAmount !== null) changed = true;
                
                if (itemToUpdate.manualDiscountPercentage !== null) {
                    itemToUpdate.manualDiscountPercentage = null;
                    changed = true; 
                }
            }
        }
      }

      if (updates.appliedPromotionId !== undefined && updates.appliedPromotionId !== itemToUpdate.appliedPromotionId) {
        itemToUpdate.appliedPromotionId = updates.appliedPromotionId;
        // Aquí se debería recalcular promotionDiscountAmount si se aplica una nueva promo
        // y anular descuentos manuales si la promo no es acumulable
        changed = true;
      }
      if (updates.promotionDiscountAmount !== undefined && updates.promotionDiscountAmount !== itemToUpdate.promotionDiscountAmount) { 
        itemToUpdate.promotionDiscountAmount = updates.promotionDiscountAmount;
        changed = true;
      }
      if (updates.discountNotes !== undefined && updates.discountNotes !== itemToUpdate.discountNotes) { 
        itemToUpdate.discountNotes = updates.discountNotes;
        if (!changed) changed = true; // Marcar como cambiado si solo cambian las notas
      }

      console.log("[handleApplyDiscount] itemToUpdate ANTES de recalculateItemTotals:", JSON.stringify(itemToUpdate, null, 2));
      itemToUpdate = recalculateItemTotals(itemToUpdate); // Siempre recalcular si hubo updates
      
      currentItems[itemIndex] = itemToUpdate;
      setValue('items', [...currentItems], { shouldDirty: true, shouldValidate: true });
      console.log("[handleApplyDiscount] Ítem actualizado en formState:", JSON.stringify(getValues(`items.${itemIndex}`), null, 2));
    }
    handleCloseDiscountModal(); 
  };

  const handleOpenBonosModal = (itemIndex: number) => alert(`Abrir modal de Bonos para item ${itemIndex}`);
  const handleOpenPromosModal = (itemIndex: number) => alert(`Abrir modal de Promociones para item ${itemIndex}`);
  const handleOpenAddPaymentModal = () => {
    if (watch('items')?.length === 0) {
      toast({
        title: t("common.error"),
        description: t("tickets.notifications.addItemsBeforePayment"),
        variant: "destructive",
      });
      return;
    }
    
    const pendingAmountValue = calculatePendingAmount();
    if (pendingAmountValue <= 0) {
      toast({
        title: t('common.information'),
        description: t('tickets.notifications.ticketAlreadyPaid'),
      });
      return;
    }
    setDefaultPaymentAmount(pendingAmountValue);
    setIsAddPaymentModalOpen(true);
  };

  const calculatePendingAmount = () => {
    const totalWithTax = watch('totalAmount') || 0;
    
    const paymentsTotal = watch('payments')?.reduce((total, payment) => 
      total + (payment.amount || 0), 0) || 0;
    
    return Math.max(0, totalWithTax - paymentsTotal);
  };

  const handleAddPayment = (paymentDataFromModal: TicketPaymentFormValues) => {
    const currentTicketId = ticketData?.id;
    const currentClinicId = activeClinic?.id;

    if (!currentTicketId && !id) { // Para un ticket nuevo aún no hay ID de BD
      // No hacer nada especial, el ID se asociará al guardar todo el ticket
    }
     if (!currentClinicId && !id) { // Asumo que clinicId también es necesario para un pago, incluso en borrador
        toast({ title: "Error", description: "No se puede añadir pago, falta ID de clínica.", variant: "destructive" });
        return;
    }

    // Generate a temporary ID for new payments
    const tempId = `temp-payment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newPayment: TicketPaymentFormValues = {
      ...paymentDataFromModal,
      id: undefined, // Database ID is undefined for new payments
      tempId: tempId, // Store the temporary ID
      // paymentDate is taken from the modal
    };

    console.log("[handleAddPayment] Nuevo pago para añadir localmente:", newPayment);
    const currentPayments = getValues('payments') || [];
    setValue('payments', [...currentPayments, newPayment], { shouldDirty: true, shouldValidate: true });

    setIsAddPaymentModalOpen(false);
  };

  const handleRemovePayment = (paymentIdentifier: string) => { // Renamed param for clarity
    const currentTicketPayments = getValues('payments') || [];
    // Find by either database id or tempId
    const paymentToRemove = currentTicketPayments.find(p => p.id === paymentIdentifier || p.tempId === paymentIdentifier);

    if (!paymentToRemove) {
      console.warn("[handleRemovePayment] Payment with identifier", paymentIdentifier, "not found in form values.");
      return;
    }

    const paymentMethodDisplayName = paymentToRemove.paymentMethodName || t('common.unknown'); // paymentMethodName should be populated when the payment is added/loaded
    const formattedAmount = formatCurrency(paymentToRemove.amount, activeClinic?.currency || 'EUR');

    const confirmationMessage = t('tickets.confirmations.removePayment.message', {
      paymentMethod: paymentMethodDisplayName,
      amount: formattedAmount
    });

    if (!window.confirm(confirmationMessage)) {
      return; // User cancelled
    }

    const updatedPayments = currentTicketPayments.filter(p => (p.id || p.tempId) !== paymentIdentifier);
    setValue('payments', updatedPayments, { shouldValidate: true, shouldDirty: true });
    trigger('payments'); // Trigger validation for the payments array

    // If the payment being removed has a database ID (i.e., it's not a new one identified by tempId),
    // add its ID to the paymentIdsToDelete array.
    if (paymentToRemove.id && !paymentToRemove.tempId) { // Check it's an existing DB payment
      const currentPaymentIdsToDelete = getValues('paymentIdsToDelete') || [];
      if (!currentPaymentIdsToDelete.includes(paymentToRemove.id)) {
        setValue('paymentIdsToDelete', [...currentPaymentIdsToDelete, paymentToRemove.id], { shouldDirty: true });
      }
      console.log("[handleRemovePayment] Payment marked for DB deletion:", paymentToRemove.id);
    } else {
      console.log("[handleRemovePayment] New (unsaved) payment removed from form:", paymentIdentifier);
    }

  };

  const onSubmitForm = handleSubmit(
    onSubmit,
    (errors) => {
      console.warn("[handleSubmit] Validación fallida:", errors);
      // Loguear los valores completos del formulario en el momento del error
      console.log("Valores del formulario en el momento del error de validación:", JSON.stringify(getValues(), null, 2));
      
      let errorMessages = t("common.errors.formProcessingDesc", "Por favor, revisa los campos del formulario:") + '\n';
      for (const fieldName in errors) {
        if (errors[fieldName as keyof TicketFormValues]) {
          errorMessages += `- ${fieldName}: ${errors[fieldName as keyof TicketFormValues]?.message}\n`;
        }
      }
      // Si errors está vacío pero la validación falló, es un error de .refine() o un NaN no capturado
      if (Object.keys(errors).length === 0) {
        errorMessages = t("common.errors.validation_failed", "Error de validación general. Verifica los cálculos de precios e IVA.");
      }
      toast({
        title: t("common.errors.validation_failed", "Error de Validación"),
        description: errorMessages,
        variant: "destructive",
        duration: 7000,
      });
    }
  );

  const onFormSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    onSubmitForm();
  };

  console.log('Active Clinic Currency:', activeClinic?.currency);
  const currencyCode = activeClinic?.currency || 'EUR';
  const currencySymbol = currencyCode;

  // Base imponible del ticket (suma de los precios finales NETOS de cada línea)
  const subtotalNetoDeLineas = watchedItems.reduce((sum, item) => sum + (item.finalPrice || 0), 0);

  // Total de descuentos aplicados en todas las líneas (solo descuentos de ítem, el global se aplica después)
  const totalDescuentosDeLineas = watchedItems.reduce((sum, item) => {
    const itemManualDiscount = item.manualDiscountAmount || 0;
    const itemPromoDiscount = item.promotionDiscountAmount || 0; 
    return sum + itemManualDiscount + itemPromoDiscount;
  }, 0);
  
  // Total de IVA de todas las líneas
  const totalIVADeLineas = watchedItems.reduce((sum, item) => sum + (item.vatAmount || 0), 0);

  // Calcular el descuento global efectivo
  const globalDiscountType = watch('globalDiscountType');
  const globalDiscountValue = watch('globalDiscountAmount') || 0;
  let effectiveGlobalDiscount = 0;
  if (globalDiscountType === 'PERCENTAGE') {
    effectiveGlobalDiscount = subtotalNetoDeLineas * ((globalDiscountValue / 100) || 0);
  } else if (globalDiscountType === 'FIXED_AMOUNT') {
    effectiveGlobalDiscount = globalDiscountValue || 0;
  }
  effectiveGlobalDiscount = Math.max(0, Math.min(effectiveGlobalDiscount, subtotalNetoDeLineas));

  // Base Imponible final del Ticket (después de descuento global)
  const taxableBaseFinalTicket = subtotalNetoDeLineas - effectiveGlobalDiscount;

  // Total general del ticket
  const totalGeneralTicket = taxableBaseFinalTicket + totalIVADeLineas;
  
  // Calcular pagos aplazados
  const deferredPayments = watchedPayments.filter((p: any) => 
    p.paymentMethodCode === 'SYS_DEFERRED_PAYMENT' || 
    p.paymentMethodType === 'DEFERRED_PAYMENT'
  );
  const deferredAmount = deferredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const nonDeferredAmount = watchedPayments.reduce((sum, p) => sum + (p.amount || 0), 0) - deferredAmount;
  
  // Calcular el porcentaje pagado (sin incluir aplazados) para ajustar el IVA
  const paidPercentage = totalGeneralTicket > 0 ? nonDeferredAmount / totalGeneralTicket : 0;
  const adjustedBase = taxableBaseFinalTicket * paidPercentage; // Base ajustada
  const adjustedIVA = totalIVADeLineas * paidPercentage; // IVA ajustado
  const adjustedTotal = adjustedBase + adjustedIVA; // Total ajustado
  
  const amountPaid = adjustedBase; // "Pagado" es la base imponible sin IVA
  const currentPending = Math.max(0, totalGeneralTicket - (nonDeferredAmount + deferredAmount));

  useEffect(() => {
    form.setValue('subtotalAmount', parseFloat(subtotalNetoDeLineas.toFixed(2)), { shouldDirty: false }); 
    form.setValue('taxableBaseAmount', parseFloat(taxableBaseFinalTicket.toFixed(2)), { shouldDirty: false }); 
    form.setValue('taxAmount', parseFloat(adjustedIVA.toFixed(2)), { shouldDirty: false });
    form.setValue('totalAmount', parseFloat(adjustedTotal.toFixed(2)), { shouldDirty: false }); 
    form.setValue('amountPaid', parseFloat(amountPaid.toFixed(2)), { shouldDirty: false });
    // El campo 'amountDeferred' se actualiza con ticketData.dueAmount en el useEffect de inicialización
    // y el resumen de "Aplazado" lo calcula dinámicamente de watchedPayments.
    setTotalsReady(true);
    console.log('[EditarTicketPage] Totals calculated. isDirty:', form.formState.isDirty, 'dirtyFields:', form.formState.dirtyFields); // LOG AÑADIDO
  }, [subtotalNetoDeLineas, taxableBaseFinalTicket, totalIVADeLineas, totalGeneralTicket, amountPaid, form, watchedItems, watchedPayments]); // <<< AÑADIR watchedItems y watchedPayments

  // En el JSX del resumen, asegurar que:
  // "Base Imponible": muestra subtotalNetoDeLineas (si quieres mostrar el subtotal antes de desc. global)
  //                 o taxableBaseFinalTicket (si quieres mostrar la base imponible final para IVA).
  // "Dto.": muestra totalDescuentosDeLineas + effectiveGlobalDiscount
  // "IVA": muestra totalIVADeLineas
  // "Total": muestra totalGeneralTicket

  const handleCompleteAndCloseTicket = async () => {
    console.log("[handleCompleteAndCloseTicket] Iniciando cierre de ticket...");
    const isValid = await trigger(); 
    if (!isValid) {
      return;
    }

    const closeTicket = () => {
      if (!id) {
        return;
      }
      
      // Mostrar estado de carga inmediatamente
      setRedirectingAfterClose(true);
      
      // Pequeño retraso para asegurar que la UI se actualice
      setTimeout(() => {
        completeAndCloseMutation.mutate(
          { 
            ticketId: id,
            clinicId: activeClinic?.id 
          },
          {
            onSuccess: (data) => {
              // Actualizar la caché con los datos del servidor
              if (data) {
                queryClient.setQueryData(ticketKeys.detail(id), data);
                queryClient.setQueryData(['ticket', id], data);
                
                // Invalidar consultas en segundo plano sin esperar
                const invalidationPromises = [
                  queryClient.invalidateQueries({ queryKey: ticketKeys.all, exact: false })
                ];
                
                if (activeClinic?.id) {
                  invalidationPromises.push(
                    queryClient.invalidateQueries({ queryKey: ['openTicketsCount', activeClinic.id, 'OPEN'] })
                  );
                }
                
                // No esperar a que se completen las invalidaciones
                Promise.allSettled(invalidationPromises).catch(console.error);
              }
              
              // Redirigir inmediatamente para mejor experiencia de usuario
              router.push('/facturacion/tickets');
            },
            onError: (error) => {
              console.error("Error al cerrar el ticket:", error);
              setRedirectingAfterClose(false);
            }
          }
        );
      }, 50); // Pequeño retraso para asegurar que la UI se actualice
    };

    if (formState.isDirty) {
      console.log("[handleCompleteAndCloseTicket] Hay cambios pendientes. Guardando primero...");
      setIsSavingBeforeClose(true);
      
      // Guardar primero y luego cerrar
      try {
        await form.handleSubmit(onSubmit)();
        // Si el guardado es exitoso, proceder con el cierre
        closeTicket();
      } catch (error) {
        console.error("Error al guardar antes de cerrar:", error);
        setIsSavingBeforeClose(false);
      }
    } else {
      console.log("[handleCompleteAndCloseTicket] No hay cambios pendientes. Cerrando directamente...");
      closeTicket();
    }
  };

  const handleConfirmDelayedPaymentAndClose = () => {
    setShowConfirmDelayedPaymentModal(false);
    const currentTicketId = ticketData?.id;
    if (currentTicketId) {
      setRedirectingAfterClose(true);
      
      completeAndCloseMutation.mutate(
        { 
          ticketId: currentTicketId, 
          clinicId: activeClinic?.id 
        },
        {
          onSuccess: (data) => {
            // Actualizar la caché con los datos del servidor
            if (data) {
              queryClient.setQueryData(ticketKeys.detail(currentTicketId), data);
              queryClient.setQueryData(['ticket', currentTicketId], data);
              
              // Invalidar las consultas relacionadas para forzar una actualización
              queryClient.invalidateQueries({ queryKey: ticketKeys.all, exact: false });
              
              if (activeClinic?.id) {
                queryClient.invalidateQueries({ queryKey: ['openTicketsCount', activeClinic.id, 'OPEN'] });
              }
            }
            
            // Redirigir después de actualizar la caché
            router.push('/facturacion/tickets');
          },
          onError: (error) => {
            console.error("Error al cerrar el ticket con pago aplazado:", error);
            setRedirectingAfterClose(false);
            toast({
              title: t("common.error"),
              description: t("tickets.notifications.closeError"),
              variant: "destructive",
            });
          }
        }
      );
    }
  };

  let cashierInfoText = t('tickets.cashierInfoNotAvailable', 'Información del cajero no disponible');
  if (ticketData?.cashierUser) {
    const cashierName = `${ticketData.cashierUser.firstName || ''} ${ticketData.cashierUser.lastName || ''}`.trim() || ticketData.cashierUser.email;
    cashierInfoText = cashierName;
    if (!ticketData.cashierUser.isActive) {
      cashierInfoText += ` (${t('tickets.sellerStatus.inactiveSystem', '(Usuario inactivo)')})`;
    }
  }

  // NUEVA VERIFICACIÓN DE CARGA INICIAL
  const isPageLoading = isLoadingTicket || !activeClinic || (!isNewTicket && !ticketData);

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
        <span className="ml-2">{t('common.loadingData', { entity: t('tickets.entityName') })}</span>
      </div>
    );
  }

  if (isErrorTicket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <h2 className="mb-2 text-xl font-semibold">{t('common.errorLoadingData')}</h2>
        <p className="text-center">{errorTicket?.message || t('common.errorLoadingDataGeneric')}</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back')}
        </Button>
      </div>
    );
  }

  const handleReopenTicket = async () => {
    if (!ticketData?.id || !activeClinic?.id) { 
      return;
    }
    // Esta es la llamada correcta a la mutación que se hace desde el modal
    reopenTicketMutation.mutate(
      { ticketId: ticketData.id, clinicId: activeClinic.id },
      {
        onSuccess: () => {
          setIsReopenConfirmModalOpen(false); // Cerrar modal en éxito
          // El resto de la lógica de UI (toasts, etc.) se maneja en onSettled del hook.
        },
        onError: (error: any) => {
          setIsReopenConfirmModalOpen(false); // Cerrar modal en error también
          // El toast de error ya se maneja en el hook.
          console.error("Error al intentar reabrir ticket desde página de edición:", error);
        },
      }
    );
  };

  console.log('Estado de isReadOnly en render:', isReadOnly); // <<< CONSOLE LOG AÑADIDO
  console.log('Estado de ticketData.status en render:', ticketData?.status);

  // Eliminado overlay global; el spinner del botón indica el progreso

  return (
    <FormProvider {...form}>
      <div className="relative flex-1 overflow-auto" style={{ "--sidebar-width": "var(--sidebar-width, 16rem)" } as React.CSSProperties}>
        <div className="container relative pb-24 mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Editar Ticket {watch("ticketNumber")}</h1>
          </div>

          <div className="relative overflow-hidden rounded-xl">
            <BorderBeam 
              colorFrom="#8b5cf6"
              colorTo="#ec4899"
              duration={8}
              size={100}
            />
            <Form {...form}>
              <form 
                id="editar-ticket-form" 
                onSubmit={onFormSubmit}
                className="relative p-5 space-y-6 bg-background rounded-xl"
              >
                {/* Envolver el contenido principal del formulario con una key basada en isReadOnly */}
                <div key={isReadOnly.toString()}>
                  <div className="grid gap-6 md:grid-cols-12">
                    <div className="space-y-6 md:col-span-4">
                      <div className="relative overflow-hidden rounded-lg">
                        <MagicCard 
                          gradientFrom="#8b5cf6" 
                          gradientTo="#ec4899" 
                          gradientSize={180}
                          gradientOpacity={0.05}
                          className="rounded-lg"
                        >
                          <div className="p-4 rounded-lg">
                            <ClientSelectorSearch 
                              selectedPersonId={watch("personId")}
                              onClientSelect={handleClientSelectedInForm}
                              setFormValue={(field, value, options) => {
                                if (field === "personId" || field === "clientName" || field === "clientDetails") {
                                  setValue(field as any, value, options);
                                }
                              }}
                              disabled={isReadOnly}
                            />
                          </div>
                        </MagicCard>
                      </div>

                      {/* Checkbox y selector de cliente receptor diferente */}
                      <div className="relative">
                        <MagicCard 
                          gradientFrom="#8b5cf6" 
                          gradientTo="#ec4899" 
                          gradientSize={180}
                          gradientOpacity={0.05}
                          className="rounded-lg"
                        >
                          <div className="p-4 space-y-4 rounded-lg">
                            {/* Checkbox para activar cliente receptor diferente */}
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="hasServiceReceiver"
                                checked={hasServiceReceiver}
                                onCheckedChange={(checked) => {
                                  setHasServiceReceiver(checked as boolean);
                                  if (!checked) {
                                    handleServiceReceiverSelect(null);
                                  }
                                }}
                                disabled={isReadOnly}
                              />
                              <Label
                                htmlFor="hasServiceReceiver"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                El receptor del servicio es diferente al pagador
                              </Label>
                            </div>

                            {/* Selector de cliente receptor */}
                            {hasServiceReceiver && (
                              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div>
                                  <Label className="text-sm font-medium mb-2 block">
                                    Persona receptora del servicio
                                  </Label>
                                  <ClientSelectorSearch 
                                    selectedPersonId={serviceReceiverClient?.id || null}
                                    onClientSelect={(client) => handleServiceReceiverSelect(client)}
                                    setFormValue={(field, value, options) => {
                                      // No necesario aquí
                                    }}
                                    disabled={isReadOnly}
                                    isServiceReceiver
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </MagicCard>
                      </div>

                      {/* Historial de cambios */}
                      {id && (
                        <ChangeLogsAccordion entityId={id} />
                      )}

                      {/* Detalles del ticket en acordeón */}
                      <Accordion type="single" collapsible defaultValue="details" className="relative overflow-hidden rounded-lg">
                        <AccordionItem value="details">
                          <AccordionTrigger className="p-4 text-sm font-medium bg-card border rounded-t-lg">
                            Detalles del ticket
                          </AccordionTrigger>
                          <AccordionContent className="p-4 border rounded-b-lg bg-card">
                            {/* contenido original */}
                        <BorderBeam 
                          colorFrom="#8b5cf6"
                          colorTo="#ec4899"
                          duration={6}
                          size={60}
                          reverse={true}
                        />
                        <div>
                         <h2 className="mb-3 text-sm font-medium text-gray-700">{t('tickets.ticketDetails', 'Datos del Ticket')}</h2>
                          
                          <div className="mb-3">
                            <FormLabel className="text-xs text-gray-600">{t('tickets.cashier', 'Cajero')}</FormLabel>
                            <p className="mt-1 text-sm text-gray-800">{cashierInfoText}</p>
                          </div>

                          {ticketData?.issueDate && (
                            <div className="mb-3">
                              <FormLabel className="text-xs text-gray-600">
                                {t('tickets.creationDate', 'Fecha Creación')}
                              </FormLabel>
                              <p className="mt-1 text-sm text-gray-800">
                                {ticketData.clinic?.name && (
                                  <span className="inline-block max-w-[150px] truncate font-medium align-bottom" title={ticketData.clinic.name}>
                                    {ticketData.clinic.name}
                                  </span>
                                )}
                                {ticketData.clinic?.name ? ' - ' : ''}
                                {new Date(ticketData.issueDate).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          )}
                          
                          <div className="grid gap-4">
                            <FormField
                              control={control}
                              name="sellerId"
                              render={({ field }) => {
                                const originalTicketSeller = ticketData?.sellerUser;
                                const selectedSellerIdInForm = field.value;

                                if (ticketData) {
                                  // [Seller FF DEBUG] Logs removed
                                }

                                let informativeText = null;
                                if (originalTicketSeller) {
                                  const isOriginalSellerInCurrentClinicListAndActive = sellers.some(s => s.id === originalTicketSeller.id && s.isActive === true);
                                  const originalSellerName = `${originalTicketSeller.firstName || ''} ${originalTicketSeller.lastName || ''}`.trim() || originalTicketSeller.email || 'Vendedor Desconocido';
                                  
                                  let statusKey = '';
                                  if (typeof originalTicketSeller.isActive === 'boolean') {
                                    if (originalTicketSeller.isActive === false) {
                                      statusKey = 'tickets.sellerStatus.inactiveSystem';
                                    } else {
                                      if (!isOriginalSellerInCurrentClinicListAndActive) {
                                        // [Seller FF DEBUG] Log removed
                                      }
                                    }
                                  } else {
                                    console.log("[Seller FF DEBUG] originalTicketSeller.isActive no es booleano.");
                                  }

                                  if (statusKey) {
                                    if (selectedSellerIdInForm === originalTicketSeller.id || selectedSellerIdInForm === null) {
                                        informativeText = t('tickets.sellerInfoOriginal', { 
                                          name: originalSellerName,
                                          status: t(statusKey)
                                        });
                                    }
                                  } else if (originalTicketSeller.isActive === true && !isOriginalSellerInCurrentClinicListAndActive) {
                                    if (selectedSellerIdInForm === originalTicketSeller.id || selectedSellerIdInForm === null) {
                                        informativeText = t('tickets.sellerInfoOriginal', { 
                                          name: originalSellerName,
                                          status: ''
                                        });
                                    }
                                  }
                                }

                                let currentSelectionName = t('tickets.selectSellerPlaceholder');
                                if (selectedSellerIdInForm) {
                                  const foundSellerInList = sellers.find(s => s.id === selectedSellerIdInForm);
                                  if (foundSellerInList) {
                                    currentSelectionName = `${foundSellerInList.firstName || ''} ${foundSellerInList.lastName || ''}`.trim() || foundSellerInList.email;
                                  }
                                } else {
                                  currentSelectionName = t('common.none');
                                }

                                return (
                                <FormItem>
                                  <FormLabel className="text-xs">{t('tickets.seller')}</FormLabel>
                                    {informativeText && (
                                      <FormDescription className="mb-1 text-xs italic text-gray-500">
                                        {informativeText}
                                      </FormDescription>
                                    )}
                                  <Select 
                                      value={selectedSellerIdInForm || "__null__"} 
                                      onValueChange={(value) => {
                                        field.onChange(value === '__null__' ? null : value); 
                                      }} 
                                      disabled={isLoadingSellers || isReadOnly}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder={currentSelectionName} /> 
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="__null__" className="text-xs italic">{t('common.none')}</SelectItem>
                                        {sellers.length === 0 && !isLoadingSellers && (
                                          <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('tickets.noSellersAvailable')}</p>
                                        )}
                                        {sellers.map((seller: UserForSelector) => (
                                          <SelectItem key={seller.id} value={seller.id} className="text-xs" disabled={!seller.isActive}>
                                            {`${seller.firstName || ''} ${seller.lastName || ''}`.trim() || seller.email}
                                            {!seller.isActive ? ` (${t('tickets.sellerStatus.inactiveSystem')})` : ''}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                                );
                              }}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={control}
                                name="series"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Nº Serie</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                                      <FormControl>
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="Serie" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={control}
                                name="printSize"
                                render={({ field }) => { 
                                  console.log("[DEBUG page.tsx PrintSize Field RENDER] field.value:", field.value);
                                  return (
                                  <FormItem>
                                    <FormLabel className="text-xs">Tamaño impresión</FormLabel>
                                      <Select 
                                        value={field.value || undefined}
                                        onValueChange={(value) => {
                                          if (['80mm', '58mm', 'A4'].includes(value)) {
                                            field.onChange(value);
                                          } else {
                                            field.onChange(undefined); 
                                          }
                                        }} 
                                        disabled={isReadOnly}
                                      >
                                      <FormControl>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Seleccionar tamaño..." />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          <SelectItem value="80mm" className="text-xs">80mm</SelectItem>
                                          <SelectItem value="58mm" className="text-xs">58mm</SelectItem>
                                          <SelectItem value="A4" className="text-xs">A4</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                  );
                                }}
                              />
                            </div>
                            
                            <FormField
                              control={control}
                              name="globalDiscountType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Tipo Descuento Global</FormLabel>
                                  <Select 
                                    value={field.value ?? undefined}
                                    onValueChange={(value) => {
                                      const newType = value === '__null__' ? null : value as DiscountType | null;
                                      field.onChange(newType);
                                      if (newType === null) {
                                        setValue('globalDiscountAmount', null, { shouldDirty: true });
                                        setValue('globalDiscountReason', null, { shouldDirty: true });
                                      }
                                    }}
                                    disabled={isReadOnly}
                                  >
                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin descuento global..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="__null__" className="text-xs italic">{t('common.none', 'Ninguno/a')}</SelectItem>
                                      <SelectItem value="FIXED_AMOUNT" className="text-xs">Importe Fijo</SelectItem>
                                      <SelectItem value="PERCENTAGE" className="text-xs">Porcentaje</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={control}
                              name="globalDiscountAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Monto Dto. Global (€ o %)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number"
                                      {...field}
                                      value={field.value === null || field.value === undefined ? '' : field.value}
                                      onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                                      className="h-8 text-xs"
                                      disabled={isReadOnly || !watch('globalDiscountType')}
                                      placeholder={watch('globalDiscountType') === 'PERCENTAGE' ? '% (ej: 10)' : '€ (ej: 5.50)'}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={control}
                              name="globalDiscountReason"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Razón Dto. Global</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      value={field.value || ''} 
                                      className="h-8 text-xs"
                                      disabled={isReadOnly || !watch('globalDiscountType')}
                                      placeholder="Razón del descuento..."
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={control}
                              name="observations"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Observaciones</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Observaciones del ticket" 
                                      className="h-20 text-xs resize-none"
                                      disabled={isReadOnly}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                    
                    <div className="space-y-4 md:col-span-8">
                      <TicketItemsTable
                        items={watchedItems}
                        onOpenAddItemModal={handleOpenAddItemModal}
                        onOpenBonosModal={(itemIndex) => console.log('Abrir modal bonos para:', itemIndex)}
                        onOpenDiscountModal={handleOpenDiscountModal}
                        onRemoveItem={handleRemoveItem}
                        onQuantityChange={handleQuantityChange}
                        readOnly={isReadOnly}
                        currencyCode={currencyCode}
                        currencySymbol={currencySymbol}
                        linkToOriginTicketId={ticketData?.notes?.match(/ID:\s*(\w+)/)?.[1]}
                        currentTicketId={ticketData?.id}
                      />
                      
                      {/* Resumen de conceptos (sin considerar pagos) */}
                      <div className="p-3 mt-4 rounded-lg bg-gray-50">
                        <div className="flex flex-wrap gap-x-8 gap-y-2">
                          {totalsReady ? (
                          <div className="min-w-[140px]">
                             <span className="block mb-1 text-xs text-gray-500">{t('tickets.summary.base')}:</span>
                             <span className="text-sm font-medium">{formatCurrency(subtotalNetoDeLineas, currencySymbol)}</span>
                           </div>
                          ) : (
                            <Skeleton className="w-24 h-6" />
                          )}
                          {totalsReady ? (
                          <div className="min-w-[90px]">
                            <span className="block mb-1 text-xs text-gray-500">{t('tickets.summary.discount')}:</span>
                            <span className="text-sm font-medium text-red-600">{formatCurrency(totalDescuentosDeLineas + effectiveGlobalDiscount, currencySymbol)}</span>
                          </div>
                          ) : <Skeleton className="w-20 h-6" />}
                          {totalsReady ? (
                          <div className="min-w-[90px]">
                            <span className="block mb-1 text-xs text-gray-500">{t('tickets.summary.vat')}:</span>
                            <span className="text-sm font-medium">{formatCurrency(totalIVADeLineas, currencySymbol)}</span>
                          </div>
                          ) : <Skeleton className="w-16 h-6" />}
                          {totalsReady ? (
                          <div className="min-w-[100px]">
                            <span className="block mb-1 text-xs text-gray-500">{t('tickets.summary.total')}:</span>
                            <span className="text-sm font-semibold text-purple-700">{formatCurrency(totalGeneralTicket, currencySymbol)}</span>
                          </div>
                          ) : <Skeleton className="w-20 h-6" />}
                        </div>
                      </div>
                      
                      <div className="py-3 border-t border-b">
                        {/* Tabs de pagos */}
                        {(() => {
                          const hasDeferredDebt = (() => {
                            if (ticketData?.hasOpenDebt) return true;
                            if (ticketData?.relatedDebts?.some(d => d.pendingAmount > 0.009)) return true;
                            const hasDeferredPayment = ticketData?.status === 'ACCOUNTED' && ticketData.payments?.some(p => (p as any).paymentMethodDefinition?.type === 'DEFERRED_PAYMENT');
                            return !!hasDeferredPayment;
                          })();
                          const directLabel = t('tickets.tabs.directPayments', 'Pagos');
                          const deferredLabel = t('tickets.tabs.deferredPayments', 'Pagos aplazados');
                          const noDeferredText = t('tickets.tabs.noDeferredPayments', 'Sin pagos aplazados registrados');
                          return (
                            <Tabs defaultValue="direct" className="w-full">
                              <TabsList className="mb-4">
                                <TabsTrigger value="direct">
                                  {directLabel}
                                </TabsTrigger>
                                <TabsTrigger value="deferred" disabled={!(ticketData?.status === TicketStatus.ACCOUNTED && ticketData?.cashSession?.status === CashSessionStatus.CLOSED)}>
                                  {deferredLabel}
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="direct">
                          {(() => {
                            // currentPayments y ticketTotalAmount ya están definidos arriba con watch
                            const ticketPaymentsFromForm = currentPayments || []; // Todos los pagos del formulario
                            const totalPaid = ticketPaymentsFromForm.reduce((acc, p) => 
                              acc + (p.amount || 0), 0) || 0;
                            const pendingAmount = (ticketTotalAmount || 0) - totalPaid;
                            // Deshabilitar si el pendiente es 0 o negativo (con un pequeño margen para errores de flotantes)
                            const isAddPaymentDisabledComputed = pendingAmount <= 0.009;
                            const paymentMethodsCatalog: any[] = []; // Placeholder para solucionar el linting. TODO: Obtener el catálogo real.

                            return (
                              <TicketPayments
                                payments={ticketPaymentsFromForm} // Mostrar todos los pagos, incluidos los aplazados
                                onOpenAddPaymentModal={handleOpenAddPaymentModal}
                                onRemovePayment={handleRemovePayment}
                                readOnly={isReadOnly}
                                currencyCode={currencySymbol} // Asegúrate que currencySymbol esté disponible aquí o usa currencyCode
                                paymentMethodsCatalog={paymentMethodsCatalog} // Pasar el catálogo de métodos de pago
                                isAddPaymentDisabled={isAddPaymentDisabledComputed}
                              />
                            );
                          })()}
                        </TabsContent>

                              <TabsContent value="deferred">
                                {hasDeferredDebt ? (
                                  <DebtPaymentsSection 
                                    ticketId={id}
                                    currentClinicId={activeClinic?.id || ticketData?.clinicId}
                                  />
                                ) : (
                                  <div className="text-center text-sm text-gray-500 py-6">
                                    {noDeferredText}
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          );
                        })()}
                      </div>
                      
                      {/* Resumen aplicando pagos (con IVA ajustado) */}
                      <div className="p-3 mt-2 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex flex-wrap gap-x-8 gap-y-2">
                          {totalsReady ? (
                          <div className="min-w-[110px]">
                            <span className="block mb-1 text-xs text-gray-500">{t('tickets.summary.paid')}:</span>
                            <span className="text-sm font-medium text-green-600">{formatCurrency(amountPaid, currencySymbol)}</span>
                          </div>
                          ) : <Skeleton className="w-20 h-6" />}
                          {totalsReady ? (
                          <div className="min-w-[90px]">
                            <span className="block mb-1 text-xs text-gray-500">{t('tickets.summary.adjustedVat')}:</span>
                            <span className="text-sm font-medium">{formatCurrency(adjustedIVA, currencySymbol)}</span>
                          </div>
                          ) : <Skeleton className="w-16 h-6" />}
                          {totalsReady ? (
                          <div className="min-w-[100px]">
                            <span className="block mb-1 text-xs text-gray-500">{t('tickets.summary.adjustedTotal')}:</span>
                            <span className="text-sm font-semibold text-blue-700">{formatCurrency(adjustedTotal, currencySymbol)}</span>
                          </div>
                          ) : <Skeleton className="w-20 h-6" />}
                          
                          {(() => {
                            const explicitlyDeferredInForm = watchedPayments.reduce((sum, p) => {
                              const matchesCode = p.paymentMethodCode === DEFERRED_PAYMENT_METHOD_CODE;
                              const matchesType = (p as any).paymentMethodType === 'DEFERRED_PAYMENT';
                              const matchesName = (p.paymentMethodName || '').toLowerCase().includes('aplazado');
                              if (matchesCode || matchesType || matchesName) {
                                return sum + (p.amount || 0);
                              }
                              return sum;
                            }, 0);

                            // El campo `amountDeferred` en el formState ya contiene el `dueAmount` si hasOpenDebt es true.
                            // Mostrar si la clínica lo permite Y (hay algo explícitamente aplazado en el form O hay una deuda ya guardada)
                            const showDeferredSection = (explicitlyDeferredInForm > 0 || (watch('amountDeferred') || 0) > 0);

                            if (showDeferredSection) {
                              return totalsReady ? (
                              <div className="min-w-[100px]">
                                <span className="block mb-1 text-xs text-gray-500">{t('tickets.summary.deferred')}:</span>
                                <span className="text-sm font-medium text-red-600">-{formatCurrency(explicitlyDeferredInForm || watch('amountDeferred') || 0, currencySymbol)}</span>
                              </div>
                              ) : <Skeleton className="w-20 h-6" />;
                            }
                            return null;
                          })()}
                          {totalsReady ? (
                          <div className="min-w-[110px]">
                            <span className="block mb-1 text-xs text-gray-500">{t('tickets.summary.pending')}:</span>
                            <span className="text-sm font-medium text-amber-600">{formatCurrency(currentPending, currencySymbol)}</span>
                          </div>
                          ) : <Skeleton className="w-20 h-6" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div> {/* Fin del div con key */} 
              </form>
            </Form>
          </div>
        </div>

        <footer className="fixed bottom-0 z-10 border-t bg-white/80 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ left: "var(--sidebar-width, 16rem)", right: "0", transition: "left 0.2s ease-out" }}>
          <div className="container flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-xs text-gray-700 border-gray-300 h-9 hover:bg-gray-50"
                onClick={() => router.push(fromPath || "/facturacion/tickets")}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-xs text-gray-700 border-gray-300 h-9 hover:bg-gray-50"
                onClick={() => alert("Imprimir ticket")}
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-xs text-gray-700 border-gray-300 h-9 hover:bg-gray-50"
                onClick={() => alert(t("common.help_not_implemented"))}
              >
                <HelpCircle className="h-3.5 w-3.5" /> {t("common.help")}
              </Button>
              
              {!isReadOnly && (
              <Button
                type="button"
                onClick={onSubmitForm}
                  disabled={
                    !formState.isDirty ||
                    saveTicketBatchMutation.isPending ||
                    completeAndCloseMutation.isPending ||
                    isSavingBeforeClose ||
                    formState.isSubmitting ||
                    (!isNewTicket && ticketData?.status !== TicketStatus.OPEN)
                  }
                className="px-4 py-0 text-sm font-medium h-9"
              >
                  {saveTicketBatchMutation.isPending ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                  {saveTicketBatchMutation.isPending ? t('common.saving') : t('tickets.saveTicket')}
              </Button>
              )}

              {!isReadOnly && (
                <Button
                  type="button"
                  onClick={handleCompleteAndCloseTicket} 
                  disabled={!isTicketClosable || completeAndCloseMutation.isPending || saveTicketBatchMutation.isPending || isSavingBeforeClose || formState.isSubmitting}
                  className="px-4 py-0 text-sm font-medium h-9"
                >
                  {completeAndCloseMutation.isPending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {t('tickets.closeTicket')} 
                </Button>
              )}

              {(ticketData?.status as string) === TicketStatus.CLOSED && /* !ticketData?.cashSessionId && */ ( // La lógica de cashSessionId ya está en canReopenTicket
                <Button
                  type="button"
                  onClick={() => { // <<< CORREGIDO ONCLICK
                    if (canReopenTicket) { // Usar la variable de estado que ya calcula esto
                      setIsReopenConfirmModalOpen(true);
                    }
                  }}
                  disabled={reopenTicketMutation.isPending || !canReopenTicket} // <<< USAR canReopenTicket >>>
                  title={reopenButtonTooltip} // <<< USAR reopenButtonTooltip >>>
                  className="px-4 py-0 text-sm font-medium h-9"
                >
                  {reopenTicketMutation.isPending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {reopenTicketMutation.isPending ? t('common.reopening') : t('tickets.reopenTicket')}
                </Button>
              ) }
            </div>
          </div>
        </footer>
      </div>
      
      {isAddItemModalOpen && (
        <AddItemModal
          isOpen={isAddItemModalOpen}
          onClose={handleCloseAddItemModal}
          onAddItem={handleAddItem}
        />
      )}
      
      {isAddPaymentModalOpen && (
        <AddPaymentModal
          isOpen={isAddPaymentModalOpen}
          onClose={() => setIsAddPaymentModalOpen(false)}
          onAddPayment={handleAddPayment}
          pendingAmount={defaultPaymentAmount}
          currencyCode={currencySymbol} // Pass currency code
        />
      )}
      
      {editingItemIndex !== null && (
        <ApplyDiscountModal
          isOpen={isApplyDiscountModalOpen}
          onClose={handleCloseDiscountModal}
          itemIndex={editingItemIndex}
          currentItem={watchedItems[editingItemIndex]}
          onApplyDiscount={handleApplyDiscount}
        />
      )}

      <AlertDialog open={showConfirmDelayedPaymentModal} onOpenChange={setShowConfirmDelayedPaymentModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tickets.confirmDelayedPaymentTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tickets.confirmDelayedPaymentDesc", { amount: formatCurrency(pendingAmountForModal, activeClinic?.currency || 'EUR') })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDelayedPaymentModal(false)}>
              {t("common.continueEditing")} 
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelayedPaymentAndClose}>
              {t("common.confirmAndClose")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPaymentRequiredModal} onOpenChange={setShowPaymentRequiredModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" /> {t("tickets.notifications.mustBeFullyPaidTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("tickets.notifications.mustBeFullyPaidDesc", { amount: formatCurrency(pendingAmountForModal, activeClinic?.currency || 'EUR') })}
              <br />
              {t("tickets.notifications.clinicNoDelayedPayment")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPaymentRequiredModal(false)}>{t("common.close")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmación para Reabrir Ticket */}
      <AlertDialog open={isReopenConfirmModalOpen} onOpenChange={setIsReopenConfirmModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tickets.reopenConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tickets.reopenConfirmDescription', { ticketId: ticketData?.ticketNumber || id })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsReopenConfirmModalOpen(false)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReopenTicket} // Este es el onClick que ejecuta la mutación
              disabled={reopenTicketMutation.isPending || !canReopenTicket}
              className="bg-teal-600 hover:bg-teal-700"
              title={reopenButtonTooltip} 
            >
              {reopenTicketMutation.isPending ? t('common.reopening') : t('tickets.reopenTicket')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
} 