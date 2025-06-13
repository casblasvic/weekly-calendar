'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Loader2, 
  Mail, 
  FileText, 
  Calculator, 
  User, 
  Building2, 
  AlertCircle, 
  CheckCircle, 
  Check,
  X,
  Edit2,
  CreditCard,
  Send,
  ChevronDown,
  MessageSquare,
  CalendarIcon,
  Info,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { BorderBeam } from '@/components/ui/border-beam';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface InvoiceConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
}

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountPercentage: number;
  discountNotes?: string;
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  description?: string;
}

export default function InvoiceConversionModal({
  isOpen,
  onClose,
  ticketId
}: InvoiceConversionModalProps) {
  const { t } = useTranslation();
  const { data: canInvoiceData, loading, error } = useCanInvoice(ticketId);
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState<string | null>(null);
  
  // Estados para edición
  const [isEditingRecipient, setIsEditingRecipient] = useState(false);
  const [isSavingRecipient, setIsSavingRecipient] = useState(false);
  const [hasRecipientChanges, setHasRecipientChanges] = useState(false);
  const [originalRecipientData, setOriginalRecipientData] = useState({
    taxId: '',
    fiscalName: '',
    address: '',
    city: '',
    postalCode: '',
    countryCode: 'ES'
  });
  const [recipientData, setRecipientData] = useState({
    taxId: '',
    fiscalName: '',
    address: '',
    city: '',
    postalCode: '',
    countryCode: 'ES'
  });
  
  // Estados para edición del emisor
  const [isEditingLegalEntity, setIsEditingLegalEntity] = useState(false);
  const [isSavingLegalEntity, setIsSavingLegalEntity] = useState(false);
  const [hasLegalEntityChanges, setHasLegalEntityChanges] = useState(false);
  const [originalLegalEntityData, setOriginalLegalEntityData] = useState({
    name: '',
    taxId: '',
    address: '',
    email: '',
    phone: ''
  });
  
  // Datos de la sociedad
  const [legalEntityData, setLegalEntityData] = useState({
    name: '',
    taxId: '',
    address: '',
    email: '',
    phone: ''
  });
  
  // Líneas de factura editables
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<{ name: string; description?: string }>({ name: '', description: '' });
  
  // Notas de la factura
  const [invoiceNotes, setInvoiceNotes] = useState('');
  
  // Estado de generación
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(true); 
  const [issueDate, setIssueDate] = useState<Date>(new Date()); 
  
  // Calcular límites de fecha basados en el ticket
  const ticketDate = canInvoiceData?.ticket?.issueDate ? new Date(canInvoiceData.ticket.issueDate) : new Date();
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Establecer al final del día para comparaciones correctas
  
  // Procesar líneas y pagos cuando cambie canInvoiceData
  const { processedItems, paymentInfo } = useMemo(() => {
    if (!canInvoiceData?.ticket) {
      return { processedItems: [], paymentInfo: { nonDeferredPayments: [], deferredAmount: 0, totalPaid: 0, paidPercentage: 0 } };
    }
    
    // Separar pagos aplazados de los demás
    const payments = canInvoiceData.ticket.payments || [];
    const nonDeferredPayments = payments.filter(
      (payment: any) => payment.paymentMethodDefinition?.type !== 'DEFERRED_PAYMENT' && 
                       payment.paymentMethodDefinition?.code !== 'SYS_DEFERRED_PAYMENT'
    );
    const deferredPayments = payments.filter(
      (payment: any) => payment.paymentMethodDefinition?.type === 'DEFERRED_PAYMENT' || 
                       payment.paymentMethodDefinition?.code === 'SYS_DEFERRED_PAYMENT'
    );
    
    // Calcular totales de pagos
    const totalPaid = nonDeferredPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const deferredAmount = deferredPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    
    // Calcular el total del ticket
    const ticketTotal = (canInvoiceData.ticket.items || []).reduce((sum: number, item: any) => {
      const finalPrice = Number(item.finalPrice) || 0;
      const vatAmount = Number(item.vatAmount) || 0;
      return sum + finalPrice + vatAmount;
    }, 0);
    
    // Calcular el porcentaje pagado (sin incluir aplazados)
    const paidPercentage = ticketTotal > 0 ? totalPaid / ticketTotal : 0;
    
    // Procesar items proporcionalmente al pago realizado
    const items = canInvoiceData.ticket.items || [];
    const processedItems = items.map((item: any) => {
      // Obtener valores del item
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const vatAmount = Number(item.vatAmount) || 0;
      const finalPrice = Number(item.finalPrice) || 0;
      const manualDiscountAmount = Number(item.manualDiscountAmount) || 0;
      const manualDiscountPercentage = Number(item.manualDiscountPercentage) || 0;
      const promotionDiscountAmount = Number(item.promotionDiscountAmount) || 0;
      
      // Aplicar proporción pagada a los importes
      const subtotalSinIva = finalPrice * paidPercentage;
      const vatAmountProportional = vatAmount * paidPercentage;
      const totalConIva = subtotalSinIva + vatAmountProportional;
      
      // Calcular tasa de IVA
      const vatRate = subtotalSinIva > 0 ? Math.round((vatAmountProportional / subtotalSinIva) * 100 * 100) / 100 : 21;
      
      // Calcular el descuento total
      const totalDiscount = (manualDiscountAmount + promotionDiscountAmount) * paidPercentage;
      
      // Obtener el nombre del concepto
      const conceptName = item.description || 
        item.concept || 
        item.service?.name || 
        item.product?.name || 
        'Concepto sin nombre';
      
      return {
        id: item.id,
        name: conceptName,
        description: item.service?.description || item.product?.description || '',
        quantity: quantity,
        unitPrice: unitPrice,
        discount: totalDiscount,
        discountPercentage: manualDiscountPercentage,
        discountNotes: item.discountNotes || '',
        vatRate: vatRate,
        subtotal: subtotalSinIva,
        vatAmount: vatAmountProportional,
        total: totalConIva
      };
    });
    
    return {
      processedItems,
      paymentInfo: {
        nonDeferredPayments,
        deferredAmount,
        totalPaid,
        paidPercentage
      }
    };
  }, [canInvoiceData]);

  useEffect(() => {
    if (canInvoiceData && processedItems.length > 0) {
      setLineItems(processedItems);
    }
  }, [processedItems, canInvoiceData]);

  useEffect(() => {
    if (canInvoiceData) {
      // Establecer fecha de emisión = fecha del ticket
      if (canInvoiceData.ticket?.issueDate) {
        const ticketIssueDate = new Date(canInvoiceData.ticket.issueDate);
        setIssueDate(ticketIssueDate);
      }
      
      // Cargar datos del receptor
      if (canInvoiceData.company) {
        setOriginalRecipientData({
          taxId: canInvoiceData.company.taxId || '',
          fiscalName: canInvoiceData.company.fiscalName || '',
          address: canInvoiceData.company.address || '',
          city: canInvoiceData.company.city || '',
          postalCode: canInvoiceData.company.postalCode || '',
          countryCode: 'ES'
        });
        setRecipientData({
          taxId: canInvoiceData.company.taxId || '',
          fiscalName: canInvoiceData.company.fiscalName || '',
          address: canInvoiceData.company.address || '',
          city: canInvoiceData.company.city || '',
          postalCode: canInvoiceData.company.postalCode || '',
          countryCode: 'ES'
        });
      } else if (canInvoiceData.person) {
        setOriginalRecipientData({
          taxId: canInvoiceData.person.taxId || '',
          fiscalName: `${canInvoiceData.person.firstName} ${canInvoiceData.person.lastName}`,
          address: canInvoiceData.person.address || '',
          city: canInvoiceData.person.city || '',
          postalCode: canInvoiceData.person.postalCode || '',
          countryCode: 'ES'
        });
        setRecipientData({
          taxId: canInvoiceData.person.taxId || '',
          fiscalName: `${canInvoiceData.person.firstName} ${canInvoiceData.person.lastName}`,
          address: canInvoiceData.person.address || '',
          city: canInvoiceData.person.city || '',
          postalCode: canInvoiceData.person.postalCode || '',
          countryCode: 'ES'
        });
      }
      
      // Cargar datos de la sociedad
      if (canInvoiceData.legalEntity) {
        setOriginalLegalEntityData({
          name: canInvoiceData.legalEntity.name || '',
          taxId: canInvoiceData.legalEntity.taxIdentifierFields?.ICE || 
                 canInvoiceData.legalEntity.taxIdentifierFields?.NIF || '',
          address: canInvoiceData.legalEntity.fullAddress || '',
          email: canInvoiceData.legalEntity.email || '',
          phone: canInvoiceData.legalEntity.phone || ''
        });
        setLegalEntityData({
          name: canInvoiceData.legalEntity.name || '',
          taxId: canInvoiceData.legalEntity.taxIdentifierFields?.ICE || 
                 canInvoiceData.legalEntity.taxIdentifierFields?.NIF || '',
          address: canInvoiceData.legalEntity.fullAddress || '',
          email: canInvoiceData.legalEntity.email || '',
          phone: canInvoiceData.legalEntity.phone || ''
        });
      }
    }
  }, [canInvoiceData]);

  const handleSubmit = async () => {
    if (!canInvoiceData || !ticketId) return;

    await generateInvoice();
  };

  const handleGenerateInvoice = () => {
    generateInvoice();
  };

  const handleDownloadPDF = () => {
    console.log('Descargando PDF de la factura...');
    // TODO: Implementar descarga de PDF
  };

  const handleSendInvoice = (method: 'email' | 'whatsapp') => {
    console.log(`Enviando factura por ${method}`);
    // TODO: Implementar envío de factura
  };

  const generateInvoice = async () => {
    setIsGenerating(true);
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}/convert-to-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seriesId: canInvoiceData?.defaultSeriesId || '',
          issueDate: issueDate.toISOString(),
          receiverType: recipientData.taxId ? 'B2B' : 'B2C',
          companyId: canInvoiceData?.person?.company?.id,
          notes: invoiceNotes,
          sendByEmail: false,
          generatePDF: true,
          autoAccount: true,
          // Datos actualizados del receptor
          receiverData: {
            taxId: recipientData.taxId,
            fiscalName: recipientData.fiscalName,
            address: `${recipientData.address}, ${recipientData.city} ${recipientData.postalCode}`.trim(),
            countryCode: recipientData.countryCode
          },
          showPaymentInfo: showPaymentInfo 
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar la factura');
      }

      const data = await response.json();
      setGeneratedInvoiceId(data.invoice.id);
      setInvoiceGenerated(true);
      toast({
        title: t("Factura generada"),
        description: t(`Factura ${data.invoice.number} generada correctamente`),
      });
    } catch (error) {
      console.error('Error generando factura:', error);
      toast({
        title: t("Error"),
        description: t("No se pudo generar la factura"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsSubmitting(false);
    }
  };

  // Función para actualizar los datos del receptor y detectar cambios
  const updateRecipientData = (field: string, value: string) => {
    const newData = { ...recipientData, [field]: value };
    setRecipientData(newData);
    
    // Verificar si hay cambios comparando con los datos originales
    const hasChanges = Object.keys(newData).some(key => 
      newData[key as keyof typeof newData] !== originalRecipientData[key as keyof typeof originalRecipientData]
    );
    setHasRecipientChanges(hasChanges);
  };

  // Función para cerrar edición del receptor
  const handleCloseRecipientEdit = async (save: boolean) => {
    if (save && hasRecipientChanges) {
      setIsSavingRecipient(true);
      // Simular un pequeño delay para el spinner
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Guardar cambios (actualizar los datos originales)
      setOriginalRecipientData({...recipientData, countryCode: 'ES'});
      setHasRecipientChanges(false);
      setIsSavingRecipient(false);
      
      // TODO: Implementar llamada API cuando esté disponible
    }
    setIsEditingRecipient(false);
  };

  // Función para restablecer datos del receptor
  const handleRestoreRecipientData = () => {
    setRecipientData({
      taxId: originalRecipientData.taxId,
      fiscalName: originalRecipientData.fiscalName,
      address: originalRecipientData.address,
      city: originalRecipientData.city,
      postalCode: originalRecipientData.postalCode,
      countryCode: originalRecipientData.countryCode
    });
    setHasRecipientChanges(false);
  };

  // Función para actualizar los datos del emisor y detectar cambios
  const updateLegalEntityData = (field: string, value: string) => {
    const newData = { ...legalEntityData, [field]: value };
    setLegalEntityData(newData);
    
    // Verificar si hay cambios comparando con los datos originales
    const hasChanges = Object.keys(newData).some(key => 
      newData[key as keyof typeof newData] !== originalLegalEntityData[key as keyof typeof originalLegalEntityData]
    );
    setHasLegalEntityChanges(hasChanges);
  };

  // Función para cerrar edición del emisor
  const handleCloseLegalEntityEdit = async (save: boolean) => {
    if (save && hasLegalEntityChanges) {
      setIsSavingLegalEntity(true);
      // Simular un pequeño delay para el spinner
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Guardar cambios (actualizar los datos originales)
      setOriginalLegalEntityData({...legalEntityData});
      setHasLegalEntityChanges(false);
      setIsSavingLegalEntity(false);
      
      // TODO: Implementar llamada API cuando esté disponible
    }
    setIsEditingLegalEntity(false);
  };

  // Función para restablecer datos del emisor
  const handleRestoreLegalEntityData = () => {
    setLegalEntityData({...originalLegalEntityData});
    setHasLegalEntityChanges(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col">
        <BorderBeam size={250} duration={12} delay={9} />
        
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">{t("Convertir Ticket a Factura")}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {t("Revisa y confirma los datos para generar la factura")}
          </DialogDescription>
        </div>
        
        {/* Contenido principal con scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Vista pre-generación */}
          {!loading && !error && canInvoiceData && !invoiceGenerated && (
            <>
              {/* Información del Emisor y Receptor en 2 columnas */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Emisor (Sociedad) */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {t("Emisor")}
                      </CardTitle>
                      {isEditingLegalEntity ? (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCloseLegalEntityEdit(false)}
                          >
                            {t("Cerrar")}
                          </Button>
                          <Button
                            size="sm"
                            disabled={!hasLegalEntityChanges || isSavingLegalEntity}
                            onClick={() => handleCloseLegalEntityEdit(true)}
                          >
                            {isSavingLegalEntity ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("Guardando...")}
                              </>
                            ) : t("Guardar")}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {hasLegalEntityChanges && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRestoreLegalEntityData}
                              title={t("Restablecer datos originales")}
                              className="text-violet-600 hover:text-violet-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingLegalEntity(true)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            {t("Editar")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isEditingLegalEntity ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">{t("Razón Social")}</Label>
                          <Input
                            value={legalEntityData.name}
                            onChange={(e) => updateLegalEntityData('name', e.target.value)}
                            placeholder={t("Nombre o razón social")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("NIF/CIF")}</Label>
                          <Input
                            value={legalEntityData.taxId}
                            onChange={(e) => updateLegalEntityData('taxId', e.target.value)}
                            placeholder={t("Identificador fiscal")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("Dirección")}</Label>
                          <Input
                            value={legalEntityData.address}
                            onChange={(e) => updateLegalEntityData('address', e.target.value)}
                            placeholder={t("Dirección completa")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("Email")}</Label>
                          <Input
                            value={legalEntityData.email}
                            onChange={(e) => updateLegalEntityData('email', e.target.value)}
                            placeholder={t("Correo electrónico")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("Teléfono")}</Label>
                          <Input
                            value={legalEntityData.phone}
                            onChange={(e) => updateLegalEntityData('phone', e.target.value)}
                            placeholder={t("Número de teléfono")}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">{t("Razón Social")}</p>
                          <p className="font-medium">{legalEntityData.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{t("NIF/CIF")}</p>
                          <p className="font-medium">{legalEntityData.taxId || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{t("Dirección")}</p>
                          <p className="text-xs">{legalEntityData.address || '-'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-muted-foreground text-xs">{t("Email")}</p>
                            <p className="text-xs">{legalEntityData.email || '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{t("Teléfono")}</p>
                            <p className="text-xs">{legalEntityData.phone || '-'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Receptor */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t("Receptor")}
                      </CardTitle>
                      {isEditingRecipient ? (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCloseRecipientEdit(false)}
                          >
                            {t("Cerrar")}
                          </Button>
                          <Button
                            size="sm"
                            disabled={!hasRecipientChanges || isSavingRecipient}
                            onClick={() => handleCloseRecipientEdit(true)}
                          >
                            {isSavingRecipient ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("Guardando...")}
                              </>
                            ) : t("Guardar")}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {hasRecipientChanges && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRestoreRecipientData}
                              title={t("Restablecer datos originales")}
                              className="text-violet-600 hover:text-violet-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingRecipient(true)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            {t("Editar")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isEditingRecipient ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">{t("NIF/CIF")}</Label>
                          <Input
                            value={recipientData.taxId}
                            onChange={(e) => updateRecipientData('taxId', e.target.value)}
                            placeholder={t("Identificador fiscal")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("Razón Social")}</Label>
                          <Input
                            value={recipientData.fiscalName}
                            onChange={(e) => updateRecipientData('fiscalName', e.target.value)}
                            placeholder={t("Nombre o razón social")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("Dirección")}</Label>
                          <Input
                            value={recipientData.address}
                            onChange={(e) => updateRecipientData('address', e.target.value)}
                            placeholder={t("Dirección completa")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("Ciudad")}</Label>
                          <Input
                            value={recipientData.city}
                            onChange={(e) => updateRecipientData('city', e.target.value)}
                            placeholder={t("Ciudad")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("Código Postal")}</Label>
                          <Input
                            value={recipientData.postalCode}
                            onChange={(e) => updateRecipientData('postalCode', e.target.value)}
                            placeholder={t("Código postal")}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">{t("NIF/CIF")}</p>
                          <p className="font-medium">{recipientData.taxId || t("Cliente genérico")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{t("Razón Social")}</p>
                          <p className="font-medium">{recipientData.fiscalName || t("Consumidor final")}</p>
                        </div>
                        {recipientData.address && (
                          <>
                            <div>
                              <p className="text-muted-foreground text-xs">{t("Dirección")}</p>
                              <p className="text-xs">{recipientData.address}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-muted-foreground text-xs">{t("Ciudad")}</p>
                                <p className="text-xs">{recipientData.city || '-'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">{t("C.P.")}</p>
                                <p className="text-xs">{recipientData.postalCode || '-'}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Información del ticket y pagos */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Datos del Ticket */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t("Datos del Ticket")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("Ticket #")}</span>
                        <span className="font-medium">{canInvoiceData.ticket.ticketNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("Fecha")}</span>
                        <span>
                          {canInvoiceData.ticket.issueDate && !isNaN(new Date(canInvoiceData.ticket.issueDate).getTime())
                            ? format(new Date(canInvoiceData.ticket.issueDate), 'dd/MM/yyyy HH:mm')
                            : t("Fecha no disponible")
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("Estado")}</span>
                        <Badge variant={canInvoiceData.ticket.status === 'CLOSED' ? 'default' : 'secondary'}>
                          {canInvoiceData.ticket.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Información de Pago */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {t("Información de Pago")}
                      </span>
                      {/* Estado de pago */}
                      {canInvoiceData.ticket.pendingAmount > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {t("Pendiente")}
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 text-white text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t("Pagado")}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {canInvoiceData.ticket.payments && canInvoiceData.ticket.payments.length > 0 ? (
                        <>
                          <div className="space-y-1">
                            {paymentInfo.nonDeferredPayments.map((payment: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {payment.paymentMethodDefinition?.name || t("Método")}
                                </span>
                                <span className="font-medium">{formatCurrency(payment.amount)}</span>
                              </div>
                            ))}
                          </div>
                          <Separator className="my-2" />
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm font-medium">
                              <span>{t("Total pagado")}</span>
                              <span className="text-green-600">
                                {formatCurrency(paymentInfo.totalPaid)}
                              </span>
                            </div>
                            {canInvoiceData.ticket.pendingAmount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-red-600">{t("Pendiente")}</span>
                                <span className="font-medium text-red-600">
                                  {formatCurrency(canInvoiceData.ticket.pendingAmount)}
                                </span>
                              </div>
                            )}
                            {paymentInfo.deferredAmount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-orange-600">{t("Aplazado")}</span>
                                <span className="font-medium text-orange-600">
                                  {formatCurrency(paymentInfo.deferredAmount)}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-sm">{t("Sin información de pago")}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Serie y fecha de emisión */}
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("Configuración de Factura")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs mb-1 block">{t("Serie de Facturación")}</Label>
                      <div className="rounded-md border border-input bg-muted px-3 py-2">
                        <p className="text-sm font-medium">
                          {canInvoiceData?.availableSeries?.find((s: any) => s.id === canInvoiceData?.defaultSeriesId)?.prefix || t("Sin serie")}
                          {canInvoiceData?.availableSeries?.find((s: any) => s.id === canInvoiceData?.defaultSeriesId)?.description ? 
                            ` - ${canInvoiceData?.availableSeries?.find((s: any) => s.id === canInvoiceData?.defaultSeriesId)?.description}` : 
                            ''
                          }
                        </p>
                      </div>
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          {t("Centro:")} <span className="font-medium">{canInvoiceData?.ticket?.clinic?.name || t("Sin centro")}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("La factura se generará en:")} <span className="font-medium">{canInvoiceData?.legalEntity?.name || t("Entidad legal")}</span>
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">{t("Fecha de Emisión")}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !issueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(issueDate, 'PPP', { locale: es })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={issueDate}
                            onSelect={(date) => date && setIssueDate(date)}
                            disabled={(date) => {
                              const dateToCheck = new Date(date);
                              dateToCheck.setHours(0, 0, 0, 0);
                              
                              const minDate = new Date(ticketDate);
                              minDate.setHours(0, 0, 0, 0);
                              
                              const maxDate = new Date(today);
                              maxDate.setHours(23, 59, 59, 999);
                              
                              // No permitir fechas futuras
                              if (dateToCheck > maxDate) return true;
                              // No permitir fechas anteriores al ticket
                              if (dateToCheck < minDate) return true;
                              return false;
                            }}
                            locale={es}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          {t("La fecha debe coincidir con la operación real")}
                        </p>
                        {issueDate.toDateString() !== ticketDate.toDateString() && (
                          <Alert className="py-1 px-2">
                            <AlertDescription className="text-xs">
                              <strong>{t("Atención:")}</strong> {t("La fecha difiere del ticket original")} ({format(ticketDate, 'dd/MM/yyyy')}). 
                              {t("Esto puede tener implicaciones fiscales.")}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Líneas de factura */}
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("Líneas de Factura")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[35%]">{t("Concepto")}</TableHead>
                        <TableHead className="text-right w-[8%]">{t("Cant.")}</TableHead>
                        <TableHead className="text-right w-[12%]">{t("Precio")}</TableHead>
                        <TableHead className="text-right w-[10%]">{t("Dto.")}</TableHead>
                        <TableHead className="text-right w-[12%]">{t("Subtotal")}</TableHead>
                        <TableHead className="text-right w-[8%]">{t("IVA")}</TableHead>
                        <TableHead className="text-right w-[15%]">{t("Total")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => {
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              {editingLineId === item.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={item.name}
                                    onChange={(e) => {
                                      setLineItems(items => 
                                        items.map(i => 
                                          i.id === item.id 
                                            ? {...i, name: e.target.value}
                                            : i
                                        )
                                      );
                                    }}
                                    className="font-medium"
                                  />
                                  <Textarea
                                    value={item.description || ''}
                                    onChange={(e) => {
                                      setLineItems(items => 
                                        items.map(i => 
                                          i.id === item.id 
                                            ? {...i, description: e.target.value}
                                            : i
                                        )
                                      );
                                    }}
                                    placeholder={t("Descripción adicional (opcional)...")}
                                    className="text-sm"
                                    rows={2}
                                  />
                                  {item.discountNotes && (
                                    <Textarea
                                      value={item.discountNotes}
                                      onChange={(e) => {
                                        setLineItems(items => 
                                          items.map(i => 
                                            i.id === item.id 
                                              ? {...i, discountNotes: e.target.value}
                                              : i
                                          )
                                        );
                                      }}
                                      placeholder={t("Notas de descuento...")}
                                      className="text-sm italic"
                                      rows={1}
                                    />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingLineId(null);
                                      setEditingLine({ name: '', description: '' });
                                    }}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    {t("Guardar")}
                                  </Button>
                                </div>
                              ) : (
                                <div
                                  className="cursor-pointer group relative"
                                  onClick={() => {
                                    setEditingLineId(item.id);
                                    setEditingLine({ name: item.name, description: item.description });
                                  }}
                                >
                                  <div className="pr-6">
                                    <p className="font-medium group-hover:text-primary transition-colors">
                                      {item.name}
                                    </p>
                                    {item.description && (
                                      <p className="text-sm text-muted-foreground mt-0.5">
                                        {item.description}
                                      </p>
                                    )}
                                    {item.discountNotes && (
                                      <p className="text-xs text-muted-foreground mt-1 italic">
                                        {item.discountNotes}
                                      </p>
                                    )}
                                  </div>
                                  <Edit2 className="absolute right-0 top-0 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 left-0">
                                    {t("Haz clic para editar")}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {item.discount > 0 ? (
                                <div>
                                  <p className="line-through text-muted-foreground text-xs">
                                    {formatCurrency(item.unitPrice)}
                                  </p>
                                  <p>{formatCurrency(item.unitPrice - item.discount / item.quantity)}</p>
                                </div>
                              ) : (
                                formatCurrency(item.unitPrice)
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.discount > 0 ? (
                                <div>
                                  <p>{formatCurrency(item.discount)}</p>
                                  {item.discountPercentage > 0 && (
                                    <p className="text-xs text-muted-foreground">({item.discountPercentage}%)</p>
                                  )}
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                            <TableCell className="text-right">{item.vatRate}%</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Totales */}
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("Base imponible")}</span>
                      <span>{formatCurrency(lineItems.reduce((sum, item) => sum + item.subtotal, 0))}</span>
                    </div>
                    {lineItems.some(item => item.discount > 0) && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("Descuentos")}</span>
                        <span className="text-red-600">-{formatCurrency(lineItems.reduce((sum, item) => sum + item.discount, 0))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("IVA")}</span>
                      <span>{formatCurrency(lineItems.reduce((sum, item) => sum + item.vatAmount, 0))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>{t("Total Factura")}</span>
                      <span>{formatCurrency(lineItems.reduce((sum, item) => sum + item.total, 0))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notas de la factura */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("Notas de la Factura")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    placeholder={t("Añade notas o información adicional que aparecerá al pie de la factura...")}
                    className="min-h-[100px]"
                    rows={4}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Vista post-generación */}
          {invoiceGenerated && (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("La factura ha sido generada correctamente.")}
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-6">
                    <div className="space-y-2">
                      <FileText className="h-16 w-16 mx-auto text-primary" />
                      <h3 className="text-lg font-semibold">{t("Factura Generada")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("¿Qué deseas hacer ahora?")}
                      </p>
                    </div>

                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={handleDownloadPDF}
                        className="gap-2"
                      >
                        <Download className="h-5 w-5" />
                        {t("Descargar PDF")}
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Send className="h-5 w-5" />
                            {t("Enviar")}
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleSendInvoice('email')}>
                            <Mail className="h-4 w-4 mr-2" />
                            {t("Por Email")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendInvoice('whatsapp')}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {t("Por WhatsApp")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Footer con botones - SIEMPRE visible */}
        <div className="p-6 pt-4 border-t bg-background shrink-0">
          {!invoiceGenerated && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showPaymentInfo"
                  checked={showPaymentInfo}
                  onCheckedChange={(checked) => setShowPaymentInfo(checked as boolean)}
                />
                <label
                  htmlFor="showPaymentInfo"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {t("Incluir información de pago en la factura")}
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t("Cancelar")}
                </Button>
                <Button 
                  onClick={handleGenerateInvoice}
                  disabled={!canInvoiceData || loading || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("Generando...")}
                    </>
                  ) : t("Generar Factura")}
                </Button>
              </div>
            </div>
          )}
          
          {invoiceGenerated && (
            <div className="flex justify-end">
              <Button onClick={onClose}>
                {t("Cerrar")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
