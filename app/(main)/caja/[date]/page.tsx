"use client";

import React, { use, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { Decimal } from '@prisma/client/runtime/library';
import { useClinic } from '@/contexts/clinic-context';
import { 
  useDailyCashSessionQuery, 
  useCloseCashSessionMutation, 
  useReopenCashSessionMutation, 
  useReconcileCashSessionMutation, 
  type CashSessionResponse, 
  type CloseCashSessionPayload, 
  type CashSessionPaymentTotal,
  type CashSessionTicket
} from '@/lib/hooks/use-cash-session-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Wallet, CreditCard, Landmark, Ticket as TicketIcon, Gift, CircleDollarSign, FileText, Printer, Info, X, Check, Save, Loader2, ChevronRight, ChevronDown, Eye, ShieldCheck, RefreshCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaymentMethodType, CashSessionStatus } from '@prisma/client';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePendingPaymentVerificationsQuery, useVerifyPaymentMutation } from '@/lib/hooks/use-payment-verification';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useCashSessionTotalsQuery } from '@/lib/hooks/use-cash-session-totals';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useChangeLogs } from '@/lib/hooks/use-change-logs';
import { ChangeLogsTable } from '@/components/change-logs-table';

interface CashPageProps {
  params: Promise<{ date: string }>;
}

export default function CashPage({ params }: CashPageProps) {
  const { t } = useTranslation(['cash', 'common']);
  const { activeClinic, isInitialized } = useClinic();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Unwrap params al principio
  const { date } = use(params);
  const returnToQueryParam = searchParams.get('returnTo');
  const clinicIdFromParams = searchParams.get('clinicId');
  const sessionIdFromParams = searchParams.get('sessionId');
  const clinicId = clinicIdFromParams || activeClinic?.id;

  // ✅ TODOS LOS HOOKS AL PRINCIPIO - antes de early returns
  const { data: sessionData, isLoading, isError, refetch } = useDailyCashSessionQuery(
    clinicId, 
    date, 
    sessionIdFromParams ?? undefined,
    { enabled: !!clinicId && isInitialized }
  );

  const [closeFormData, setCloseFormData] = useState<Partial<CloseCashSessionPayload>>({});
  const closeSessionMutation = useCloseCashSessionMutation();
  const reopenMutation = useReopenCashSessionMutation();
  const reconcileMutation = useReconcileCashSessionMutation();
  const [isClosingSession, setIsClosingSession] = useState(false);

  // Verificación de pagos
  const [drawerFilters, setDrawerFilters] = useState<{methodType: PaymentMethodType | null, posTerminalId?: string|null}>({methodType: null});
  const [isVerifyDrawerOpen, setIsVerifyDrawerOpen] = useState(false);

  const session = sessionData; // Para no renombrar en todo el código por ahora
  const { data: pendingPayments = [], refetch: refetchPending } = usePendingPaymentVerificationsQuery({ 
    clinicId, 
    sessionId: session?.id || undefined, 
    methodType: drawerFilters.methodType || undefined, 
    posTerminalId: drawerFilters.posTerminalId 
  }, { enabled: !!session?.id && isInitialized });

  const verifyMutation = useVerifyPaymentMutation();

  const { data: totals, isFetching: isTotalsFetching } = useCashSessionTotalsQuery(
    session?.id, 
    { enabled: !!session?.id && isInitialized }
  );

  const [countedByPos, setCountedByPos] = useState<Record<string,string>>({});
  const [countedTransfer, setCountedTransfer] = useState('');
  const [countedCheck, setCountedCheck] = useState('');

  const {data:logData=[]}=useChangeLogs('CASH_SESSION',session?.id);

  // Hooks useMemo y useEffect
  const totalFacturado = useMemo(() => {
    if (!session || !session.ticketsAccountedInSession) return 0;
    return session.ticketsAccountedInSession.reduce((sum, ticket) => {
      const amount = ticket.finalAmount;
      let finalAmountValue = 0;

      if (typeof amount === 'number') {
        finalAmountValue = amount;
      } else if (amount !== null && typeof amount === 'object' && 'toNumber' in amount) {
        // Safely access .toNumber() after confirming amount is a non-null object with this property
        finalAmountValue = (amount as Decimal).toNumber();
      }
      // If amount is null, or an object without 'toNumber', finalAmountValue remains 0.
      return sum + finalAmountValue;
    }, 0);
  }, [session]);

  const paymentsForDrawer = useMemo(()=>{
    if(!session) return [] as any[];
    const arr:any[] = [];

    // Siempre procesar pagos registrados
    session.ticketsAccountedInSession?.forEach(ticket=>{
      ticket.payments?.forEach(pay=>{
        if(drawerFilters.methodType && pay.paymentMethodDefinition.type!==drawerFilters.methodType) return;
        if(drawerFilters.posTerminalId && (pay as any).posTerminalId!==drawerFilters.posTerminalId) return;
        arr.push({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          clientName: ticket.person ? `${ticket.person.firstName} ${ticket.person.lastName||''}`.trim(): '',
          posName: pay.posTerminal?.name || '—',
          amount: pay.amount,
          methodName: pay.paymentMethodDefinition.name,
          paymentId: pay.id,
        });
      });
    });

    // Para pagos aplazados: si no hay Payment rows, mostrar dueAmount
    if(drawerFilters.methodType===PaymentMethodType.DEFERRED_PAYMENT && arr.length===0){
      session.ticketsAccountedInSession?.forEach(ticket=>{
        const paid = ticket.paidAmountDirectly ?? 0;
        const deferredAmount = (ticket.dueAmount !== null && ticket.dueAmount !== undefined) ? ticket.dueAmount : (ticket.finalAmount - paid);
        if(deferredAmount>0.0001){
          arr.push({
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            clientName: ticket.person ? `${ticket.person.firstName} ${ticket.person.lastName||''}`.trim(): '',
            posName: '—',
            amount: deferredAmount,
            methodName: t('cash.summary.deferredTotal','Pago aplazado'),
            paymentId: ticket.id,
          });
        }
      });
    }
    return arr;
  },[session, drawerFilters, t]);

  const hasCashPayments = useMemo(()=>{
    if(!session) return false;
    return session.ticketsAccountedInSession?.some(ticket=>ticket.payments?.some(p=>p.paymentMethodDefinition.type===PaymentMethodType.CASH));
  },[session]);

  // Determinar estado de la sesión para lógicas tempranas
  const currentStatus = session?.status;
  const isSessionOpen = currentStatus === CashSessionStatus.OPEN;

  // useEffect hooks
  useEffect(() => {
    const total = Object.values(countedByPos).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    setCloseFormData(prev => ({ ...prev, countedCard: total }));
  }, [countedByPos]);

  useEffect(() => {
    const getNumber = (value: Decimal | number | string | null | undefined): number | null => {
      if (value === null || typeof value === 'undefined') return null;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const numericValue = parseFloat(value);
        return isNaN(numericValue) ? null : numericValue;
      }
      // Explicitly check if it's a Decimal instance
      if (typeof value === 'object' && value !== null && typeof (value as any).toNumber === 'function' && typeof (value as any).toFixed === 'function') { // Duck typing for Decimal
        return value.toNumber();
      }
      // If it's none of the above, it's an unexpected type. Log an error and return 0.
      console.error(`[CashPage:getNumber] Unexpected value type: ${typeof value}, value:`, value);
      return 0;
    };

    const getStringFromDecimalOrNumber = (value: Decimal | number | null | undefined): string => {
      if (value === null || typeof value === 'undefined') return '';
      // If it's Decimal, convert to string. If number, convert to string.
      return value.toString();
    };

    if (session) {
      setCloseFormData(prev => ({
        ...prev,
        countedCash: getNumber(session.countedCash) ?? 0,
        manualCashInput: getNumber(session.manualCashInput) ?? 0,
        cashWithdrawals: getNumber(session.cashWithdrawals) ?? 0,
        cashExpenses: getNumber(session.cashExpenses) ?? 0,
        notes: session.notes ?? '',
        countedCard: getNumber(session.countedCard) ?? 0,
        countedBankTransfer: getNumber(session.countedBankTransfer) ?? 0,
        countedCheck: getNumber(session.countedCheck) ?? 0,
        countedInternalCredit: getNumber(session.countedInternalCredit) ?? 0,
        // countedOther: session.countedOther, // Handle Prisma.JsonValue if necessary
      }));

      // Update countedTransfer and countedCheck states
      if (session.countedBankTransfer !== null && typeof session.countedBankTransfer !== 'undefined') {
        setCountedTransfer(getStringFromDecimalOrNumber(session.countedBankTransfer));
      } else if (!isSessionOpen) { // Only clear if session is closed and no value from session
        setCountedTransfer('');
      }

      if (session.countedCheck !== null && typeof session.countedCheck !== 'undefined') {
        setCountedCheck(getStringFromDecimalOrNumber(session.countedCheck));
      } else if (!isSessionOpen) { // Only clear if session is closed and no value from session
        setCountedCheck('');
      }

    } else {
      // No session, reset all form data and related states
      setCloseFormData(prev => ({
        ...prev,
        countedCash: null,
        manualCashInput: null,
        cashWithdrawals: null,
        cashExpenses: null,
        notes: '',
        countedCard: null,
        countedBankTransfer: null,
        countedCheck: null,
        countedInternalCredit: null,
      }));
      setCountedTransfer('');
      setCountedCheck('');
    }
  }, [session, isSessionOpen, activeClinic?.currency]);

  // Variables calculadas
  const clinicIdQueryParam = searchParams.get('clinicId');
  const returnToPath = `/caja/${date}${clinicIdQueryParam ? `?clinicId=${clinicIdQueryParam}` : ''}`;
  const totalsData = totals as import('@/lib/hooks/use-cash-session-totals').CashSessionTotalsResponse | undefined;

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: activeClinic?.currency || 'EUR' }).format(val);

  const formatDateClinic = (d:Date)=>{
    const tz = (activeClinic as any)?.country?.timezone || undefined;
    return new Intl.DateTimeFormat('es-ES',{dateStyle:'short', timeStyle:'short', timeZone: tz}).format(d);
  }

  // --- NUEVOS CÁLCULOS BASADOS EN totals (totales por TPV) ---
  const cardTotalsAvailable = !!session?.id && !!totalsData && !isTotalsFetching;
  const totalCardAmountFromTotals = cardTotalsAvailable ? totalsData!.cardByPos.reduce((sum, pos) => sum + pos.expectedTotal, 0) : null;
  const cardDetailsFromTotals = cardTotalsAvailable ? totalsData!.cardByPos.flatMap(pos => [
    { label: `${t('cash.summary.terminal', 'TPV')}: ${pos.posName}`, value: pos.expectedTotal, isHeader: true },
    { label: t('cash.summary.ticketsDay', 'Tickets del día'), value: pos.expectedTickets, isSubDetail: true },
    { label: t('cash.summary.debtPayments', 'Cobros Aplazados'), value: pos.expectedDeferred, isSubDetail: true },
  ]) : [];

  const transferTotalsFromTotals = cardTotalsAvailable ? totalsData!.transfer : null;
  const checkTotalsFromTotals = cardTotalsAvailable ? totalsData!.check : null;

  const transferAmount = transferTotalsFromTotals?.expectedTotal ?? 0;
  const checkAmount = checkTotalsFromTotals?.expectedTotal ?? 0;

  const cardHighlight = cardTotalsAvailable ? totalsData!.cardByPos.some(pos => pos.expectedDeferred > 0) : false;

  const cashPaymentsCount = paymentsForDrawer.filter(p=>p.methodName && drawerFilters.methodType===PaymentMethodType.CASH).length;

  const hasPendingTransfer = pendingPayments.some(p=>p.paymentMethodDefinition.type==='BANK_TRANSFER');
  const hasPendingCheck = pendingPayments.some(p=>p.paymentMethodDefinition.type==='CHECK');

  // Valores para UI, considerando que `session` puede ser null inicialmente
  const openingBalanceCash = session?.openingBalanceCash ?? 0;
  const serverExpectedCash = session?.expectedCash ?? 0;
  const paymentTotals: CashSessionPaymentTotal[] = session?.paymentTotals || [];
  const ticketsInSession: CashSessionTicket[] = session?.ticketsAccountedInSession || [];

  // Calculate true total for cash payments by summing all relevant entries
  const totalCashAmount = paymentTotals
    .filter(pt => pt.paymentMethodType === PaymentMethodType.CASH)
    .reduce((sum, pt) => sum + (pt.totalAmount || 0), 0);

  const totalCashDirectAmount = paymentTotals
    .filter(pt => pt.paymentMethodType === PaymentMethodType.CASH)
    .reduce((sum, pt) => sum + (pt.directAmount || 0), 0);

  const totalCashDebtPaymentAmount = paymentTotals
    .filter(pt => pt.paymentMethodType === PaymentMethodType.CASH)
    .reduce((sum, pt) => sum + (pt.debtPaymentAmount || 0), 0);

  // Para los inputs, usar valores de la sesión si está cerrada/reconciliada, o del form si está abierta
  const countedCashUI = isSessionOpen ? (closeFormData.countedCash ?? '') : (session?.countedCash ?? '');
  const manualCashInputUI = isSessionOpen ? (closeFormData.manualCashInput?.toString() ?? '') : (session?.manualCashInput?.toString() ?? '');
  const cashExpensesUI = isSessionOpen ? (closeFormData.cashExpenses?.toString() ?? '') : '';
  const cashCardExpectedAmount = totalCashAmount;
  const cashCardDifference = (parseFloat(countedCashUI.toString() || '0')) - cashCardExpectedAmount;

  // New live calculations for the sidebar
  const totalCashPaymentAmount = paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.CASH)?.totalAmount || 0;
  
  const liveExpectedCashInDrawer = 
    (session?.openingBalanceCash ?? 0) + 
    (parseFloat(closeFormData.manualCashInput?.toString() ?? '0') || 0) + 
    totalCashPaymentAmount - 
    (parseFloat(closeFormData.cashExpenses?.toString() ?? '0') || 0);

  const liveDifferenceCash = (closeFormData.countedCash ?? 0) - liveExpectedCashInDrawer;
  const transferDifference = (parseFloat(countedTransfer) || 0) - transferAmount;
  const checkDifference = (parseFloat(countedCheck) || 0) - checkAmount;
  const cashWithdrawalUI = isSessionOpen ? (closeFormData.cashWithdrawals ?? '') : (session?.cashWithdrawals ?? '');
  const nextDayOpeningCashUI = isSessionOpen ? ((parseFloat(countedCashUI.toString()) || 0) - (parseFloat(cashWithdrawalUI.toString()) || 0)) : ((session?.countedCash ?? 0) - (session?.cashWithdrawals ?? 0));

  // ✅ EARLY RETURNS AL FINAL - después de todos los hooks
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="w-64 h-32" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="w-64 h-32" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{t('cash.errorLoading', 'Error cargando caja')}</p>
        <Button onClick={() => {
          if (returnToQueryParam) {
            router.push(returnToQueryParam);
          } else {
            router.push('/facturacion/cajas-dia');
          }
        }}><ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}</Button>
      </div>
    );
  }

  if (!session) {
    // No hay sesión abierta hoy
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="max-w-md text-center text-gray-600">
          {t('cash.noSessionToday', 'No existe una sesión de caja abierta para esta clínica en la fecha seleccionada.')}
        </p>
        <Button onClick={() => {
          if (returnToQueryParam) {
            router.push(returnToQueryParam);
          } else {
            router.push('/facturacion/cajas-dia');
          }
        }} variant="outline" size="sm"><ArrowLeft className="w-3.5 h-3.5 mr-1" />{t('common.back')}</Button>
      </div>
    );
  }

  const handleInputChange = (field: keyof CloseCashSessionPayload, value: string | number) => {
    if (field === 'notes') {
      setCloseFormData(prev => ({ ...prev, notes: value as string }));
    } else {
      // For numeric fields, parse to float or set to null if input is empty/invalid
      const numericValue = parseFloat(value as string);
      setCloseFormData(prev => ({
        ...prev,
        [field]: isNaN(numericValue) ? null : numericValue,
      }));
    }
  };

  const handleCloseSession = async () => {
    setIsClosingSession(true);
    if (!session) return;

    // Asegurar que contamos efectivo mínimo
    if (closeFormData.countedCash === null || typeof closeFormData.countedCash === 'undefined') {
      toast({ variant:'destructive', title:t('cash.error','Falta efectivo contado'), description: t('cash.error.countedCashRequired', 'Debe introducir el efectivo contado.')});
      setIsClosingSession(false); // Reset loading state
      return;
    }
    const countedCashValue = closeFormData.countedCash;

    const payload: CloseCashSessionPayload = {
      countedCash: countedCashValue,
      countedCard: closeFormData.countedCard ?? undefined,
      countedBankTransfer: closeFormData.countedBankTransfer ?? undefined,
      countedCheck: closeFormData.countedCheck ?? undefined,
      countedInternalCredit: closeFormData.countedInternalCredit ?? undefined,
      countedOther: closeFormData.countedOther ?? undefined,
      manualCashInput: closeFormData.manualCashInput ?? null,
      cashWithdrawals: closeFormData.cashWithdrawals ?? null,
      cashExpenses: closeFormData.cashExpenses ?? null, // Added cashExpenses to payload
      notes: closeFormData.notes ?? null,
    };

    try {
      await closeSessionMutation.mutateAsync({ sessionId: session.id, data: payload }, {
        onSuccess: () => {
          refetch(); // Refrescar datos de la sesión
          toast({ description: 'Caja cerrada correctamente'});
        },
        onError: (error: any) => {
          toast({ variant: 'destructive', title: 'Error al cerrar caja', description: error.message });
        }
      });
    } catch (error: any) {
      if (!closeSessionMutation.isError) {
        toast({ variant: 'destructive', title: 'Error inesperado', description: error.message || 'Ocurrió un error' });
      }
    } finally {
      setIsClosingSession(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
      <h1 className="mb-4 text-2xl font-semibold">{t('cash.dayCashTitle', { date: format(new Date(date), 'dd/MM/yyyy', { locale: es }) })}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">{t('cash.tabs.summary', 'Resumen')}</TabsTrigger>
              <TabsTrigger value="tickets">{t('cash.tabs.tickets', 'Tickets')}</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Total Facturado Card */}
                <SummaryCard
                  title={t('cash.summary.totalBilled', 'Total Facturado')}
                  amount={totalFacturado}
                  icon={FileText}
                  details={[]}
                  highlight={false}
                  className="bg-indigo-50 border-indigo-200"
                />
                {/* Efectivo */}
                <SummaryCard 
                  title={t('cash.summary.totalCash', 'Total efectivo')} 
                  amount={totalCashAmount}
                  icon={Wallet}
                  // @ts-ignore - Adding for debug
                  _debug_props={{amount: totalCashAmount, direct: totalCashDirectAmount, debt: totalCashDebtPaymentAmount, paymentTotals: session?.paymentTotals?.filter(pt => pt.paymentMethodType === PaymentMethodType.CASH) }}
                  details={[
                    { label: t('cash.summary.ticketsDay', 'Tickets del día'), value: totalCashDirectAmount },
                    { label: t('cash.summary.debtPayments', 'Cobros Aplazados'), value: totalCashDebtPaymentAmount },
                  ]}
                  highlight={totalCashAmount !== totalCashDirectAmount}
                  onViewDetails={hasCashPayments ? ()=>{ setDrawerFilters({methodType: PaymentMethodType.CASH}); setIsVerifyDrawerOpen(true);} : undefined}
                />
                {/* Tarjeta con TPVs */}
                <CardTPVSummary
                  totals={cardTotalsAvailable ? totalsData!.cardByPos : []}
                  countedByPos={countedByPos}
                  onCountedChange={(posId, val) => {
                    setCountedByPos(prev => ({ ...prev, [posId]: val }));
                  }}
                  currency={activeClinic?.currency || 'EUR'}
                  onViewDetails={(posId) => {
                    if(totalCardAmountFromTotals===0) return;
                    setDrawerFilters({ methodType: PaymentMethodType.CARD, posTerminalId: posId || undefined });
                    setIsVerifyDrawerOpen(true);
                  }}
                  totalHighlight={cardHighlight}
                />
                {/* Otros métodos (ejemplos) */}
                <SummaryCard 
                  title={t('cash.summary.bankTransfer','Transferencia')} 
                  amount={transferAmount} 
                  icon={Landmark} 
                  details={[
                    { label: t('cash.summary.ticketsDay', 'Tickets del día'), value: transferTotalsFromTotals?.expectedTickets || 0 },
                    { label: t('cash.summary.debtPayments', 'Cobros Aplazados'), value: transferTotalsFromTotals?.expectedDeferred || 0 },
                  ]}
                  onViewDetails={transferAmount>0? ()=>{ setDrawerFilters({ methodType: PaymentMethodType.BANK_TRANSFER }); setIsVerifyDrawerOpen(true);} : undefined }
                  highlight={hasPendingTransfer}
                  extra={(
                    <div className="flex items-center justify-between gap-1 mt-2 text-xs">
                      <span>{t('cash.summary.counted','Contado')}:</span>
                      <Input type="number" value={countedTransfer} onChange={e=>{setCountedTransfer(e.target.value); setCloseFormData(prev=>({...prev, countedBankTransfer: parseFloat(e.target.value)||0}));}} className="w-20 text-xs h-7" step="0.01" placeholder="0.00" />
                      <span className={`font-medium ${transferDifference===0?'text-green-600':transferDifference>0?'text-blue-600':'text-red-600'}`}>{formatCurrency(transferDifference)}</span>
                    </div>
                  )}
                />
                <SummaryCard 
                  title={t('cash.summary.check','Cheque')} 
                  amount={checkAmount} 
                  icon={TicketIcon} 
                  details={[
                    { label: t('cash.summary.ticketsDay', 'Tickets del día'), value: checkTotalsFromTotals?.expectedTickets || 0 },
                    { label: t('cash.summary.debtPayments', 'Cobros Aplazados'), value: checkTotalsFromTotals?.expectedDeferred || 0 },
                  ]}
                  onViewDetails={checkAmount>0 ? ()=>{ setDrawerFilters({ methodType: PaymentMethodType.CHECK }); setIsVerifyDrawerOpen(true);} : undefined }
                  highlight={hasPendingCheck}
                  extra={(
                    <div className="flex items-center justify-between gap-1 mt-2 text-xs">
                      <span>{t('cash.summary.counted','Contado')}:</span>
                      <Input type="number" value={countedCheck} onChange={e=>{setCountedCheck(e.target.value); setCloseFormData(prev=>({...prev, countedCheck: parseFloat(e.target.value)||0}));}} className="w-20 text-xs h-7" step="0.01" placeholder="0.00" />
                      <span className={`font-medium ${checkDifference===0?'text-green-600':checkDifference>0?'text-blue-600':'text-red-600'}`}>{formatCurrency(checkDifference)}</span>
                    </div>
                  )}
                />
                <SummaryCard 
                  title={t('cash.summary.internalCredit','Bono/Paquete')} 
                  amount={paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.INTERNAL_CREDIT)?.totalAmount || 0} 
                  icon={Gift} 
                  details={[
                    { label: t('cash.summary.ticketsDay', 'Tickets del día'), value: paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.INTERNAL_CREDIT)?.directAmount || 0 },
                    { label: t('cash.summary.debtPayments', 'Cobros Aplazados'), value: paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.INTERNAL_CREDIT)?.debtPaymentAmount || 0 },
                  ]}
                  highlight={paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.INTERNAL_CREDIT)?.totalAmount !== paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.INTERNAL_CREDIT)?.directAmount}
                />
                <SummaryCard 
                  title={t('cash.summary.deferredTotal','Pagos Aplazados')} 
                  amount={cardTotalsAvailable ? totalsData!.deferred.amount : 0} 
                  icon={CircleDollarSign} 
                  details={[]} 
                  highlight={false}
                  onViewDetails={cardTotalsAvailable && totalsData!.deferred.amount>0 ? ()=>{ setDrawerFilters({ methodType: PaymentMethodType.DEFERRED_PAYMENT }); setIsVerifyDrawerOpen(true);} : undefined }
                />

              </div>
            </TabsContent>
            <TabsContent value="tickets" className="pt-4 space-y-4">
              <h3 className="font-semibold text-gray-700 text-md">{t('cash.tabs.ticketsInSection','Tickets en esta Sesión')}</h3>
              <CashSessionTicketsTable tickets={ticketsInSession || []} currency={activeClinic?.currency || 'EUR'} returnToPath={returnToPath} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6"> {/* Sidebar ya no es sticky, se desplaza con el contenido */}
          <UserInfoCard user={session?.user} />

          {/* Historial de cambios */}
          <Accordion type="single" collapsible className="bg-white border rounded-lg shadow">
            <AccordionItem value="item-1">
              <AccordionTrigger className="flex items-center justify-between px-4 py-2 text-sm font-medium">
                <span>{t('cash.logs.title','Historial de cambios')}</span>
                <span className="ml-2 text-xs text-gray-500">{logData.length}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                {logData.length===0 ? (
                  <p className="text-xs text-gray-500">{t('cash.logs.none','Sin cambios')}</p>
                ) : (
                  <ChangeLogsTable logs={logData} />
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="p-4 bg-white border rounded-lg shadow">
            <h3 className="mb-3 text-sm font-semibold">{t('cash.sidebar.title', 'Cierre de Caja')}</h3>
            <div className="space-y-3 text-xs">
              <InfoRow label={t('cash.sidebar.initialCash', 'Caja inicial')} value={formatCurrency(openingBalanceCash)} />
              <InputRow label={t('cash.sidebar.manualCashInput', 'Efectivo añadido manualmente')} type="number" value={closeFormData.manualCashInput ?? ''} onChange={e => handleInputChange('manualCashInput', e.target.value)} disabled={!isSessionOpen} />
              <InfoRow label={t('cash.sidebar.totalCashCollected', 'Total efectivo cobrado')} value={formatCurrency(session?.paymentTotals?.find(pt => pt.paymentMethodType === PaymentMethodType.CASH)?.totalAmount || 0)} />
              <InfoRow label={t('cash.sidebar.expectedCash', 'Total efectivo (Calculado)')} value={formatCurrency(isSessionOpen ? liveExpectedCashInDrawer : serverExpectedCash)} />
              <InputRow label={t('cash.sidebar.cashExpenses', 'Pagos por caja (Gastos)')} type="number" value={closeFormData.cashExpenses ?? ''} onChange={e => handleInputChange('cashExpenses', e.target.value)} disabled={!isSessionOpen} />
              <InputRow label={t('cash.sidebar.countedCash', 'Efectivo contado en caja')} type="number" value={closeFormData.countedCash ?? ''} onChange={e => handleInputChange('countedCash', e.target.value)} disabled={!isSessionOpen} />
              <InfoRow label={t('cash.sidebar.difference', 'DIFERENCIA EFECTIVO')} value={formatCurrency(isSessionOpen ? liveDifferenceCash : (session?.differenceCash ?? 0))} className={`font-bold ${(isSessionOpen ? liveDifferenceCash : (session?.differenceCash ?? 0)) === 0 ? 'text-green-600' : ((isSessionOpen ? liveDifferenceCash : (session?.differenceCash ?? 0)) > 0 ? 'text-blue-600' : 'text-red-600')}`} />
              {/* RECUENTO CAJA FINAL EFECTIVO: Simplemente el efectivo contado */}
              <InfoRow 
                label={t('cash.sidebar.finalCount', 'RECUENTO CAJA FINAL EFECTIVO')} 
                value={formatCurrency(closeFormData.countedCash ?? 0)} 
                className={`font-semibold ${ (closeFormData.countedCash ?? 0) === 0 ? 'text-black' : ((closeFormData.countedCash ?? 0) > 0 ? 'text-blue-600' : 'text-red-600')}`}
              />

              <InputRow label={t('cash.sidebar.cashWithdrawal', 'Cantidad retirada')} type="number" value={closeFormData.cashWithdrawals ?? ''} onChange={e => handleInputChange('cashWithdrawals', e.target.value)} disabled={!isSessionOpen} />

              {/* Resumen Totales */}
              {!isSessionOpen && (
                <div className="pt-2 mt-3 space-y-1 border-t">
                  {/* "Total facturado", "Diferencia efectiva" and "Total retirado" have been removed from here as per user request */}
                  {/* The new "Total Facturado" card is now shown in the main payment methods summary area */}
                </div>
              )}
            </div>
            <div className="pt-3 mt-4 border-t">
              {/* CAJA INICIAL DÍA SIGUIENTE: (RECUENTO CAJA FINAL EFECTIVO) - (Cantidad retirada) */}
              <InfoRow 
                label={t('cash.sidebar.nextDayOpening', 'Caja inicial día siguiente')} 
                value={formatCurrency((closeFormData.countedCash ?? 0) - (closeFormData.cashWithdrawals ?? 0))} 
                isLarge 
                className={`${ ((closeFormData.countedCash ?? 0) - (closeFormData.cashWithdrawals ?? 0)) === 0 ? 'text-black' : (((closeFormData.countedCash ?? 0) - (closeFormData.cashWithdrawals ?? 0)) > 0 ? 'text-blue-600' : 'text-red-600')}`}
              />
            </div>
            {/* Comentarios supervisor */}
            <div className="mt-4">
              <Label className="text-xs">{t('cash.comments','Comentario supervisor')}</Label>
              <Textarea value={closeFormData.notes ?? ''} onChange={e=>handleInputChange('notes',e.target.value)} className="h-20 mt-1" disabled={!isSessionOpen} />
            </div>
          </div>
        </div>
      </div>

      </div> {/* Closing the flex-grow overflow-y-auto p-4 space-y-6 div */}
      <footer className="sticky bottom-0 bg-white p-4 border-t z-10 shadow-md flex items-center justify-end w-full">
        <Button variant="outline" onClick={() => {
          if (returnToQueryParam) {
            router.push(returnToQueryParam);
          } else {
            router.push('/facturacion/cajas-dia');
          }
        }} size="sm"><ArrowLeft className="w-3.5 h-3.5 mr-1" />{t('common.back')}</Button>
        <Button variant="outline" onClick={() => alert('Imprimir')} size="sm" className="ml-2"><Printer className="w-3.5 h-3.5 mr-1" />{t('common.print')}</Button>
        <Button variant="outline" onClick={() => alert('Comentarios')} size="sm" disabled className="ml-2"><Info className="w-3.5 h-3.5 mr-1" />{t('common.comments')}</Button>
        {isSessionOpen && (
          <Button 
            onClick={() => {
              if(window.confirm(t('cash.closeModal.title','Confirmar Cierre de Caja')+"?")) handleCloseSession();
            }} 
            size="sm" 
            className="ml-2 text-white bg-purple-600 hover:bg-purple-700"
            disabled={isClosingSession || !!session?.hasEarlierOpenSession}
          >
            {isClosingSession ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                {t('cash.closingSession', 'Cerrando...')}
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-1" />
                {t('cash.closeSession', 'Cerrar Caja')}
              </>
            )}
          </Button>
        )}
        {currentStatus === CashSessionStatus.CLOSED && (
            <Button onClick={async()=>{
              if(window.confirm(t('cash.reconcileSession','¿Conciliar caja?'))) {
                await reconcileMutation.mutateAsync({sessionId: session.id, data: { reconciliationNotes: ''}});
                refetch();
              }
            }} size="sm" className="ml-2 text-white bg-green-600 hover:bg-green-700">
              <Check className="w-3.5 h-3.5 mr-1" />{t('cash.reconcileSession','Conciliar Caja')}
            </Button>
        )}
        {(currentStatus === CashSessionStatus.CLOSED || currentStatus === CashSessionStatus.RECONCILED) && (
            <Button onClick={async()=>{
              if(window.confirm(t('cash.reopenSession','¿Reabrir caja?'))) {
                await reopenMutation.mutateAsync({sessionId: session.id});
                refetch();
              }
            }} size="sm" className="ml-2 text-white bg-orange-600 hover:bg-orange-700">
              <RefreshCcw className="w-3.5 h-3.5 mr-1" />{t('cash.reopenSession','Reabrir Caja')}
            </Button>
        )}
      </footer>
      
      {/* Drawer Verificación */}
      <Drawer open={isVerifyDrawerOpen} onOpenChange={setIsVerifyDrawerOpen}>
        <DrawerContent className="max-h-[80vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>
              {
                isSessionOpen
                  ? (drawerFilters.methodType === PaymentMethodType.DEFERRED_PAYMENT 
                      ? t('cash.drawer.deferredBreakdownTitle', 'Desglose de Pagos Aplazados') 
                      : `${t('cash.drawer.breakdownTitle', 'Desglose de Pagos')} - ${t(`enums.paymentMethodType.${drawerFilters.methodType}`, drawerFilters.methodType || 'Todos')}`)
                  : (drawerFilters.methodType === PaymentMethodType.DEFERRED_PAYMENT 
                      ? t('cash.verifyDrawer.deferredTitle', 'Pagos aplazados en tickets') 
                      : `${t('cash.verifyDrawer.title', 'Pagos pendientes')} - ${t(`enums.paymentMethodType.${drawerFilters.methodType}`, drawerFilters.methodType || 'Todos')}`)
              }
            </DrawerTitle>
            <DrawerDescription className="flex items-center justify-between">
              {
                isSessionOpen 
                  ? (drawerFilters.methodType === PaymentMethodType.DEFERRED_PAYMENT 
                      ? t('cash.drawer.deferredBreakdownDescription', 'Detalle de los pagos aplazados registrados en tickets para esta sesión.')
                      : t('cash.drawer.breakdownDescription', 'Detalle de los pagos registrados para el método seleccionado en esta sesión.'))
                  : t('cash.verifyDrawer.description','Revisa y confirma transferencias y cheques.')
              }
              <Button variant="ghost" size="icon" onClick={()=>refetchPending()}><RefreshCcw className="w-4 h-4" /></Button>
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-2 text-xs">
            {isSessionOpen || pendingPayments.length === 0 ? (
              <div className="py-4">
                <p className="text-center text-gray-500">{t('cash.verifyDrawer.noPending','No hay pagos pendientes')}</p>
                {/* Mostrar pagos del día si existen */}
                {paymentsForDrawer.length>0 && (
                  <Table className="mt-2 text-xs">
                    <TableHeader>
                      <TableRow>
                        <th>{t('tickets.table.ticketNumber','Nº Ticket')}</th>
                        <th>{t('tickets.table.client','Cliente')}</th>
                        <th>{t('cash.summary.terminal','TPV')}</th>
                        <th className="text-right">{t('cash.verifyDrawer.amount','Importe')}</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsForDrawer.map(p=>(
                        <TableRow key={p.paymentId}>
                          <TableCell className="flex items-center gap-1">
                            {p.ticketNumber || '-'}
                            <Button variant="ghost" size="icon" onClick={()=>router.push(`/facturacion/tickets/editar/${p.ticketId}`)}><Eye className="w-3 h-3 text-purple-600" /></Button>
                          </TableCell>
                          <TableCell>{p.clientName}</TableCell>
                          <TableCell>{p.posName}</TableCell>
                          <TableCell className="font-medium text-right">{formatCurrency(p.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <th>{t('cash.verifyDrawer.date','Fecha')}</th>
                    <th>{t('cash.verifyDrawer.method','Método')}</th>
                    <th className="text-right">{t('cash.verifyDrawer.amount','Importe')}</th>
                    <th className="text-center">{t('cash.verifyDrawer.actions','Acciones')}</th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map(pay=> (
                    <TableRow key={pay.id}>
                      <TableCell>{formatDateClinic(new Date(pay.paymentDate))}</TableCell>
                      <TableCell>{pay.paymentMethodDefinition.name}{pay.posTerminal?.name?` (${pay.posTerminal.name})`:''}</TableCell>
                      <TableCell className="font-medium text-right">{formatCurrency(pay.amount)}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="outline" size="icon" disabled={verifyMutation.isPending} onClick={async()=>{
                          await verifyMutation.mutateAsync({ paymentId: pay.id});
                          refetchPending();
                          toast({ description: t('cash.verifyDrawer.verified','Pago verificado')});
                        }}>
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      
    </div>
  );
}

// Componentes auxiliares para la UI de CashPage
interface SummaryCardProps {
  title: string;
  amount: number;
  icon: React.ElementType;
  details?: Array<{ label: string; value: number; isSubDetail?: boolean; isHeader?: boolean }>;
  onViewDetails?: () => void;
  highlight?: boolean;
  extra?: React.ReactNode;
  className?: string;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, icon: Icon, details, onViewDetails, highlight, extra, className }) => {
  const { t } = useTranslation();
  const { activeClinic } = useClinic();
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: activeClinic?.currency || 'EUR' }).format(val);

  return (
    <div className={`border rounded-lg p-4 bg-white shadow-sm ${highlight ? 'ring-2 ring-offset-1 ring-yellow-400' : ''} ${className || ''}`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="flex items-center text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 mr-2 text-purple-600" /> {title}
        </h3>
        {onViewDetails && <Button variant="link" size="sm" onClick={onViewDetails} className="h-auto px-1 py-0 text-xs">{t('common.viewDetails', 'Ver desglose')}</Button>}
      </div>
      <p className="mb-2 text-xl font-semibold text-gray-800">{formatCurrency(amount)}</p>
      {details && details.length > 0 && (
        <div className="text-xs space-y-0.5 text-gray-600">
          {details.map((detail, idx) => (
            <div key={idx} className={`flex justify-between ${detail.isSubDetail ? 'pl-3' : ''} ${detail.isHeader ? 'font-semibold mt-1 text-gray-700' : ''}`}>
              <span>{detail.label}{!detail.isHeader ? ':' : ''}</span>
              <span className={detail.value < 0 ? 'text-red-500' : ''}>{formatCurrency(detail.value)}</span>
            </div>
          ))}
        </div>
      )}
      {extra}
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string | number;
  className?: string;
  isLarge?: boolean;
}
const InfoRow: React.FC<InfoRowProps> = ({ label, value, className, isLarge }) => (
  <div className={`flex justify-between items-center ${isLarge ? 'text-sm' : 'text-xs'} ${className || ''}`}>
    <span className="text-gray-600">{label}:</span>
    <span className={`font-semibold ${isLarge ? 'text-base' : 'text-sm'}`}>{value}</span>
  </div>
);

interface InputRowProps {
  label: string;
  type: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}
const InputRow: React.FC<InputRowProps> = ({ label, type, value, onChange, disabled, autoFocus }) => (
  <div>
    <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')} className="text-xs text-gray-600">{label}</Label>
    <Input 
      id={label.toLowerCase().replace(/\s+/g, '-')}
      type={type} 
      value={value} 
      onChange={onChange} 
      disabled={disabled}
      autoFocus={autoFocus}
      className="h-8 mt-1 text-xs text-right focus:ring-purple-500/50 disabled:bg-gray-100 disabled:cursor-not-allowed"
      step={type === 'number' ? '0.01' : undefined}
      placeholder="0.00"
    />
  </div>
);

interface UserInfoCardProps {
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}
const UserInfoCard: React.FC<UserInfoCardProps> = ({ user }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center p-3 space-x-3 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center justify-center w-10 h-10 text-lg font-semibold text-purple-700 bg-purple-100 rounded-full">
        {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || t('common.unknownUser','Usuario Desconocido')}</p>
        <p className="text-xs text-gray-500">{user?.email || '-'}</p>
      </div>
    </div>
  );
}

interface CashSessionTicketsTableProps {
  tickets: CashSessionTicket[] | undefined;
  currency: string;
  returnToPath: string;
}
const CashSessionTicketsTable: React.FC<CashSessionTicketsTableProps> = ({ tickets, currency, returnToPath }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR' }).format(val);

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const toggleRow = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const getPaidAmount = (ticket: CashSessionTicket) => {
    if (ticket.payments && ticket.payments.length) {
      return ticket.payments.reduce((sum, p) => sum + (p.type === 'DEBIT' ? p.amount : -p.amount), 0);
    }
    return ticket.paidAmountDirectly ?? 0;
  };

  // Paginación sencilla client-side
  const [page, setPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const totalPages = Math.max(1, Math.ceil(tickets.length / rowsPerPage));
  const paginated = tickets.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  if (!tickets || tickets.length === 0) {
    return <p className="py-4 text-sm text-center text-gray-500">{t('cash.noTicketsInSession', 'No hay tickets en esta sesión.')}</p>;
  }

  return (
    <>
      <ScrollArea className="h-[300px] border rounded-md">
        <Table className="w-full text-xs">
        <TableHeader>
          <TableRow>
            <th className="w-4" />
            <th className="h-10 px-1 text-left align-middle font-medium text-muted-foreground w-[110px]">{t('tickets.table.ticketNumber','Nº Ticket')}</th>
            <th className="h-10 px-1 font-medium text-left align-middle text-muted-foreground">{t('tickets.table.client','Cliente')}</th>
            <th className="h-10 px-1 font-medium text-right align-middle text-muted-foreground">{t('tickets.table.total','Total')}</th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.flatMap(ticket => [
            <TableRow key={ticket.id} className="cursor-pointer hover:bg-purple-50/40" onClick={() => toggleRow(ticket.id)}>
              <TableCell className="w-4">
                {expanded[ticket.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </TableCell>
              <TableCell className="px-1 font-medium">{ticket.ticketNumber || '-'}</TableCell>
              <TableCell className="flex items-center justify-between px-1">
                <span>{ticket.person ? `${ticket.person.firstName} ${ticket.person.lastName || ''}`.trim() : '-'}</span>
                <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); router.push(`/facturacion/tickets/editar/${ticket.id}?from=${encodeURIComponent(returnToPath)}`)}}>
                  <Eye className="w-4 h-4 text-purple-600" />
                </Button>
              </TableCell>
              <TableCell className="px-1 font-medium text-right">{formatCurrency(ticket.finalAmount)}</TableCell>
            </TableRow>,
            expanded[ticket.id] && (
              <TableRow key={ticket.id+"-exp"} className="bg-gray-50/60">
                <TableCell colSpan={4} className="p-3">
                  <div className="grid gap-2 text-xs sm:grid-cols-3">
                    <div className="p-2 bg-white border rounded shadow-sm"><p className="text-[10px] text-gray-500">{t('cash.ticketSummary.totalTicket')}</p><p className="font-semibold">{formatCurrency(ticket.finalAmount)}</p></div>
                    <div className="p-2 bg-white border rounded shadow-sm"><p className="text-[10px] text-gray-500">{t('cash.ticketSummary.paid','Pagado')}</p><p className="font-semibold">{formatCurrency(getPaidAmount(ticket))}</p></div>
                    <div className="p-2 bg-white border rounded shadow-sm"><p className="text-[10px] text-gray-500">{t('cash.ticketSummary.deferred')}</p><p className="font-semibold">{formatCurrency(ticket.dueAmount || 0)}</p></div>
                  </div>
                  {ticket.payments?.length ? (
                    <div className="mt-3 space-y-1">
                      {ticket.payments.filter(pay => pay.paymentMethodDefinition.name !== t('cash.paymentMethods.deferredPayment')).map(pay => (
                        <div key={pay.id} className="flex items-center justify-between border rounded p-1 text-[10px] bg-white shadow-sm">
                          <span className="truncate">{pay.paymentMethodDefinition.name}{pay.posTerminal?.name ? ` (${pay.posTerminal.name})` : ''}</span>
                          <span className="font-medium">{formatCurrency(pay.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          ])}
        </TableBody>
      </Table>
    </ScrollArea>
    {/* Controles de paginación */}
    <div className="flex items-center justify-between px-1 mt-2 text-xs">
      <div className="flex items-center gap-1">
        <span>{t('common.rowsPerPage','Filas:')}</span>
        <select value={rowsPerPage} onChange={e=>{setRowsPerPage(parseInt(e.target.value)); setPage(1);}} className="border rounded px-1 py-0.5 text-xs bg-white focus:outline-none">
          {[5,10,25,50].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>
            &lt;
          </Button>
          <span>{page}/{totalPages}</span>
          <Button variant="ghost" size="icon" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>
            &gt;
          </Button>
        </div>
      </div>
    </>
  );
};

interface CardTPVSummaryProps {
  totals: Array<{ posId: string | null; posName: string; expectedTotal: number; expectedTickets: number; expectedDeferred: number }>;
  countedByPos: Record<string, string>;
  onCountedChange: (posId: string, val: string) => void;
  currency: string;
  onViewDetails: (posId: string | undefined) => void;
  totalHighlight: boolean;
}
const CardTPVSummary: React.FC<CardTPVSummaryProps> = ({ totals, countedByPos, onCountedChange, currency: _currency, onViewDetails, totalHighlight }) => {
  const { t } = useTranslation();
  const { activeClinic } = useClinic();
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: activeClinic?.currency || 'EUR' }).format(val);

  const [expanded, setExpanded] = React.useState(true);

  const totalExpected = totals.reduce((sum, pos) => sum + pos.expectedTotal, 0);
  const totalCounted = totals.reduce((sum, pos) => sum + (parseFloat(countedByPos[pos.posId || ''] || '0') || 0), 0);
  const totalDiff = totalCounted - totalExpected;

  const ticketsSum = totals.reduce((s, p) => s + p.expectedTickets, 0);
  const deferredSum = totals.reduce((s, p) => s + p.expectedDeferred, 0);

  return (
    <div className={`border rounded-lg p-4 bg-white shadow-sm ${totalHighlight ? 'border-red-500 animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-1 cursor-pointer" onClick={()=>setExpanded(!expanded)}>
        <h3 className="flex items-center text-sm font-medium text-gray-700">
          <CreditCard className="w-4 h-4 mr-2 text-purple-600" /> {t('cash.summary.totalCard', 'Total tarjeta')}
        </h3>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>

      {/* Importe total grande */}
      <p className="mb-1 text-xl font-semibold text-gray-800">{formatCurrency(totalExpected)}</p>

      {/* Contenido colapsable */}
      {expanded && (
        <div className="pr-1 mt-2 space-y-1 overflow-y-auto max-h-40 custom-scrollbar">
          {totals.map((pos) => {
            return (
              <div key={pos.posId || pos.posName} className="grid items-center grid-cols-3 gap-2 text-xs">
                <span className="truncate">{pos.posName}</span>
                <span className="font-medium text-right">{formatCurrency(pos.expectedTotal)}</span>
                <Input
                  type="number"
                  value={countedByPos[pos.posId || ''] || ''}
                  onChange={(e) => onCountedChange(pos.posId || '', e.target.value)}
                  className="h-6 text-xs text-right"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Subtotales */}
      <div className="mt-2 text-xs space-y-0.5 text-gray-600">
        <div className="flex justify-between"><span>{t('cash.summary.ticketsDay','Tickets del día')}:</span><span>{formatCurrency(ticketsSum)}</span></div>
        <div className="flex justify-between"><span>{t('cash.summary.debtPayments','Cobros Aplazados')}:</span><span>{formatCurrency(deferredSum)}</span></div>
      </div>

      {/* Resumen contado */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <span>{t('cash.summary.counted','Contado')}:</span>
        <span className={`font-medium ${totalDiff===0?'text-green-600': totalDiff>0? 'text-blue-600':'text-red-600'}`}>{formatCurrency(totalCounted)}</span>
      </div>
      {totalExpected>0 && <Button variant="link" size="sm" onClick={()=>onViewDetails(undefined)} className="text-[10px] h-auto px-0 mt-1">{t('common.viewAll','Ver todos')}</Button>}
    </div>
  );
} 