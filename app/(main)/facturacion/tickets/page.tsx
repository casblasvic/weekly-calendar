"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Eye, Edit3, Trash2, Lock, PlusCircle, HelpCircle, ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useClinic } from '@/contexts/clinic-context';
import { useTicketsQuery, PaginatedTicketsResponse, TicketFilters } from '@/lib/hooks/use-ticket-query';
import { TicketStatus, Client, User } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Definición del tipo para los datos de los tickets (AHORA BASADO EN LA API)
// Este tipo representa UN ticket individual como lo recibimos del hook
type TicketDisplayData = PaginatedTicketsResponse['data'][0];

// Componente para renderizar una tabla de tickets
const TicketsTable = ({ 
  title, 
  ticketsData,
  isLoading,
  isError,
  error,
  showNif = true,
}: { 
  title: string; 
  ticketsData: PaginatedTicketsResponse['data'] | undefined; 
  isLoading: boolean;
  isError: boolean;
  error: Error | null | unknown; // Ajustar el tipo de error según lo que devuelve React Query
  showNif?: boolean;
}) => {
  const router = useRouter();
  const { t } = useTranslation(); // Para internacionalización

  if (isLoading) {
    return (
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  {showNif && <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>}
                  <TableCell className="text-right"><Skeleton className="h-4 w-[80px] float-right" /></TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center space-x-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
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
  
  if (!ticketsData || ticketsData.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p>{t('tickets.noTicketsFound')}</p>
      </div>
    );
  }

  // Función para formatear moneda (ejemplo básico, ajustar según necesidades)
  const formatCurrency = (amount: number, currencyCode: string = "MAD") => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currencyCode }).format(amount);
  };
  
  return (
    <div className="mb-12">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">{t('tickets.table.ticketNumber')}</TableHead>
              <TableHead>{t('tickets.table.date')}</TableHead>
              <TableHead>{t('tickets.table.client')}</TableHead>
              {showNif && <TableHead>{t('tickets.table.nif')}</TableHead>}
              <TableHead className="text-right">{t('tickets.table.total')}</TableHead>
              <TableHead className="text-center w-[120px]">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsData.map((ticket: TicketDisplayData) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                <TableCell>{format(new Date(ticket.issueDate), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                <TableCell>{ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName}` : t('tickets.noClient')}</TableCell>
                {showNif && <TableCell>{ticket.client?.taxId || '-'}</TableCell>}
                <TableCell className="text-right">{formatCurrency(ticket.finalAmount, ticket.currencyCode)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="hover:text-blue-600"
                      onClick={() => alert(`${t('tickets.actions.view')} ${ticket.id}`)} // TODO: Implementar vista real
                      title={t('tickets.actions.viewTooltip')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {ticket.status !== TicketStatus.PAID && ticket.status !== TicketStatus.VOID && ticket.status !== TicketStatus.REFUNDED && ticket.status !== TicketStatus.PARTIALLY_REFUNDED ? ( // Simplificar esta lógica si es posible
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:text-green-600"
                          onClick={() => router.push(`/facturacion/tickets/editar/${ticket.id}`)}
                          title={t('tickets.actions.editTooltip')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:text-red-600"
                          onClick={() => alert(`${t('tickets.actions.delete')} ${ticket.id}`)} // TODO: Implementar eliminación real con confirmación
                          title={t('tickets.actions.deleteTooltip')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                       <Button variant="ghost" size="icon" className="text-gray-400 cursor-not-allowed" title={t('tickets.actions.closedTooltip')}>
                        <Lock className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* TODO: Implementar componente de paginación aquí */}
      {/* <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} /> */}
    </div>
  );
};


export default function ListadoTicketsPage() {
  const { t } = useTranslation();
  const { activeClinic } = useClinic();
  // <<< INICIO ELIMINACIÓN DEBUG LOGS >>>
  // console.log('[TicketsPage] activeClinic:', activeClinic); // ELIMINADO
  // <<< FIN ELIMINACIÓN DEBUG LOGS >>>
  // TODO: Implementar estado para la página actual de paginación si es necesario aquí o en un custom hook
  // const [currentPagePending, setCurrentPagePending] = useState(1);
  const pageSize = 10; // O configurable

  const commonQueryOptions = {
    // staleTime: CACHE_TIME.CORTO, // Si tienes constantes de caché
    // refetchOnWindowFocus: false,
  };

  const pendingTicketsFilters: TicketFilters = {
    clinicId: activeClinic?.id || '', // Asegurar que clinicId no sea undefined
    status: [TicketStatus.DRAFT, TicketStatus.OPEN, TicketStatus.PARTIALLY_PAID],
    page: 1, // TODO: Conectar con estado de paginación
    pageSize: pageSize,
  };

  const closedTicketsFilters: TicketFilters = {
    clinicId: activeClinic?.id || '', // Asegurar que clinicId no sea undefined
    status: [TicketStatus.PAID, TicketStatus.VOID, TicketStatus.REFUNDED, TicketStatus.PARTIALLY_REFUNDED],
    page: 1, // TODO: Conectar con estado de paginación
    pageSize: pageSize,
  };
  
  // <<< INICIO ELIMINACIÓN DEBUG LOGS >>>
  // console.log('[TicketsPage] closedTicketsFilters:', closedTicketsFilters); // ELIMINADO
  // <<< FIN ELIMINACIÓN DEBUG LOGS >>>

  const { 
    data: pendingTicketsResponse, 
    isLoading: isLoadingPending, 
    isError: isErrorPending, 
    error: errorPending 
  } = useTicketsQuery(pendingTicketsFilters, { enabled: !!activeClinic?.id, ...commonQueryOptions });

  const { 
    data: closedTicketsResponse, 
    isLoading: isLoadingClosed, 
    isError: isErrorClosed, 
    error: errorClosed 
  } = useTicketsQuery(closedTicketsFilters, { enabled: !!activeClinic?.id, ...commonQueryOptions });
  
  // <<< INICIO ELIMINACIÓN DEBUG LOGS (MOVIDOS AQUÍ) >>>
  // console.log('[TicketsPage] closedTicketsResponse:', closedTicketsResponse); // ELIMINADO
  // console.log('[TicketsPage] isLoadingClosed:', isLoadingClosed); // ELIMINADO
  // console.log('[TicketsPage] isErrorClosed:', isErrorClosed); // ELIMINADO
  // console.log('[TicketsPage] errorClosed:', errorClosed); // ELIMINADO
  // <<< FIN ELIMINACIÓN DEBUG LOGS >>>

  const pendingTickets = pendingTicketsResponse?.data || [];
  const closedTickets = closedTicketsResponse?.data || [];

  // Provisional: Si no hay clínica activa, mostrar un mensaje.
  if (!activeClinic) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <HelpCircle className="w-16 h-16 mb-4 text-gray-400" />
        <p className="text-lg text-center text-gray-600">{t('tickets.selectClinicMessage')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-2 overflow-auto md:p-4 lg:p-6">
        {/* Tickets Pendientes */}
        <div className="mb-8">
          <TicketsTable 
            title={t('tickets.pendingTicketsTitle')} 
            ticketsData={pendingTickets} 
            isLoading={isLoadingPending}
            isError={isErrorPending}
            error={errorPending}
          />
        </div>

        {/* Tickets Cerrados - Solo mostrar si hay datos */}
        {(isLoadingClosed || (closedTickets && closedTickets.length > 0)) && (
          <div className="mb-8">
            <TicketsTable 
              title={t('tickets.closedTicketsTitle')} 
              ticketsData={closedTickets} 
              isLoading={isLoadingClosed}
              isError={isErrorClosed}
              error={errorClosed}
            />
          </div>
        )}
      </div>
      {/* Footer con botones */}
      <footer
        className="fixed bottom-0 right-0 z-40 bg-white shadow border-t p-3 flex justify-end items-center space-x-3 transition-all duration-300"
        style={{
          left: "var(--sidebar-width)",
          width: "calc(100% - var(--sidebar-width))",
        }}
      >
        <Button variant="outline">
          <Printer className="mr-2 h-4 w-4" /> {t('tickets.footer.viewCashRegister')}
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('common.goBack')}
        </Button>
        <Link href="/facturacion/tickets/nuevo" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('tickets.footer.newTicket')}
          </Button>
        </Link>
        <Button variant="outline">
          <HelpCircle className="mr-2 h-4 w-4" /> {t('common.help')}
        </Button>
      </footer>
    </div>
  );
} 