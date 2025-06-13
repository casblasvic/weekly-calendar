"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Building2, FileText, Loader2, User } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from '@/lib/format-utils';
import { toast } from 'sonner';
import { useCanInvoice } from '@/lib/hooks/use-can-invoice';

// Schema de validación del formulario
const invoiceConversionSchema = z.object({
  seriesId: z.string().min(1, "Selecciona una serie de facturación"),
  issueDate: z.string().min(1, "Fecha de emisión requerida"),
  dueDate: z.string().optional(),
  receiverType: z.enum(['B2C', 'B2B', 'SIMPLIFIED']),
  companyId: z.string().optional(),
  notes: z.string().optional(),
  sendByEmail: z.boolean().default(false),
  generatePDF: z.boolean().default(true),
  autoAccount: z.boolean().default(true),
});

type InvoiceConversionFormData = z.infer<typeof invoiceConversionSchema>;

interface InvoiceConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
  onInvoiceGenerated?: (invoiceId: string) => void;
}

export default function InvoiceConversionModal({
  isOpen,
  onClose,
  ticketId,
  onInvoiceGenerated
}: InvoiceConversionModalProps) {
  const { data: canInvoiceData, loading, error } = useCanInvoice(ticketId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loadingForm, setLoadingForm] = useState(false);

  const form = useForm<InvoiceConversionFormData>({
    resolver: zodResolver(invoiceConversionSchema),
    defaultValues: {
      seriesId: canInvoiceData?.defaultSeriesId || '',
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      receiverType: canInvoiceData?.company ? 'B2B' : 'B2C',
      companyId: canInvoiceData?.company?.id || '',
      sendByEmail: false,
      generatePDF: true,
      autoAccount: true,
    },
  });

  const receiverType = form.watch('receiverType');

  // Actualizar valores del formulario cuando canInvoiceData esté disponible
  useEffect(() => {
    if (canInvoiceData) {
      console.log('[InvoiceConversionModal] Data loaded:', {
        hasTicket: !!canInvoiceData.ticket,
        ticketNumber: canInvoiceData.ticket?.ticketNumber,
        hasLegalEntity: !!canInvoiceData.legalEntity,
        availableSeriesCount: canInvoiceData.availableSeries?.length || 0,
        defaultSeriesId: canInvoiceData.defaultSeriesId
      });
      
      form.reset({
        seriesId: canInvoiceData.defaultSeriesId || '',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        receiverType: canInvoiceData.company ? 'B2B' : 'B2C',
        companyId: canInvoiceData.company?.id || '',
        sendByEmail: false,
        generatePDF: true,
        autoAccount: true,
      });
    }
  }, [canInvoiceData, form]);

  const handleSubmit = async (data: InvoiceConversionFormData) => {
    setLoadingForm(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al generar la factura');
      }

      const result = await response.json();
      toast.success('Factura generada correctamente');
      
      if (onInvoiceGenerated) {
        onInvoiceGenerated(result.invoiceId);
      }
      
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al generar la factura');
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle>Generar Factura desde Ticket</DialogTitle>
          <DialogDescription>
            {ticketId ? `Convierte el ticket en una factura fiscal` : 'Selecciona un ticket'}
          </DialogDescription>
        </DialogHeader>

        {/* Estado de carga */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Estado de error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Contenido principal */}
        {!loading && !error && canInvoiceData && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Información del Ticket */}
              {canInvoiceData.ticket && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Información del Ticket</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Número:</span>
                        <span className="ml-2 font-medium">
                          {canInvoiceData.ticket.ticketNumber || 'Sin número'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha:</span>
                        <span className="ml-2">
                          {canInvoiceData.ticket.issueDate 
                            ? format(new Date(canInvoiceData.ticket.issueDate), 'dd/MM/yyyy')
                            : '-'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Importe:</span>
                        <span className="ml-2 font-medium">
                          {formatCurrency(canInvoiceData.ticket.finalAmount || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estado:</span>
                        <Badge variant="default" className="ml-2">
                          {canInvoiceData.ticket.status || 'Desconocido'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Datos del Emisor */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Datos del Emisor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">{canInvoiceData.legalEntity?.name || 'Entidad no asignada'}</span>
                    </div>
                    {canInvoiceData.legalEntity?.taxIdentifierFields && (
                      <div className="text-muted-foreground">
                        {Object.entries(canInvoiceData.legalEntity.taxIdentifierFields).map(([key, value]) => (
                          <div key={key}>{key}: {String(value)}</div>
                        ))}
                      </div>
                    )}
                    {canInvoiceData.legalEntity?.fullAddress && (
                      <div className="text-muted-foreground">
                        {canInvoiceData.legalEntity.fullAddress}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Datos del Receptor */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Datos del Receptor</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="receiverType"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Tipo de Receptor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="B2C">
                              <div className="flex items-center">
                                <User className="mr-2 h-4 w-4" />
                                Cliente Particular (B2C)
                              </div>
                            </SelectItem>
                            <SelectItem value="B2B">
                              <div className="flex items-center">
                                <Building2 className="mr-2 h-4 w-4" />
                                Empresa (B2B)
                              </div>
                            </SelectItem>
                            <SelectItem value="SIMPLIFIED">
                              <div className="flex items-center">
                                <FileText className="mr-2 h-4 w-4" />
                                Factura Simplificada
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Mostrar datos según el tipo de receptor */}
                  {receiverType === 'B2C' && canInvoiceData.person && (
                    <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-md">
                      <div className="font-medium">
                        {canInvoiceData.person.firstName} {canInvoiceData.person.lastName}
                      </div>
                      {canInvoiceData.person.taxId && (
                        <div className="text-muted-foreground">NIF: {canInvoiceData.person.taxId}</div>
                      )}
                      {canInvoiceData.person.email && (
                        <div className="text-muted-foreground">{canInvoiceData.person.email}</div>
                      )}
                    </div>
                  )}

                  {receiverType === 'B2B' && canInvoiceData.company && (
                    <div className="space-y-2">
                      {!canInvoiceData.company.hasCompleteFiscalData && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            La empresa no tiene datos fiscales completos. 
                            Considere actualizar los datos antes de facturar.
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-md">
                        <div className="font-medium">{canInvoiceData.company.name}</div>
                        {canInvoiceData.company.taxId && (
                          <div className="text-muted-foreground">CIF/NIF: {canInvoiceData.company.taxId}</div>
                        )}
                        {canInvoiceData.company.address && (
                          <div className="text-muted-foreground">{canInvoiceData.company.address}</div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Configuración de la Factura */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Configuración de la Factura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="seriesId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serie de Facturación</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona una serie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {canInvoiceData.availableSeries?.map((series: any) => (
                                <SelectItem key={series.id} value={series.id}>
                                  {series.name} ({series.prefix}{series.currentNumber + 1})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Emisión</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Vencimiento (opcional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          Solo para facturas con pago aplazado
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas / Observaciones</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Añade notas o información adicional para la factura..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Opciones Adicionales */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Opciones Adicionales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sendByEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Enviar por Email</FormLabel>
                          <FormDescription>
                            Enviar la factura automáticamente al cliente
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="generatePDF"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Generar PDF</FormLabel>
                          <FormDescription>
                            Crear el documento PDF de la factura
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="autoAccount"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Contabilización Automática</FormLabel>
                          <FormDescription>
                            Generar asiento contable automáticamente
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loadingForm}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loadingForm}
                  className="min-w-[120px]"
                >
                  {loadingForm ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    'Generar Factura'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
