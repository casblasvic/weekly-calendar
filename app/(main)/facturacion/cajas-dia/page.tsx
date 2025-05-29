"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useClinic } from '@/contexts/clinic-context';
import { useToast } from "@/components/ui/use-toast";
import { 
  useDailyCashSessionQuery, 
  useCloseCashSessionMutation, 
  useCashSessionsQuery,
  type CashSessionResponse, 
  type CloseCashSessionPayload, 
  type CashSessionPaymentTotal,
  type CashSessionTicket,
  type PaginatedCashSessionsResponse,
  type CashSessionFilters
} from '@/lib/hooks/use-cash-session-query';
import { ArrowLeft, Wallet, CreditCard, Landmark, Ticket as TicketIcon, Gift, CircleDollarSign, Printer, Info, X, Check, Save, Loader2, Search, Download, CalendarDays, Filter, HelpCircle, Eye } from 'lucide-react';
import { DateRangePickerPopover } from '@/components/date-range-picker-popover';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CashSessionStatus } from '@prisma/client';

export default function ListadoCajasDiaPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { activeClinic } = useClinic();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<CashSessionStatus | 'ALL'>('ALL');
  const [clinicFilter, setClinicFilter] = useState<string | undefined>(activeClinic?.id); // Inicializar con activeClinic?.id o undefined

  useEffect(() => {
    if (!clinicFilter && activeClinic?.id) {
      setClinicFilter(activeClinic.id);
    }
  }, [activeClinic?.id]);

  const buildFilters = (): CashSessionFilters => {
    const activeFilters: CashSessionFilters = {
      page: 1, // TODO: Implementar paginación
      pageSize: 20,
    };
    if (clinicFilter && clinicFilter !== 'ALL') {
      activeFilters.clinicId = clinicFilter;
    }
    if (statusFilter && statusFilter !== 'ALL') {
      activeFilters.status = statusFilter;
    }
    if (dateRange?.from) {
      // Asegurar que la fecha tenga el formato correcto para la API
      const startDate = new Date(dateRange.from);
      startDate.setHours(0, 0, 0, 0);
      activeFilters.startDate = format(startDate, 'yyyy-MM-dd');
    } else {
      delete activeFilters.startDate;
    }
    if (dateRange?.to) {
      // Asegurar que la fecha tenga el formato correcto para la API
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);
      activeFilters.endDate = format(endDate, 'yyyy-MM-dd');
    } else {
      if (dateRange?.from && !dateRange?.to) {
        // Si solo hay fecha de inicio, usar la misma como fecha fin
        const sameDate = new Date(dateRange.from);
        sameDate.setHours(23, 59, 59, 999);
        activeFilters.endDate = format(sameDate, 'yyyy-MM-dd');
      } else {
        delete activeFilters.endDate;
      }
    }
    console.log('Aplicando filtros:', activeFilters);
    return activeFilters;
  };

  const filters = buildFilters();

  const { data: cashSessionsResponse, isLoading, isError, error, refetch } = useCashSessionsQuery(filters, {});

  // Mientras no tengamos clínica activa mostramos spinner
  if (!clinicFilter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
        <Loader2 className="w-12 h-12 mb-4 text-purple-600 animate-spin" />
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: activeClinic?.currency || 'EUR' }).format(val);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
        <Loader2 className="w-12 h-12 mb-4 text-purple-600 animate-spin" />
        <p className="text-lg text-gray-600">{t('cash.loadingSessions', 'Cargando cajas del día...')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{t('cash.errorLoadingSessions', 'Error al cargar las cajas del día')}: {error?.message}</p>
        <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}</Button>
      </div>
    );
  }

  const cashSessions = cashSessionsResponse?.data || [];

  // Calcular totales para el pie de la tabla
  const totalFacturadoGeneral = cashSessions.reduce((sum, s) => {
    const sessionFacturado = (s as any).ticketsAccountedInSession?.reduce((ticketSum, ticket: CashSessionTicket) => ticketSum + Number(ticket.finalAmount ?? 0), 0) ?? 0;
    return sum + sessionFacturado;
  }, 0);
  const totalDiferenciaGeneral = cashSessions.reduce((sum, s) => sum + Number(s.differenceCash ?? 0), 0);
  const totalCajaInicialGeneral = cashSessions.reduce((sum, s) => sum + (Number(s.openingBalanceCash ?? 0) + (Number(s.manualCashInput ?? 0) > 0 ? Number(s.manualCashInput ?? 0) : 0)), 0);
  const totalRetiradoGeneral = cashSessions.reduce((sum, s) => sum + Number(s.cashWithdrawals ?? 0), 0);
  const totalCajaFinalGeneral = cashSessions.reduce((sum, s) => sum + (Number(s.countedCash ?? 0) - Number(s.cashWithdrawals ?? 0)), 0);

  return (
    <div className="container px-4 py-6 pb-20 mx-auto space-y-6"> {/* Padding bottom para footer */}
      <h1 className="mb-6 text-2xl font-semibold">{t('cash.finder.title', 'Buscador de cajas')}</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-4 p-4 mb-6 border rounded-lg md:grid-cols-2 lg:grid-cols-4 bg-gray-50">
        <div>
          <Label htmlFor="dateRange" className="text-xs">{t('common.dateRange', 'Rango de Fechas')}</Label>
          <div className="mt-1">
            <DateRangePickerPopover 
              dateRange={dateRange} 
              setDateRange={setDateRange} 
              className="text-xs h-9"
              onApplyFilter={() => {
                // Solo refrescar datos cuando hay un rango completo
                if (dateRange?.from && dateRange?.to) {
                  refetch();
                }
              }}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="statusFilter" className="text-xs">{t('common.status.title', 'Estado')}</Label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CashSessionStatus | 'ALL')} >
            <SelectTrigger className="mt-1 text-xs h-9">
              <SelectValue placeholder={t('common.selectStatus','Seleccionar estado')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('common.all', 'Todas')}</SelectItem>
              <SelectItem value={CashSessionStatus.OPEN}>{t('cash.status.OPEN', 'Abierta')}</SelectItem>
              <SelectItem value={CashSessionStatus.CLOSED}>{t('cash.status.CLOSED', 'Cerrada')}</SelectItem>
              <SelectItem value={CashSessionStatus.RECONCILED}>{t('cash.status.RECONCILED', 'Conciliada')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* TODO: Selector de Clínica si el usuario tiene acceso a varias */}

        <div className="flex items-end gap-2">
          <Button variant="outline" size="sm" className="w-full mt-1 text-xs h-9" onClick={() => alert('Exportar no implementado')} disabled>
            <Download className="w-3.5 h-3.5 mr-1.5" />{t('common.export', 'Exportar')}
          </Button>
          <Button size="sm" className="w-full mt-1 text-xs bg-purple-600 h-9 hover:bg-purple-700" onClick={() => refetch()}>
            <Search className="w-3.5 h-3.5 mr-1.5" />{t('common.search', 'Buscar')}
          </Button>
        </div>
      </div>

      {/* Tabla de Cajas */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">{t('cash.finder.date', 'Fecha')}</TableHead>
              <TableHead>{t('cash.finder.clinic', 'Clínica')}</TableHead>
              <TableHead className="text-right">{t('cash.finder.billed', 'Facturado')}</TableHead>
              <TableHead className="text-right">{t('cash.finder.difference', 'Diferencia')}</TableHead>
              <TableHead className="text-right">{t('cash.finder.initialCash', 'Caja inicial')}</TableHead>
              <TableHead className="text-right">{t('cash.finder.withdrawn', 'Retirado')}</TableHead>
              <TableHead className="text-right">{t('cash.finder.finalCash', 'Caja final')}</TableHead>
              <TableHead>{t('cash.finder.status', 'Estado')}</TableHead>
              <TableHead className="text-center w-[100px]">{t('common.actions', 'Acciones')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashSessions.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-gray-500">
                  {t('cash.finder.noResults', 'No se encontraron cajas para los filtros seleccionados.')}
                </TableCell>
              </TableRow>
            )}
            {cashSessions.flatMap(session => {
                const facturado = (session as any).ticketsAccountedInSession?.reduce((sum, ticket: CashSessionTicket) => sum + Number(ticket.finalAmount ?? 0), 0) ?? 0;
                const diferencia = Number(session.differenceCash ?? 0);
                const cajaInicial = Number(session.openingBalanceCash ?? 0) + (Number(session.manualCashInput ?? 0) > 0 ? Number(session.manualCashInput ?? 0) : 0);
                const retirado = Number(session.cashWithdrawals ?? 0);
                const cajaFinal = Number(session.countedCash ?? 0) - Number(session.cashWithdrawals ?? 0);

                const openingTimeDateObj = parseISO(session.openingTime as unknown as string);
                // Usar Date.UTC para construir una nueva fecha basada en componentes UTC, luego formatear.
                // Esto asegura que la 'fecha' de la sesión sea la fecha UTC.
                const displayOpeningDate = format(new Date(Date.UTC(openingTimeDateObj.getUTCFullYear(), openingTimeDateObj.getUTCMonth(), openingTimeDateObj.getUTCDate())), 'dd/MM/yyyy', { locale: es });
                const linkOpeningDate = format(new Date(Date.UTC(openingTimeDateObj.getUTCFullYear(), openingTimeDateObj.getUTCMonth(), openingTimeDateObj.getUTCDate())), 'yyyy-MM-dd');

                return (
                  <TableRow key={session.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/caja/${linkOpeningDate}?clinicId=${session.clinicId}&sessionId=${session.id}`)}>
                    <TableCell>{displayOpeningDate}</TableCell>
                    <TableCell>{(session as any).clinic?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(facturado)}</TableCell>
                    <TableCell className={`text-right font-medium ${diferencia === 0 ? 'text-green-600' : (diferencia > 0 ? 'text-blue-600' : 'text-red-600')}`}>{formatCurrency(diferencia)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cajaInicial)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(retirado)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cajaFinal)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${session.status === CashSessionStatus.OPEN ? 'bg-green-100 text-green-700' : (session.status === CashSessionStatus.CLOSED ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}`}>{t(`cash.status.${session.status}`, session.status)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-purple-600" title={t('cash.finder.viewSession', 'Ver Caja')}
                      onClick={(e) => { e.stopPropagation(); router.push(`/caja/${linkOpeningDate}?clinicId=${session.clinicId}&sessionId=${session.id}`); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* Pie de Tabla con Totales */}
      {cashSessions.length > 0 && (
        <div className="flex justify-end pt-4 pr-4 mt-6 space-x-8 text-sm font-medium border-t">
          <div>
            <span>{t('cash.finder.totalBilled', 'Total Facturado')}: </span>
            <span className="font-semibold">{formatCurrency(totalFacturadoGeneral)}</span>
          </div>
          <div>
            <span>{t('cash.finder.totalDifference', 'Total Diferencia')}: </span>
            <span className={`font-semibold ${totalDiferenciaGeneral === 0 ? 'text-green-600' : totalDiferenciaGeneral > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(totalDiferenciaGeneral)}
            </span>
          </div>
          <div>
            <span>{t('cash.finder.totalWithdrawn', 'Total Retirado')}: </span>
            <span className="font-semibold">{formatCurrency(totalRetiradoGeneral)}</span>
          </div>
        </div>
      )}

      {/* Footer Fijo */}
      <footer 
        className="fixed bottom-0 right-0 z-40 flex items-center justify-end p-3 border-t shadow-sm bg-white/80 backdrop-blur-sm"
        style={{ left: 'var(--sidebar-width, 0px)', width: 'calc(100% - var(--sidebar-width, 0px))' }}
      > 
        <Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="w-3.5 h-3.5 mr-1" />{t('common.back')}</Button>
        <Button variant="default" size="sm" className="ml-2" onClick={() => alert(t('common.help_not_implemented'))}><HelpCircle className="w-3.5 h-3.5 mr-1" />{t('common.help')}</Button>
      </footer>
    </div>
  );
} 