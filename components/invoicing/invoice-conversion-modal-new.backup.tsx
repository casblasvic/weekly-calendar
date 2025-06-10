'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Loader2, 
  User, 
  Building2,
  FileText,
  CreditCard,
  Calendar,
  Check,
  X,
  Edit2,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format-utils';
import { useCanInvoice } from '@/lib/hooks/use-can-invoice';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';

interface InvoiceConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
}

export default function InvoiceConversionModal({
  isOpen,
  onClose,
  ticketId
}: InvoiceConversionModalProps) {
  const { data: canInvoiceData, loading, error } = useCanInvoice(ticketId);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingRecipient, setIsEditingRecipient] = useState(false);
  const [recipientData, setRecipientData] = useState({
    taxId: '',
    fiscalName: '',
    address: '',
    city: '',
    postalCode: ''
  });
  const [generatePDF, setGeneratePDF] = useState(true);
  const [sendByEmail, setSendByEmail] = useState(false);
  const [autoAccount, setAutoAccount] = useState(true);

  // Cargar datos del receptor cuando lleguen
  useEffect(() => {
    if (canInvoiceData) {
      if (canInvoiceData.company) {
        setRecipientData({
          taxId: canInvoiceData.company.taxId || '',
          fiscalName: canInvoiceData.company.fiscalName || '',
          address: canInvoiceData.company.address || '',
          city: canInvoiceData.company.city || '',
          postalCode: canInvoiceData.company.postalCode || ''
        });
      } else if (canInvoiceData.client) {
        setRecipientData({
          taxId: canInvoiceData.client.taxId || '',
          fiscalName: `${canInvoiceData.client.firstName} ${canInvoiceData.client.lastName}`,
          address: canInvoiceData.client.address || '',
          city: canInvoiceData.client.city || '',
          postalCode: canInvoiceData.client.postalCode || ''
        });
      }
    }
  }, [canInvoiceData]);

  const handleSubmit = async () => {
    if (!canInvoiceData || !ticketId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientData,
          generatePDF,
          sendByEmail,
          autoAccount,
          seriesId: canInvoiceData.defaultSeriesId
        })
      });

      if (!response.ok) {
        throw new Error('Error al generar la factura');
      }

      // TODO: Mostrar mensaje de éxito
      onClose();
    } catch (error) {
      console.error('Error:', error);
      // TODO: Mostrar mensaje de error
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'CASH': return '💵';
      case 'CARD': return '💳';
      case 'BANK_TRANSFER': return '🏦';
      case 'DEFERRED_PAYMENT': return '📅';
      default: return '💰';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="invoice-conversion-description">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Vista Previa de Factura
          </DialogTitle>
          <p id="invoice-conversion-description" className="sr-only">
            Modal para convertir un ticket en factura con vista previa y edición de datos fiscales
          </p>
        </DialogHeader>

        {/* Estado de carga */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Estado de error */}
        {error && (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-3" />
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Estado cuando no se puede facturar */}
        {!loading && !error && canInvoiceData && !canInvoiceData.canInvoice && (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-3" />
            <p className="text-lg font-medium mb-2">No se puede facturar este ticket</p>
            <p className="text-gray-600">
              {canInvoiceData.message || 'Este ticket no cumple los requisitos para ser facturado'}
            </p>
            {canInvoiceData.reason && (
              <p className="text-sm text-gray-500 mt-2">
                Razón: {canInvoiceData.reason === 'ALREADY_INVOICED' ? 'Ya tiene factura generada' : 
                        canInvoiceData.reason === 'INVALID_STATUS' ? 'Estado no válido' :
                        canInvoiceData.reason}
              </p>
            )}
          </div>
        )}

        {/* Contenido principal - solo si se puede facturar */}
        {!loading && !error && canInvoiceData?.canInvoice && canInvoiceData.ticket && (
          <div className="space-y-6">
            {/* Cabecera con información del documento */}
            <div className="grid grid-cols-2 gap-6">
              {/* Información del emisor */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    EMISOR
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="font-semibold text-lg">
                    {canInvoiceData.legalEntity?.name}
                  </p>
                  {canInvoiceData.legalEntity?.taxIdentifierFields && 
                    Object.entries(canInvoiceData.legalEntity.taxIdentifierFields).map(([key, value]) => (
                      <p key={key} className="text-sm text-muted-foreground">
                        {key}: {String(value)}
                      </p>
                    ))
                  }
                  <p className="text-sm text-muted-foreground">
                    {canInvoiceData.legalEntity?.fullAddress}
                  </p>
                </CardContent>
              </Card>

              {/* Información del receptor */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      RECEPTOR
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingRecipient(!isEditingRecipient)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!isEditingRecipient ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">
                        {recipientData.fiscalName || 'Sin nombre fiscal'}
                      </p>
                      {recipientData.taxId && (
                        <p className="text-sm text-muted-foreground">
                          NIF/CIF: {recipientData.taxId}
                        </p>
                      )}
                      {recipientData.address && (
                        <p className="text-sm text-muted-foreground">
                          {recipientData.address}
                        </p>
                      )}
                      {(recipientData.city || recipientData.postalCode) && (
                        <p className="text-sm text-muted-foreground">
                          {recipientData.postalCode} {recipientData.city}
                        </p>
                      )}
                      {!recipientData.taxId && (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Falta NIF
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="taxId" className="text-xs">NIF/CIF</Label>
                        <Input
                          id="taxId"
                          value={recipientData.taxId}
                          onChange={(e) => setRecipientData({...recipientData, taxId: e.target.value})}
                          placeholder="Ej: B12345678"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fiscalName" className="text-xs">Nombre Fiscal</Label>
                        <Input
                          id="fiscalName"
                          value={recipientData.fiscalName}
                          onChange={(e) => setRecipientData({...recipientData, fiscalName: e.target.value})}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address" className="text-xs">Dirección</Label>
                        <Input
                          id="address"
                          value={recipientData.address}
                          onChange={(e) => setRecipientData({...recipientData, address: e.target.value})}
                          className="h-8"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="postalCode" className="text-xs">C.P.</Label>
                          <Input
                            id="postalCode"
                            value={recipientData.postalCode}
                            onChange={(e) => setRecipientData({...recipientData, postalCode: e.target.value})}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label htmlFor="city" className="text-xs">Ciudad</Label>
                          <Input
                            id="city"
                            value={recipientData.city}
                            onChange={(e) => setRecipientData({...recipientData, city: e.target.value})}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Información de la factura */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Serie</p>
                    <p className="font-medium">
                      {canInvoiceData.availableSeries?.[0]?.code || 'Sin serie'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Número</p>
                    <p className="font-medium">
                      {canInvoiceData.availableSeries?.[0]?.prefix || ''}
                      {canInvoiceData.availableSeries?.[0]?.nextNumber || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha</p>
                    <p className="font-medium">
                      {format(new Date(), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Origen</p>
                    <p className="font-medium">
                      Ticket {canInvoiceData.ticket.ticketNumber}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Líneas de la factura */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Conceptos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Dto.</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {canInvoiceData.ticket.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.service?.name || item.product?.name || 'Sin descripción'}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.discountAmount > 0 && formatCurrency(item.discountAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.vatRate}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.finalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Resumen de totales y pagos */}
            <div className="grid grid-cols-2 gap-6">
              {/* Totales */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Totales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base imponible</span>
                      <span>{formatCurrency(canInvoiceData.ticket.totalAmount)}</span>
                    </div>
                    {canInvoiceData.ticket.discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Descuento</span>
                        <span>-{formatCurrency(canInvoiceData.ticket.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA</span>
                      <span>{formatCurrency(canInvoiceData.ticket.taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(canInvoiceData.ticket.finalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pagos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pagos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {canInvoiceData.ticket.payments?.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span>{getPaymentMethodIcon(payment.paymentMethodDefinition?.type)}</span>
                          <span>{payment.paymentMethodDefinition?.name}</span>
                        </span>
                        <span>{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total pagado</span>
                      <span className="font-medium">{formatCurrency(canInvoiceData.ticket.paidAmount)}</span>
                    </div>
                    {canInvoiceData.ticket.pendingAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pendiente</span>
                        <span className="text-red-600 font-medium">
                          {formatCurrency(canInvoiceData.ticket.pendingAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Opciones adicionales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Opciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="generatePDF" className="text-sm font-medium">
                      Generar PDF
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Crear archivo PDF de la factura
                    </p>
                  </div>
                  <Switch
                    id="generatePDF"
                    checked={generatePDF}
                    onCheckedChange={setGeneratePDF}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sendByEmail" className="text-sm font-medium">
                      Enviar por Email
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enviar factura al email del cliente
                    </p>
                  </div>
                  <Switch
                    id="sendByEmail"
                    checked={sendByEmail}
                    onCheckedChange={setSendByEmail}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoAccount" className="text-sm font-medium">
                      Contabilizar automáticamente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Generar asientos contables
                    </p>
                  </div>
                  <Switch
                    id="autoAccount"
                    checked={autoAccount}
                    onCheckedChange={setAutoAccount}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notas */}
            {canInvoiceData.ticket.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {canInvoiceData.ticket.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="sticky bottom-0 bg-background pt-4 mt-6">
          <div className="flex w-full justify-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            
            {/* Botón para completar datos fiscales */}
            {!loading && !error && canInvoiceData && !canInvoiceData.canInvoice && 
             canInvoiceData.reason === 'INCOMPLETE_FISCAL_DATA' && canInvoiceData.legalEntity?.id && (
              <Button
                variant="default"
                onClick={() => {
                  router.push(`/configuracion/sociedades/editar/${canInvoiceData.legalEntity.id}`);
                  onClose();
                }}
                disabled={isSubmitting}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Completar Datos Fiscales
              </Button>
            )}
            
            {/* Botón de generar factura */}
            {canInvoiceData?.canInvoice && (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !canInvoiceData?.defaultSeriesId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando factura...
                  </>
                ) : (
                  'Generar Factura'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
