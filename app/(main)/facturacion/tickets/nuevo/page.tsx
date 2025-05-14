"use client";

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TicketFormValues, ticketFormSchema, defaultTicketFormValues, TicketItemFormValues, TicketPaymentFormValues } from "@/lib/schemas/ticket";
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { MagicCard } from "@/components/ui/magic-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { AddItemModal } from '@/components/tickets/add-item-modal';
import { AddPaymentModal } from '@/components/tickets/add-payment-modal';
import { ApplyDiscountModal } from '@/components/tickets/apply-discount-modal';
import { useClinic } from '@/contexts/clinic-context';
import { useUsersByClinicQuery, type UserForSelector } from "@/lib/hooks/use-user-query";
import { useTranslation } from "react-i18next";
import { useCreateTicketMutation } from "@/lib/hooks/use-ticket-query";

// Datos de ejemplo para selects
const exampleSellers = [
  { id: "1", name: "Juan López" },
  { id: "2", name: "Ana García" },
  { id: "3", name: "Carlos Pérez" }
];

const exampleSeries = [
  { id: 'A', name: 'Serie A' },
  { id: 'B', name: 'Serie B' },
  { id: 'C', name: 'Serie C' },
];

const examplePrintSizes = [
  { id: '80mm', name: '80mm - Estándar' },
  { id: '58mm', name: '58mm - Reducido' },
  { id: 'A4', name: 'A4 - Completo' },
];

