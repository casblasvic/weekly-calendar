"use client";

import React, { useEffect, useState, use } from 'react';
import { useForm, FormProvider, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketFormSchema, defaultTicketFormValues, type TicketFormValues, type TicketItemFormValues, type TicketPaymentFormValues } from '@/lib/schemas/ticket';
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, HelpCircle, Printer, Save, AlertTriangle, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/components/ui/use-toast";
import { ClientSelectorSearch } from '@/components/tickets/client-selector-search';
import { TicketItemsTable } from '@/components/tickets/ticket-items-table';
import { TicketPayments } from '@/components/tickets/ticket-payments';
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
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
import { useTicketDetailQuery, useUpdateTicketMutation, useDeleteTicketPaymentMutation } from '@/lib/hooks/use-ticket-query';
import { useUsersByClinicQuery, type UserForSelector } from "@/lib/hooks/use-user-query";

interface EditTicketPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditarTicketPage({ params }: EditTicketPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [isApplyDiscountModalOpen, setIsApplyDiscountModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [defaultPaymentAmount, setDefaultPaymentAmount] = useState<number>(0);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState<string | null>(null);
  
  const { id } = use(params);
  const { activeClinic } = useClinic();
  const { t } = useTranslation();

  console.log("[EditarTicketPage] Active Clinic:", activeClinic);
  console.log("[EditarTicketPage] Active Clinic ID:", activeClinic?.id);

  const {
    data: ticketData, 
    isLoading: isLoadingTicket,
    isError: isErrorTicket,
    error: errorTicket,
    isSuccess: isSuccessTicket,
  } = useTicketDetailQuery(id);
  
  const updateTicketMutation = useUpdateTicketMutation();
  const deletePaymentMutation = useDeleteTicketPaymentMutation();

  const {
    data: sellers = [],
    isLoading: isLoadingSellers,
  } = useUsersByClinicQuery(
    { clinicId: activeClinic?.id || "" }, 
    { enabled: !!activeClinic?.id }
  );

  console.log("[EditarTicketPage] isLoadingSellers:", isLoadingSellers);
  console.log("[EditarTicketPage] Sellers:", sellers);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: defaultTicketFormValues,
    mode: 'onChange',
  });
  
  useEffect(() => {
    if (isSuccessTicket && ticketData && form) {
      const formValues: Partial<TicketFormValues> = {
        clientId: ticketData.clientId,
        clientName: ticketData.clientName,
        clientDetails: ticketData.clientDetails,
        sellerId: ticketData.sellerUser?.id,
        series: ticketData.series,
        printSize: ticketData.printSize,
        observations: ticketData.observations || '',
        status: ticketData.status,
        items: ticketData.items.map((apiItem: any) => {
          let conceptName = apiItem.description;

          if (!conceptName) {
            switch (apiItem.itemType) {
              case 'SERVICE':
                conceptName = apiItem.service?.name;
                break;
              case 'PRODUCT':
                conceptName = apiItem.product?.name;
                break;
              case 'BONO_DEFINITION':
              case 'BONO':
                conceptName = apiItem.bonoDefinition?.name;
                break;
              case 'PACKAGE_DEFINITION':
              case 'PACKAGE':
                conceptName = apiItem.packageDefinition?.name;
                break;
              default:
                if (apiItem.itemId && apiItem.itemId.startsWith('c')) {
                  conceptName = apiItem.itemId;
                } else {
                  conceptName = 'Concepto no especificado';
                }
            }
          }

          return {
            id: apiItem.id,
            itemId: apiItem.itemId,
            type: apiItem.itemType,
            concept: conceptName || 'Error al cargar concepto',
            quantity: apiItem.quantity,
            originalUnitPrice: apiItem.originalUnitPrice ?? apiItem.unitPrice,
            unitPrice: apiItem.unitPrice,
            discountPercentage: apiItem.manualDiscountPercentage || 0,
            discountAmount: apiItem.manualDiscountAmount || 0,
            manualDiscountPercentage: apiItem.manualDiscountPercentage || 0,
            manualDiscountAmount: apiItem.manualDiscountAmount || 0,
            promotionDiscountAmount: apiItem.promotionDiscountAmount || 0,
            appliedPromotionId: apiItem.appliedPromotionId || undefined,
            accumulatedDiscount: apiItem.accumulatedDiscount || false,
            finalPrice: apiItem.finalPrice,
            vatRateId: apiItem.vatRateId || undefined,
            vatRate: apiItem.vatRate || 0,
            vatAmount: apiItem.vatAmount,
            notes: apiItem.notes || '',
            bonoInstanceId: apiItem.bonoInstanceId || undefined,
          };
        }),
        payments: ticketData.payments.map(p => ({ 
          id: p.id, 
          paymentMethodDefinitionId: p.paymentMethodDefinitionId,
          paymentMethodName: p.paymentMethodName || 'Desconocido',
          amount: p.amount,
          paymentDate: p.paymentDate ? new Date(p.paymentDate) : new Date(),
          transactionReference: p.transactionReference || '',
          notes: p.notes || '',
        })),
        ticketDate: ticketData.ticketDate ? new Date(ticketData.ticketDate) : new Date(),
        ticketNumber: ticketData.ticketNumber,
        subtotalAmount: ticketData.subtotalAmount,
        globalDiscountAmount: ticketData.globalDiscountAmount,
        taxableBaseAmount: ticketData.taxableBaseAmount,
        taxAmount: ticketData.taxAmount,
        totalAmount: ticketData.totalAmount,
        amountDeferred: ticketData.amountDeferred || 0,
      };
      form.reset(formValues);
    }
  }, [isSuccessTicket, ticketData, form]);

  const { control, handleSubmit, setValue, setError, clearErrors, formState, watch, getValues, trigger } = form;

  const onSubmit = async (data: TicketFormValues) => {
    console.log("Datos del formulario para actualizar:", data);
    if (!data.clientId) {
      setError("clientId", { type: "manual", message: "Debe seleccionar un cliente." });
      toast({
        title: "Error de validación",
        description: "Por favor, seleccione un cliente para el ticket.",
        variant: "destructive",
      });
      return;
    }
    if (!data.items || data.items.length === 0) {
      toast({
        title: "Error de validación",
        description: "Debe añadir al menos un concepto al ticket.",
        variant: "destructive",
      });
      return;
    }

    const apiData: Partial<TicketFormValues> = {
      clientId: data.clientId,
      sellerId: data.sellerId,
      series: data.series,
      printSize: data.printSize,
      observations: data.observations,
      items: data.items.map(item => ({
          id: item.id?.startsWith('temp-') ? undefined : item.id,
          itemId: item.itemId,
          type: item.type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRateId: item.vatRateId,
          manualDiscountPercentage: item.manualDiscountPercentage,
          manualDiscountAmount: item.manualDiscountAmount,
          appliedPromotionId: item.appliedPromotionId,
          accumulatedDiscount: item.accumulatedDiscount,
          notes: item.notes,
          bonoInstanceId: item.bonoInstanceId,
      })),
      payments: data.payments.map(p => ({
          id: p.id?.startsWith('payment-') ? undefined : p.id,
          paymentMethodDefinitionId: p.paymentMethodDefinitionId,
          amount: p.amount,
          paymentDate: p.paymentDate,
          transactionReference: p.transactionReference,
          notes: p.notes,
      })),
      amountDeferred: data.amountDeferred,
    };

    updateTicketMutation.mutate({ id, data: apiData }, {
      onSuccess: (updatedTicket) => {
        toast({
          title: t('tickets.updateSuccess.title'),
          description: t('tickets.updateSuccess.description', { ticketNumber: updatedTicket.ticketNumber }),
          variant: "default",
        });
        router.push("/facturacion/tickets");
      },
      onError: (error: any) => {
        console.error("Error al actualizar el ticket:", error);
        toast({
          title: t('common.error'),
          description: error?.message || t('tickets.updateError.description'),
          variant: "destructive",
        });
      }
    });
  };

  const handleClientSelectedInForm = (client: any | null) => {
    console.log("Cliente seleccionado:", client);
    if (client) {
      setValue('clientId', client.id, { shouldValidate: true });
      setValue('clientName', `${client.firstName} ${client.lastName}${client.companyName ? ` (${client.companyName})` : ''}`);
      setValue('clientDetails', client);
      clearErrors('clientId');
    } else {
      setValue('clientId', undefined, { shouldValidate: true });
      setValue('clientName', undefined);
      setValue('clientDetails', undefined);
    }
  };

  const handleOpenAddItemModal = () => setIsAddItemModalOpen(true);
  const handleCloseAddItemModal = () => setIsAddItemModalOpen(false);
  
  const handleAddItem = (item: TicketFormValues['items'][0]) => {
    const currentItems = watch('items') || [];
    setValue('items', [...currentItems, item]);
    toast({
      title: "Producto añadido",
      description: `${item.concept} añadido al ticket.`,
      variant: "default",
    });
  };

  const handleRemoveItem = (index: number) => {
    const currentItems = watch('items') || [];
    const updatedItems = currentItems.filter((_, i) => i !== index);
    setValue('items', updatedItems);
    toast({
      description: "Elemento eliminado del ticket.",
      variant: "default",
    });
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(index);
    } else {
      setValue(`items.${index}.quantity`, newQuantity);
      trigger(`items.${index}`);
    }
  };

  const handleOpenDiscountModal = (index: number) => {
    setEditingItemIndex(index);
    setIsApplyDiscountModalOpen(true);
  };

  const handleCloseDiscountModal = () => {
    setIsApplyDiscountModalOpen(false);
    setEditingItemIndex(null);
  };

  const handleApplyDiscount = (itemIndex: number, updates: Partial<TicketItemFormValues>) => {
    if (itemIndex !== null) {
      const currentItem = getValues(`items.${itemIndex}`);
      const updatedItem = { ...currentItem, ...updates };

      Object.keys(updates).forEach(key => {
          setValue(`items.${itemIndex}.${key as keyof TicketItemFormValues}`, updates[key as keyof TicketItemFormValues] as any);
      });

      trigger(`items.${itemIndex}`); 
    }
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

  const handleAddPayment = (payment: TicketPaymentFormValues) => {
    const newPayment = {
      ...payment,
      id: `payment-${Date.now()}`,
    };
    
    const currentPayments = watch('payments') || [];
    setValue('payments', [...currentPayments, newPayment], { shouldDirty: true });
  };

  const handleRemovePayment = (paymentIdToRemove: string) => {
    const currentTicketPayments = getValues('payments') || [];
    
    // Primero, quitarlo de la UI localmente
    const updatedPayments = currentTicketPayments.filter(
      (payment) => payment.id !== paymentIdToRemove
    );
    setValue('payments', updatedPayments, { shouldValidate: true, shouldDirty: true });
    trigger('payments');

    // Verificar si el pago estaba originalmente en los datos cargados del ticket
    // ticketData es el resultado de useTicketDetailQuery
    const isPersistedPayment = ticketData?.payments.some(p => p.id === paymentIdToRemove);

    if (isPersistedPayment) {
      deletePaymentMutation.mutate(
        { paymentId: paymentIdToRemove, ticketId: id as string },
        {
          onSuccess: (apiResponse) => { // apiResponse podría ser { success: true, message: "...", deletedPaymentId: "..." }
            toast({
              description: t('tickets.notifications.paymentDeletedSuccess'),
            });
            // La invalidación de la query del ticket se maneja en el hook de la mutación useDeleteTicketPaymentMutation
          },
          onError: (error: any) => {
            if (error?.response?.status === 404) {
              // El pago ya no existía en la BD (quizás borrado en otra sesión o por otro usuario).
              // La UI ya está actualizada, así que la acción del usuario es consistente.
              // No es necesario mostrar un error disruptivo.
              console.warn(`Attempted to delete payment ${paymentIdToRemove} which was not found in DB. Already removed from UI.`);
              toast({
                title: t('common.information'),
                description: t('tickets.notifications.paymentNotFoundAnymore'),
                variant: 'default',
              });
            } else {
              // Para otros errores de API, mostrar error y revertir la UI.
              toast({
                title: t('common.error'),
                description: error?.message || t('tickets.notifications.paymentDeletedError'),
                variant: "destructive",
              });
              // Revertir la eliminación de la UI si la API falló por una razón distinta a 404
              setValue('payments', currentTicketPayments, { shouldValidate: true });
            }
          },
        }
      );
    } else {
      // El pago era local (no persistido), ya se quitó de la UI.
      // Mostrar un toast de éxito específico para eliminación local.
      toast({
        description: t('tickets.notifications.localPaymentRemovedSuccess'),
      });
    }
  };

  const onSubmitForm = handleSubmit(onSubmit);

  const onFormSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    onSubmitForm();
  };

  const watchedItems = form.watch('items') || [];
  const watchedPayments = form.watch('payments') || [];

  const currencyCode = activeClinic?.currency || 'EUR';
  const currencySymbol = currencyCode;

  const subtotal = watchedItems.reduce((sum, item) => sum + (item.finalPrice || 0) * item.quantity, 0);
  const totalDiscount = watchedItems.reduce((sum, item) => sum + (item.discountAmount || 0) * item.quantity, 0);
  const totalVat = watchedItems.reduce((sum, item) => sum + (item.vatAmount || 0) * item.quantity, 0);
  const totalAmount = subtotal + totalVat;
  const amountPaid = watchedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const currentPending = Math.max(0, totalAmount - amountPaid);

  useEffect(() => {
    form.setValue('subtotalAmount', subtotal);
    form.setValue('taxAmount', totalVat);
    form.setValue('amountPaid', amountPaid);
  }, [subtotal, totalVat, amountPaid, form]);

  if (isLoadingTicket) {
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
        <h2 className="text-xl font-semibold mb-2">{t('common.errorLoadingData')}</h2>
        <p className="text-center">{errorTicket?.message || t('common.errorLoadingDataGeneric')}</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div className="flex-1 overflow-auto relative" style={{ "--sidebar-width": "var(--sidebar-width, 16rem)" } as React.CSSProperties}>
        <div className="container mx-auto pb-24 relative">
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
                className="space-y-6 relative bg-background p-5 rounded-xl"
              >
                <div className="grid md:grid-cols-12 gap-6">
                  {/* Columna izquierda - Datos Cliente y Ticket */}
                  <div className="md:col-span-4 space-y-6">
                    {/* Sección Cliente */}
                    <div className="relative rounded-lg overflow-hidden">
                      <MagicCard 
                        gradientFrom="#8b5cf6" 
                        gradientTo="#ec4899" 
                        gradientSize={180}
                        gradientOpacity={0.05}
                        className="rounded-lg"
                      >
                        <div className="p-4 rounded-lg">
                          <ClientSelectorSearch 
                            selectedClientId={watch("clientId")}
                            onClientSelect={handleClientSelectedInForm}
                            setFormValue={(field, value, options) => {
                              if (field === "clientId" || field === "clientName" || field === "clientDetails") {
                                setValue(field as any, value, options);
                              }
                            }}
                          />
                        </div>
                      </MagicCard>
                    </div>

                    {/* Sección Datos del Ticket */}
                    <div className="relative rounded-lg overflow-hidden">
                      <BorderBeam 
                        colorFrom="#8b5cf6"
                        colorTo="#ec4899"
                        duration={6}
                        size={60}
                        reverse={true}
                      />
                      <div className="p-4 rounded-lg border bg-card">
                        <h2 className="text-sm font-medium text-gray-700 mb-3">Datos del Ticket</h2>
                        
                        <div className="grid gap-4">
                          <FormField
                            control={control}
                            name="sellerId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">{t('tickets.seller')}</FormLabel>
                                <Select 
                                  value={field.value} 
                                  onValueChange={field.onChange}
                                  disabled={isLoadingSellers || sellers.length === 0}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder={isLoadingSellers ? t('common.loading') : t('tickets.selectSellerPlaceholder')} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {isLoadingSellers ? (
                                      <SelectItem value="loading" disabled className="text-xs">{t('common.loading')}</SelectItem>
                                    ) : sellers.length === 0 ? (
                                      <SelectItem value="no-sellers" disabled className="text-xs">{t('tickets.noSellersAvailable')}</SelectItem>
                                    ) : (
                                      sellers.map((seller: UserForSelector) => (
                                        <SelectItem key={seller.id} value={seller.id} className="text-xs">
                                          {`${seller.firstName || ''} ${seller.lastName || ''}`.trim() || seller.email}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={control}
                              name="series"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Nº Serie</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Serie" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {/* exampleSeries.map(serie => (
                                        <SelectItem key={serie.id} value={serie.id} className="text-xs">
                                          {serie.name}
                                        </SelectItem>
                                      )) */}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={control}
                              name="printSize"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Tamaño impresión</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Tamaño" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {/* examplePrintSizes.map(size => (
                                        <SelectItem key={size.id} value={size.id} className="text-xs">
                                          {size.name}
                                        </SelectItem>
                                      )) */}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
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
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Columna derecha - Conceptos, Totales y Pagos */}
                  <div className="md:col-span-8 space-y-4">
                    <TicketItemsTable
                      items={watchedItems}
                      onOpenAddItemModal={handleOpenAddItemModal}
                      onOpenBonosModal={(itemIndex) => console.log('Abrir modal bonos para:', itemIndex)}
                      onOpenDiscountModal={handleOpenDiscountModal}
                      onRemoveItem={handleRemoveItem}
                      onQuantityChange={handleQuantityChange}
                      readOnly={form.getValues('status') === 'PAID' || form.getValues('status') === 'CANCELLED'}
                      currencyCode={currencyCode}
                      currencySymbol={currencySymbol}
                    />
                    
                    <div className="border-t border-b py-3">
                      <TicketPayments 
                        onOpenAddPaymentModal={handleOpenAddPaymentModal} 
                        onRemovePayment={handleRemovePayment}
                      />
                    </div>
                    
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <div className="flex flex-wrap gap-x-8 gap-y-2">
                        <div className="min-w-[140px]">
                          <span className="text-xs text-gray-500 block mb-1">Base Imponible:</span>
                          <span className="text-sm font-medium">{formatCurrency(subtotal, currencySymbol)}</span>
                        </div>
                        <div className="min-w-[90px]">
                          <span className="text-xs text-gray-500 block mb-1">Dto.:</span>
                          <span className="text-sm font-medium text-red-600">{formatCurrency(totalDiscount, currencySymbol)}</span>
                        </div>
                        <div className="min-w-[90px]">
                          <span className="text-xs text-gray-500 block mb-1">IVA:</span>
                          <span className="text-sm font-medium">{formatCurrency(totalVat, currencySymbol)}</span>
                        </div>
                        <div className="min-w-[100px]">
                          <span className="text-xs text-gray-500 block mb-1">Total:</span>
                          <span className="text-sm font-semibold text-purple-700">{formatCurrency(totalAmount, currencySymbol)}</span>
                        </div>
                        <div className="min-w-[110px]">
                          <span className="text-xs text-gray-500 block mb-1">Pagado:</span>
                          <span className="text-sm font-medium text-green-600">{formatCurrency(amountPaid, currencySymbol)}</span>
                        </div>
                        <div className="min-w-[110px]">
                          <span className="text-xs text-gray-500 block mb-1">Pendiente:</span>
                          <span className="text-sm font-medium text-amber-600">{formatCurrency(currentPending, currencySymbol)}</span>
                        </div>
                        <div className="min-w-[100px]">
                          <span className="text-xs text-gray-500 block mb-1">Aplazado:</span>
                          <span className="text-sm font-medium text-blue-600">{formatCurrency(watch('amountDeferred') || 0, currencySymbol)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </div>

        <footer className="fixed bottom-0 z-10 border-t bg-white/80 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ left: "var(--sidebar-width, 16rem)", right: "0" }}>
          <div className="container p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => router.push("/facturacion/tickets")}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
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
                className="h-9 gap-1 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => alert("Mostrar ayuda")}
              >
                <HelpCircle className="h-3.5 w-3.5" /> Ayuda
              </Button>
              
              <ShimmerButton
                type="button"
                onClick={onSubmitForm}
                disabled={updateTicketMutation.isPending || formState.isSubmitting}
                shimmerColor="#8b5cf6"
                shimmerSize="0.1em"
                shimmerDuration="2.5s"
                borderRadius="0.5rem"
                background="rgba(109, 40, 217, 1)"
                className="h-9 px-4 py-0 text-sm font-medium"
              >
                {updateTicketMutation.isPending ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                {updateTicketMutation.isPending ? t('common.saving') : t('common.saveChanges')}
              </ShimmerButton>
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
    </FormProvider>
  );
} 