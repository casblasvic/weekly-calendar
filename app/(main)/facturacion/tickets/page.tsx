"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Eye, Edit3, Trash2, Lock, PlusCircle, HelpCircle, ArrowLeft, Printer, FileX, Unlock, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useClinic } from '@/contexts/clinic-context';
import { useTicketsQuery, PaginatedTicketsResponse, TicketFilters, useReopenTicketMutation } from '@/lib/hooks/use-ticket-query';
import { TicketStatus, Client, User, CashSessionStatus } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from "@/components/ui/checkbox";

// Definición del tipo para los datos de los tickets (AHORA BASADO EN LA API)
// Este tipo representa UN ticket individual como lo recibimos del hook
type TicketDisplayData = PaginatedTicketsResponse['data'][0];

interface TicketsTableProps {
  title: string;
  ticketsData: PaginatedTicketsResponse['data'] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null | unknown;
  showNif?: boolean;
  activeClinic: { id: string; [key: string]: any } | null | undefined;
  enableSelection?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (ticketId: string, checked: boolean) => void;
  onToggleSelectAll?: (checked: boolean, ticketIds: string[]) => void;
}

// Componente para renderizar una tabla de tickets
const TicketsTable = ({ 
  title, 
  ticketsData,
  isLoading,
  isError,
  error,
  showNif = true,
  activeClinic,
  enableSelection = false,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}: TicketsTableProps) => {
  const router = useRouter();
  const { t } = useTranslation(); // Para internacionalización
  const queryClient = useQueryClient(); // Inicializar queryClient

  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);
  const [ticketIdToReopen, setTicketIdToReopen] = useState<string | null>(null);

  const reopenTicketMutation = useReopenTicketMutation();

  const handleOpenReopenDialog = (ticketId: string) => {
    setTicketIdToReopen(ticketId);
    setIsReopenConfirmOpen(true);
  };

  const handleConfirmReopen = () => {
    if (ticketIdToReopen) {
      // Mostrar toast de "procesando" inmediatamente
      toast({
        title: t('tickets.reopeningSingleTitle'),
        description: t('tickets.reopeningSingleDesc', { ticketId: ticketIdToReopen }),
      });

      reopenTicketMutation.mutate(
        { ticketId: ticketIdToReopen, clinicId: activeClinic?.id },
        {
        onSuccess: (data) => { // data es TicketApiResponse de la mutación del hook
          // El toast de éxito principal se maneja en onSettled del hook useReopenTicketMutation
          // por lo que aquí no necesitamos mostrar otro toast de éxito.
          // Simplemente cerramos el modal.
          setIsReopenConfirmOpen(false);
          setTicketIdToReopen(null);
        },
        onError: (error: any) => {
          // El toast de error general ya se muestra en onSettled del hook si la mutación falla.
          // Aquí podríamos mostrar un toast más específico si es necesario, o simplemente cerrar el modal.
          // Por consistencia con onSuccess, también cerramos el modal aquí.
          // El hook ya se encarga del toast de error.
          toast({ // Aseguramos un toast de error específico si el del hook no es suficiente
            title: t('common.error'),
            description: error?.message || t('tickets.reopenErrorDesc', { ticketId: ticketIdToReopen }),
            variant: 'destructive',
          });
          setIsReopenConfirmOpen(false);
          setTicketIdToReopen(null);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">{title}</h2>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {enableSelection && (
                  <TableHead className="w-8">
                    <Checkbox
                      checked={ticketsData ? ticketsData.filter(t => {
                        const isContabilizadoOAnulado = t.status === TicketStatus.ACCOUNTED || t.status === TicketStatus.VOID;
                        const isCerradoYConCajaNoAbierta = t.status === TicketStatus.CLOSED && t.cashSessionId && t.cashSession?.status !== CashSessionStatus.OPEN;
                        const esReabribleDirectamente = t.status === TicketStatus.CLOSED && (!t.cashSessionId || (t.cashSessionId && t.cashSession?.status === CashSessionStatus.OPEN));
                        return esReabribleDirectamente;
                      }).every(t => selectedIds.includes(t.id)) : false}
                      onCheckedChange={(checked) => {
                        if (onToggleSelectAll) onToggleSelectAll(!!checked, []);
                      }}
                    />
                  </TableHead>
                )}
                <TableHead className="w-[100px]">{t('tickets.table.ticketNumber')}</TableHead>
                <TableHead>{t('tickets.table.date')}</TableHead>
                <TableHead>{t('tickets.table.client')}</TableHead>
                {showNif && <TableHead>{t('tickets.table.nif')}</TableHead>}
                <TableHead className="text-right">{t('tickets.table.total')}</TableHead>
                <TableHead className="text-center w-[120px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, index) => ( // Mostrar 5 filas de Skeletons
                <TableRow key={`skeleton-${index}`}>
                  {enableSelection && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(`skeleton-${index}`)}
                        disabled={true}
                      />
                    </TableCell>
                  )}
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  {showNif && <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>}
                  <TableCell className="text-right"><Skeleton className="h-4 w-[80px] float-right" /></TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center space-x-2">
                      <Skeleton className="w-8 h-8 rounded-md" />
                      <Skeleton className="w-8 h-8 rounded-md" />
                      <Skeleton className="w-8 h-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (isError) {
    // Asegurarnos que error es de tipo Error para acceder a message
    const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
    return <div className="mb-12 text-red-500">{t('common.errorLoadingData')}: {errorMessage}</div>;
  }
  
  // Función para formatear moneda (ejemplo básico, ajustar según necesidades)
  const formatCurrency = (amount: number, currencyCode: string = "MAD") => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currencyCode }).format(amount);
  };

  return (
    <>
    <div className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">{title}</h2>
        <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {enableSelection && (
                <TableHead className="w-8">
                  <Checkbox
                    checked={ticketsData && ticketsData.length > 0 ? ticketsData.filter(t => {
                      const isContabilizadoOAnulado = t.status === TicketStatus.ACCOUNTED || t.status === TicketStatus.VOID;
                      const isCerradoYConCajaNoAbierta = t.status === TicketStatus.CLOSED && t.cashSessionId && t.cashSession?.status !== CashSessionStatus.OPEN;
                      return t.status === TicketStatus.CLOSED && (!t.cashSessionId || (t.cashSessionId && t.cashSession?.status === CashSessionStatus.OPEN)) && !isContabilizadoOAnulado && !isCerradoYConCajaNoAbierta;
                    }).every(t => selectedIds.includes(t.id)) && ticketsData.filter(t => {
                      const isContabilizadoOAnulado = t.status === TicketStatus.ACCOUNTED || t.status === TicketStatus.VOID;
                      const isCerradoYConCajaNoAbierta = t.status === TicketStatus.CLOSED && t.cashSessionId && t.cashSession?.status !== CashSessionStatus.OPEN;
                      return t.status === TicketStatus.CLOSED && (!t.cashSessionId || (t.cashSessionId && t.cashSession?.status === CashSessionStatus.OPEN)) && !isContabilizadoOAnulado && !isCerradoYConCajaNoAbierta;
                    }).length > 0 : false}
                    onCheckedChange={(checked) => {
                      if (onToggleSelectAll && ticketsData) {
                        const reabribleIds = ticketsData.filter(t => {
                          const isContabilizadoOAnulado = t.status === TicketStatus.ACCOUNTED || t.status === TicketStatus.VOID;
                          const isCerradoYConCajaNoAbierta = t.status === TicketStatus.CLOSED && t.cashSessionId && t.cashSession?.status !== CashSessionStatus.OPEN;
                          return t.status === TicketStatus.CLOSED && (!t.cashSessionId || (t.cashSessionId && t.cashSession?.status === CashSessionStatus.OPEN)) && !isContabilizadoOAnulado && !isCerradoYConCajaNoAbierta;
                        }).map(t => t.id);
                        onToggleSelectAll(!!checked, reabribleIds);
                      }
                    }}
                    disabled={!ticketsData || ticketsData.filter(t => {
                      const isContabilizadoOAnulado = t.status === TicketStatus.ACCOUNTED || t.status === TicketStatus.VOID;
                      const isCerradoYConCajaNoAbierta = t.status === TicketStatus.CLOSED && t.cashSessionId && t.cashSession?.status !== CashSessionStatus.OPEN;
                      return t.status === TicketStatus.CLOSED && (!t.cashSessionId || (t.cashSessionId && t.cashSession?.status === CashSessionStatus.OPEN)) && !isContabilizadoOAnulado && !isCerradoYConCajaNoAbierta;
                    }).length === 0}
                  />
                </TableHead>
              )}
              <TableHead className="w-[100px]">{t('tickets.table.ticketNumber')}</TableHead>
              <TableHead>{t('tickets.table.date')}</TableHead>
              <TableHead>{t('tickets.table.client')}</TableHead>
              {showNif && <TableHead>{t('tickets.table.nif')}</TableHead>}
              <TableHead className="text-right">{t('tickets.table.total')}</TableHead>
              <TableHead className="text-center w-[120px]">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {ticketsData && ticketsData.map((ticket: TicketDisplayData) => {
                // --- INICIO LÓGICA DE CANDADOS MEJORADA ---
                const isContabilizadoOAnulado = ticket.status === TicketStatus.ACCOUNTED || ticket.status === TicketStatus.VOID;
                
                // Asumiendo que TicketDisplayData ahora incluye cashSession con su status.
                // Si ticket.cashSession es null/undefined, !ticket.cashSession?.status será true, lo cual es correcto (no hay caja o no está abierta).
                // Si ticket.cashSession existe, se evaluará su status.
                const isCerradoYConCajaNoAbierta = 
                    ticket.status === TicketStatus.CLOSED &&
                    ticket.cashSessionId && 
                    ticket.cashSession?.status !== CashSessionStatus.OPEN; // CashSessionStatus debe importarse o usar el string 'OPEN'

                const esBloqueadoDefinitivo = isContabilizadoOAnulado;
                const esBloqueadoPorCaja = isCerradoYConCajaNoAbierta && !isContabilizadoOAnulado;

                const esReabribleDirectamente = 
                    ticket.status === TicketStatus.CLOSED &&
                    (!ticket.cashSessionId || 
                     (ticket.cashSessionId && ticket.cashSession?.status === CashSessionStatus.OPEN)
                    );
                // --- FIN LÓGICA DE CANDADOS MEJORADA ---

                return (
              <TableRow key={ticket.id}>
                {enableSelection && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(ticket.id)}
                      disabled={!esReabribleDirectamente}
                      onCheckedChange={(checked) => {
                        if (onToggleSelect) onToggleSelect(ticket.id, !!checked);
                      }}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                <TableCell>{format(new Date(ticket.issueDate), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                <TableCell>{ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName}` : t('tickets.noClient')}</TableCell>
                {showNif && <TableCell>{ticket.client?.taxId || '-'}</TableCell>}
                <TableCell className="text-right">{formatCurrency(ticket.finalAmount, ticket.currencyCode)}</TableCell>
                <TableCell className="text-center">
                      <div className="flex justify-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="hover:text-blue-600"
                          onClick={() => router.push(`/facturacion/tickets/editar/${ticket.id}`)}
                      title={t('tickets.actions.viewTooltip')}
                    >
                          <Eye className="w-4 h-4" />
                    </Button>

                        {/* Botón Editar: Solo si el ticket está en estado OPEN */}
                        {ticket.status === TicketStatus.OPEN && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:text-green-600"
                          onClick={() => router.push(`/facturacion/tickets/editar/${ticket.id}`)}
                          title={t('tickets.actions.editTooltip')}
                        >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        )}

                        {/* Botón Anular: Solo si OPEN o CLOSED, y no ACCOUNTED */}
                        {((ticket.status === TicketStatus.OPEN || ticket.status === TicketStatus.CLOSED) && !ticket.cashSessionId) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:text-orange-600"
                            onClick={() => { /* TODO: Implementar llamada a useVoidTicketMutation con confirmación */ alert(`${t('tickets.actions.void')} ${ticket.id}`); }}
                            title={t('tickets.actions.voidTooltip')}
                          >
                            <FileX className="w-4 h-4" />
                        </Button>
                        )}
                        
                        {/* Botón Eliminar: Solo si OPEN y no ACCOUNTED */}
                        {(ticket.status === TicketStatus.OPEN && !ticket.cashSessionId) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:text-red-600"
                            onClick={() => { /* TODO: Implementar llamada a useDeleteTicketMutation con confirmación */ alert(`${t('tickets.actions.delete')} ${ticket.id}`); }}
                          title={t('tickets.actions.deleteTooltip')}
                        >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}

                        {/* --- LÓGICA DE CANDADOS REVISADA --- */}
                        {/* Mostrar Candado INTERACTIVO para Reabrir (Verde/Teal) */}
                        {esReabribleDirectamente && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-teal-500 hover:text-teal-700" 
                            onClick={() => {
                              handleOpenReopenDialog(ticket.id);
                            }}
                            title={t('tickets.actions.reopenTooltip')}
                          >
                            <Unlock className="w-4 h-4" /> 
                        </Button>
                        )}

                        {/* Mostrar Candado FIJO Informativo (Bloqueado por Caja - Violeta) */}
                        {esBloqueadoPorCaja && (
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="text-purple-500 cursor-not-allowed" 
                             title={t('tickets.actions.closedAndSessionNotOpenTooltip')} // Asumir esta clave de traducción existe
                           >
                            <Lock className="w-4 h-4" />
                      </Button>
                        )}
                        
                        {/* Mostrar Candado FIJO Informativo (Bloqueado Definitivo - Gris) */}
                        {esBloqueadoDefinitivo && (
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="text-gray-400 cursor-not-allowed"
                             title={t('tickets.actions.accountedOrVoidTooltip')} // Asumir esta clave de traducción existe
                           >
                            <Lock className="w-4 h-4" />
                      </Button>
                        )}
                        {/* --- FIN LÓGICA DE CANDADOS REVISADA --- */}
                  </div>
                </TableCell>
              </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
      
      <AlertDialog open={isReopenConfirmOpen} onOpenChange={setIsReopenConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tickets.reopenConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tickets.reopenConfirmDescription', { ticketId: ticketIdToReopen })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsReopenConfirmOpen(false)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReopen}
              disabled={reopenTicketMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700" // Estilo para el botón de acción
            >
              {reopenTicketMutation.isPending ? t('common.reopening') : t('common.reopen')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


export default function ListadoTicketsPage() {
  const { t } = useTranslation();
  const { activeClinic } = useClinic();
  const router = useRouter();

  // Estado para la paginación (ejemplo básico, se puede expandir)
  const [pendingPage, setPendingPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const pageSize = 10; // O obtener de configuración

  const pendingTicketsFilters: TicketFilters = {
    clinicId: activeClinic?.id,
    status: [TicketStatus.OPEN], // Solo OPEN. PENDING_PAYMENT es un ticket OPEN con deuda.
    page: pendingPage,
    pageSize,
  };

  const closedTicketsFilters: TicketFilters = {
    clinicId: activeClinic?.id,
    status: [TicketStatus.CLOSED, TicketStatus.ACCOUNTED, TicketStatus.VOID],
    page: closedPage,
    pageSize,
  };

  const {
    data: pendingTicketsData,
    isLoading: isLoadingPending,
    isError: isErrorPending,
    error: errorPending,
  } = useTicketsQuery(pendingTicketsFilters, { enabled: !!activeClinic?.id });

  const {
    data: closedTicketsData,
    isLoading: isLoadingClosed,
    isError: isErrorClosed,
    error: errorClosed,
  } = useTicketsQuery(closedTicketsFilters, { enabled: !!activeClinic?.id });

  const [selectedClosedIds, setSelectedClosedIds] = useState<string[]>([]);

  const handleToggleSelectClosed = (ticketId: string, checked: boolean) => {
    setSelectedClosedIds((prev) => {
      if (checked) return [...prev, ticketId];
      return prev.filter(id => id !== ticketId);
    });
  };

  const handleToggleSelectAllClosed = (checked: boolean, ticketIdsToToggle: string[]) => {
    if (!closedTicketsData?.data) return;
    setSelectedClosedIds(checked ? ticketIdsToToggle : []);
  };

  const reopenTicketMutation = useReopenTicketMutation();
  const queryClient = useQueryClient(); // Asegúrate que queryClient está disponible

  const handleBulkReopen = async () => {
    if (selectedClosedIds.length === 0) {
      toast({
        title: t("common.noSelection"),
        description: t("tickets.selectTicketsToReopen"),
        variant: "default",
      });
      return;
    }

    toast({
      title: t("tickets.reopeningInProgressTitle"),
      description: t("tickets.reopeningInProgressDesc", { count: selectedClosedIds.length }),
    });

    let successCount = 0;
    let errorCount = 0;

    for (const ticketId of selectedClosedIds) {
      try {
        await reopenTicketMutation.mutateAsync({ ticketId, clinicId: activeClinic?.id });
        successCount++;
      } catch (error) {
        console.error(`Error reabriendo ticket ${ticketId}:`, error);
        errorCount++;
      }
    }

    setSelectedClosedIds([]); // Limpiar selección

    if (errorCount > 0) {
      toast({
        title: t("tickets.bulkReopenSummaryErrorTitle"),
        description: t("tickets.bulkReopenSummaryErrorDesc", { success: successCount, error: errorCount }),
        variant: "default",
      });
    } else {
      toast({
        title: t("tickets.bulkReopenSummarySuccessTitle"),
        description: t("tickets.bulkReopenSummarySuccessDesc", { count: successCount }),
      });
    }
    
    // Invalidar queries relevantes para asegurar que la UI está fresca
    if (activeClinic?.id) {
      queryClient.invalidateQueries({ queryKey: ['openTicketsCount', activeClinic.id, 'OPEN']});
    }
    queryClient.invalidateQueries({ queryKey: ['tickets'] }); // Invalida todas las listas de tickets
  };

  // --- FOOTER CON BOTONES ---
  const FooterButtons = () => {
    const todayStr = new Date().toISOString().substring(0,10); // YYYY-MM-DD
    return (
      <footer className="fixed bottom-0 z-40 border-t bg-white/80 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
        style={{ left: 'var(--sidebar-width, 16rem)', right: 0 }}>
        <div className="container mx-auto flex items-center justify-between py-2 px-4">
          {/* Izquierda */}
          <div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs text-gray-700 border-gray-300 h-8 hover:bg-gray-50"
              onClick={() => router.push(`/caja/${todayStr}?clinicId=${activeClinic?.id || ''}`)}
            >
              <Wallet className="h-3.5 w-3.5" /> {t('cash.viewCash', 'Ver caja')}
            </Button>
          </div>

          {/* Derecha */}
          <div className="flex items-center gap-2">
            {/* Botón nuevo abono - deshabilitado */}
            <Button variant="secondary" size="sm" disabled className="h-8 text-xs">
              {t('tickets.newCreditNote', 'Nuevo abono')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/facturacion/tickets/nuevo')} className="h-8 text-xs">
              <PlusCircle className="h-3.5 w-3.5 mr-1" /> {t('tickets.newTicket', 'Nuevo ticket')}
            </Button>
            <Button variant="default" size="sm" className="h-8 text-xs" onClick={() => alert(t('common.help_not_implemented'))}>
              {t('common.help')}
            </Button>
          </div>
        </div>
      </footer>
    );
  };

  if (!activeClinic) {
    return (
      <div className="p-4">
        <p>{t("common.selectClinicToViewData")}</p>
      </div>
    );
  }

  return (
    <div className="container relative p-4 mx-auto md:p-6 lg:p-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t('tickets.pageTitle')}</h1>
        {/* Los botones de Acción Globales se moverán al footer */}
      </div>

      {/* Tabla de Tickets Pendientes */}
      <TicketsTable 
        title={t('tickets.pendingTickets')}
        ticketsData={pendingTicketsData?.data}
        isLoading={isLoadingPending}
        isError={isErrorPending}
        error={errorPending}
        activeClinic={activeClinic}
      />

      {/* Tabla de Tickets Cerrados/Contabilizados */}
      <TicketsTable 
        title={t('tickets.closedTickets')}
        ticketsData={closedTicketsData?.data}
        isLoading={isLoadingClosed}
        isError={isErrorClosed}
        error={errorClosed}
        activeClinic={activeClinic}
        enableSelection={true}
        selectedIds={selectedClosedIds}
        onToggleSelect={handleToggleSelectClosed}
        onToggleSelectAll={handleToggleSelectAllClosed}
      />

      {/* Botón Bulk Reopen */}
      <div className="flex justify-end mt-4">
        <Button
          disabled={selectedClosedIds.length === 0 || reopenTicketMutation.isPending}
          onClick={handleBulkReopen}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {t('tickets.reopenSelected')}
        </Button>
      </div>

      <FooterButtons />
    </div>
  );
} 