export default function NuevoTicketPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { activeClinic } = useClinic();
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [isApplyDiscountModalOpen, setIsApplyDiscountModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const createTicketMutation = useCreateTicketMutation();

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
  const { control, handleSubmit, setValue, setError, clearErrors, formState, watch, getValues, trigger } = form;

  const onSubmit = async (data: TicketFormValues) => {
    console.log("Datos del formulario de ticket:", data);
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

    await new Promise(resolve => setTimeout(resolve, 1000)); 
    toast({
      title: "Ticket (Borrador) Guardado",
      description: `Ticket para ${data.clientName} con ${data.items.length} conceptos guardado (simulación).`,
      variant: "default",
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

  const handleOpenAddItemModal = () => {
    setIsAddItemModalOpen(true);
  };

  const handleCloseAddItemModal = () => setIsAddItemModalOpen(false);
  
  const handleAddItem = (item: TicketFormValues['items'][0]) => {
    const currentItems = watch('items') || [];
    const newItemWithDefaults = {
      ...item,
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
      quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
      vatRate: typeof item.vatRate === 'number' ? item.vatRate : 0,
      discountAmount: typeof item.discountAmount === 'number' ? item.discountAmount : 0,
      discountPercentage: typeof item.discountPercentage === 'number' ? item.discountPercentage : 0,
    };
    setValue('items', [...currentItems, newItemWithDefaults]);
    
    toast({
      title: "Producto añadido",
      description: `${item.concept} añadido al ticket.`      
    });
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
    if (watch('items').length === 0) {
      toast({
        title: "Error",
        description: "Añada al menos un producto o servicio antes de realizar un pago",
        variant: "destructive",
      });
      return;
    }
    
    const pendingAmount = calculatePendingAmount();
    if (pendingAmount <= 0) {
      toast({
        title: "Información",
        description: "El ticket ya está completamente pagado",
      });
      return;
    }
    
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
    setValue('payments', [...watch('payments') || [], newPayment]);
  };

  const handleRemovePayment = (paymentId: string) => {
    const currentPayments = watch('payments') || [];
    const updatedPayments = currentPayments.filter(p => p.id !== paymentId);
    setValue('payments', updatedPayments, { shouldDirty: true });
    toast({
      description: "Pago eliminado correctamente",
    });
  };

  const handleRemoveItem = (index: number) => {
    const currentItems = watch('items') || [];
    const updatedItems = currentItems.filter((_, i) => i !== index);
    setValue('items', updatedItems, { shouldDirty: true, shouldValidate: true });
    toast({
      description: "Ítem eliminado del ticket.",
    });
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    const currentItem = getValues(`items.${index}`);
    if (currentItem) {
      setValue(`items.${index}.quantity`, newQuantity, { shouldValidate: true, shouldDirty: true });
    }
  };

  const onSubmitForm = handleSubmit((data) => {
    console.log('Datos del formulario:', data);
    toast({
      description: "Ticket guardado correctamente (simulación).",
    });
    router.push('/facturacion/tickets');
  });

  const onFormSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    onSubmitForm();
  };

  const watchedItems = form.watch('items');
  const currencyCode = 'EUR';
  const currencySymbol = '€';

  return (
    <FormProvider {...form}>
      <div className="flex-1 overflow-auto relative" style={{ "--sidebar-width": "var(--sidebar-width, 16rem)" } as React.CSSProperties}>
        <div className="container mx-auto pb-24 relative">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Nuevo Ticket</h1>
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
                id="nuevo-ticket-form" 
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
                                      {exampleSeries.map(serie => (
                                        <SelectItem key={serie.id} value={serie.id} className="text-xs">
                                          {serie.name}
                                        </SelectItem>
                                      ))}
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
                                      {examplePrintSizes.map(size => (
                                        <SelectItem key={size.id} value={size.id} className="text-xs">
                                          {size.name}
                                        </SelectItem>
                                      ))}
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
                    {/* Eliminar este contenedor y BorderBeam */}
                    {/* <div className="relative rounded-lg overflow-hidden"> */}
                    {/*   <BorderBeam  */}
                    {/*     colorFrom="#8b5cf6" */}
                    {/*     colorTo="#ec4899" */}
                    {/*     duration={10} */}
                    {/*     size={120} */}
                    {/*   /> */}
                    {/*   <div className="relative rounded-lg border bg-card p-4"> */} 
                        
                        {/* Tabla de Items (Conceptos) - Ahora directamente aquí */}
                        <TicketItemsTable
                          onOpenAddItemModal={handleOpenAddItemModal}
                          onOpenDiscountModal={handleOpenDiscountModal}
                          onOpenBonosModal={(index) => console.log('Abrir modal bonos para:', index)}
                          items={watchedItems || []}
                          onRemoveItem={handleRemoveItem}
                          onQuantityChange={handleQuantityChange}
                          currencyCode={currencyCode}
                          currencySymbol={currencySymbol}
                        />

                    {/*   </div> */}
                    {/* </div> */}
                    
                    {/* Tabla de Pagos */}
                    <div className="border-t border-b py-3">
                      <TicketPayments 
                        onOpenAddPaymentModal={handleOpenAddPaymentModal} 
                        onRemovePayment={handleRemovePayment}
                      />
                    </div>
                    
                    {/* Resumen de Totales (debajo de la tabla de pagos) */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <div className="flex flex-wrap gap-x-8 gap-y-2">
                        <div className="min-w-[140px]">
                          <span className="text-xs text-gray-500 block mb-1">Base Imponible:</span>
                          <span className="text-sm font-medium">{watch('subtotalAmount').toFixed(2)} €</span>
                        </div>
                        <div className="min-w-[90px]">
                          <span className="text-xs text-gray-500 block mb-1">IVA:</span>
                          <span className="text-sm font-medium">{watch('taxAmount').toFixed(2)} €</span>
                        </div>
                        <div className="min-w-[100px]">
                          <span className="text-xs text-gray-500 block mb-1">Total:</span>
                          <span className="text-sm font-semibold text-purple-700">{watch('totalAmount').toFixed(2)} €</span>
                        </div>
                        <div className="min-w-[110px]">
                          <span className="text-xs text-gray-500 block mb-1">Pendiente:</span>
                          <span className="text-sm font-medium text-amber-600">{calculatePendingAmount().toFixed(2)} €</span>
                        </div>
                        <div className="min-w-[100px]">
                          <span className="text-xs text-gray-500 block mb-1">Aplazado:</span>
                          <span className="text-sm font-medium text-blue-600">{(watch('amountDeferred') || 0).toFixed(2)} €</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* Footer fijo con botones de acción */}
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
                shimmerColor="#8b5cf6"
                shimmerSize="0.1em"
                shimmerDuration="2.5s"
                borderRadius="0.5rem"
                background="rgba(109, 40, 217, 1)"
                className="h-9 px-4 py-0 text-sm font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <Save className="h-3.5 w-3.5" /> Guardar Ticket
                </span>
              </ShimmerButton>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Modal para añadir producto/servicio */}
      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={handleCloseAddItemModal}
        onAddItem={handleAddItem}
      />
      
      {/* Modal para añadir pago */}
      <AddPaymentModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        onAddPayment={handleAddPayment}
        pendingAmount={calculatePendingAmount()}
      />

      <ApplyDiscountModal
        isOpen={isApplyDiscountModalOpen}
        onClose={handleCloseDiscountModal}
        itemIndex={editingItemIndex}
        currentItem={editingItemIndex !== null ? watch(`items.${editingItemIndex}`) : null}
        onApplyDiscount={handleApplyDiscount}
      />
    </FormProvider>
  );
} 