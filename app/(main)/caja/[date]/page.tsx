"use client";

import React, { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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
import { ArrowLeft, Wallet, CreditCard, Landmark, Ticket as TicketIcon, Gift, CircleDollarSign, Printer, Info, X, Check, Save, Loader2, ChevronRight, ChevronDown, Eye, ShieldCheck, RefreshCcw } from 'lucide-react';
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

interface CashPageProps {
  params: Promise<{ date: string }>;
}

export default function CashPage({ params }: CashPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { activeClinic } = useClinic();
  const { toast } = useToast();

  const { date } = use(params); // Unwrap
  const clinicId = searchParams.get('clinicId') || activeClinic?.id;

  const { data: sessionData, isLoading, isError, refetch } = useDailyCashSessionQuery(clinicId, date);
  const session = sessionData; // Para no renombrar en todo el código por ahora

  const [closeFormData, setCloseFormData] = useState<Partial<CloseCashSessionPayload>>({});

  const closeSessionMutation = useCloseCashSessionMutation();
  const reopenMutation = useReopenCashSessionMutation();
  const reconcileMutation = useReconcileCashSessionMutation();

  // Verificación de pagos
  const [drawerFilters, setDrawerFilters] = useState<{methodType: PaymentMethodType | null, posTerminalId?: string|null}>({methodType: null});
  const [isVerifyDrawerOpen, setIsVerifyDrawerOpen] = useState(false);

  const { data: pendingPayments = [], refetch: refetchPending } = usePendingPaymentVerificationsQuery({ clinicId, sessionId: session?.id || undefined, methodType: drawerFilters.methodType || undefined, posTerminalId: drawerFilters.posTerminalId });
  const verifyMutation = useVerifyPaymentMutation();

  const { data: totals } = useCashSessionTotalsQuery(session?.id);
  const [countedByPos, setCountedByPos] = useState<Record<string,string>>({});
  const [countedTransfer, setCountedTransfer] = useState('');
  const [countedCheck, setCountedCheck] = useState('');

  // Sincronizar countedCard total según recuento por TPV
  useEffect(() => {
    const total = Object.values(countedByPos).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    setCloseFormData(prev => ({ ...prev, countedCard: total }));
  }, [countedByPos]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: activeClinic?.currency || 'EUR' }).format(val);

  // --- NUEVOS CÁLCULOS BASADOS EN totals (totales por TPV) ---
  const cardTotalsAvailable = !!totals;

  const totalCardAmountFromTotals = cardTotalsAvailable ? totals!.cardByPos.reduce((sum, pos) => sum + pos.expectedTotal, 0) : null;
  const cardDetailsFromTotals = cardTotalsAvailable ? totals!.cardByPos.flatMap(pos => [
    { label: `${t('cash.summary.terminal', 'TPV')}: ${pos.posName}`, value: pos.expectedTotal, isHeader: true },
    { label: t('cash.summary.ticketsDay', 'Tickets del día'), value: pos.expectedTickets, isSubDetail: true },
    { label: t('cash.summary.debtPayments', 'Cobros Aplazados'), value: pos.expectedDeferred, isSubDetail: true },
  ]) : [];

  const transferTotalsFromTotals = cardTotalsAvailable ? totals!.transfer : null;
  const checkTotalsFromTotals = cardTotalsAvailable ? totals!.check : null;

  const transferAmount = transferTotalsFromTotals?.expectedTotal ?? 0;
  const checkAmount = checkTotalsFromTotals?.expectedTotal ?? 0;

  const cardHighlight = cardTotalsAvailable ? totals!.cardByPos.some(pos => pos.expectedDeferred > 0) : false;

  // --- FIN NUEVOS CÁLCULOS ---

  const paymentsForDrawer = React.useMemo(()=>{
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
          clientName: ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName||''}`.trim(): '',
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
            clientName: ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName||''}`.trim(): '',
            posName: '—',
            amount: deferredAmount,
            methodName: t('cash.summary.deferredTotal','Pago aplazado'),
            paymentId: ticket.id,
          });
        }
      });
    }
    return arr;
  },[session, drawerFilters]);

  const cashPaymentsCount = paymentsForDrawer.filter(p=>p.methodName && drawerFilters.methodType===PaymentMethodType.CASH).length;

  const hasCashPayments = React.useMemo(()=>{
    if(!session) return false;
    return session.ticketsAccountedInSession?.some(ticket=>ticket.payments?.some(p=>p.paymentMethodDefinition.type===PaymentMethodType.CASH));
  },[session]);

  const {data:logData=[]}=useChangeLogs('CASH_SESSION',session?.id);
  const logs=logData.map(l=>({event:l.action,time:new Date(l.timestamp),user:l.user?`${l.user.firstName||''} ${l.user.lastName||''}`.trim():undefined}));

  const formatDateClinic = (d:Date)=>{
    const tz = (activeClinic as any)?.country?.timezone || undefined;
    return new Intl.DateTimeFormat('es-ES',{dateStyle:'short', timeStyle:'short', timeZone: tz}).format(d);
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
        <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}</Button>
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
        <Button onClick={() => router.back()} variant="outline" size="sm"><ArrowLeft className="w-3.5 h-3.5 mr-1" />{t('common.back')}</Button>
      </div>
    );
  }

  const handleInputChange = (field: keyof CloseCashSessionPayload, value: string | number) => {
    setCloseFormData(prev => ({ ...prev, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value }));
  };

  const handleCloseSession = async () => {
    if (!session) return;

    // Asegurar que contamos efectivo mínimo
    const countedCashValue = (closeFormData.countedCash ?? parseFloat(countedCashUI as any)) || 0;
    if (isNaN(countedCashValue)) {
      toast({ variant:'destructive', title:t('cash.error','Falta efectivo contado')});
      return;
    }

    const payload: CloseCashSessionPayload = {
      countedCash: countedCashValue,
      countedCard: closeFormData.countedCard ?? undefined,
      countedBankTransfer: closeFormData.countedBankTransfer ?? undefined,
      countedCheck: closeFormData.countedCheck ?? undefined,
      countedInternalCredit: closeFormData.countedInternalCredit ?? undefined,
      countedOther: closeFormData.countedOther ?? undefined,
      countedCashWithdrawal: closeFormData.countedCashWithdrawal ?? undefined,
      notes: closeFormData.notes ?? undefined,
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
    }
  };

  // Valores para UI, considerando que `session` puede ser null inicialmente
  const openingBalanceCash = session?.openingBalanceCash ?? 0;
  const expectedCash = session?.expectedCash ?? 0;
  const paymentTotals: CashSessionPaymentTotal[] = session?.paymentTotals || [];
  const ticketsInSession: CashSessionTicket[] = session?.ticketsAccountedInSession || [];

  const currentStatus = session?.status;
  const isSessionOpen = currentStatus === CashSessionStatus.OPEN;

  // Para los inputs, usar valores de la sesión si está cerrada/reconciliada, o del form si está abierta
  const countedCashUI = isSessionOpen ? (closeFormData.countedCash ?? '') : (session?.countedCash ?? '');
  const differenceCashUI = isSessionOpen ? ((closeFormData.countedCash ?? 0) - expectedCash) : (session?.differenceCash ?? 0);
  const cashWithdrawalUI = isSessionOpen ? (closeFormData.countedCashWithdrawal ?? '') : ((session as any)?.cashWithdrawal ?? '');
  const nextDayOpeningCashUI = isSessionOpen ? ((closeFormData.countedCash ?? 0) - (closeFormData.countedCashWithdrawal ?? 0)) : ((session?.countedCash ?? 0) - ((session as any)?.cashWithdrawal ?? 0));

  const notesUI = isSessionOpen ? (closeFormData.notes ?? '') : (session?.notes ?? '');

  const hasPendingTransfer = pendingPayments.some(p=>p.paymentMethodDefinition.type==='BANK_TRANSFER');
  const hasPendingCheck = pendingPayments.some(p=>p.paymentMethodDefinition.type==='CHECK');

  return (
    <div className="container px-4 py-6 mx-auto space-y-6">
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
                {/* Efectivo */}
                <SummaryCard 
                  title={t('cash.summary.totalCash', 'Total efectivo')} 
                  amount={paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.CASH)?.totalAmount || 0}
                  icon={Wallet}
                  details={[
                    { label: t('cash.summary.ticketsDay', 'Tickets del día'), value: paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.CASH)?.directAmount || 0 },
                    { label: t('cash.summary.debtPayments', 'Cobros Aplazados'), value: paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.CASH)?.debtPaymentAmount || 0 },
                  ]}
                  highlight={paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.CASH)?.totalAmount !== paymentTotals.find(pt => pt.paymentMethodType === PaymentMethodType.CASH)?.directAmount}
                  onViewDetails={hasCashPayments ? ()=>{ setDrawerFilters({methodType: PaymentMethodType.CASH}); setIsVerifyDrawerOpen(true);} : undefined}
                  extra={(
                    <div className="flex items-center justify-between gap-1 mt-2 text-xs">
                      <span>{t('cash.summary.counted','Contado')}:</span>
                      <Input type="number" value={countedCashUI} onChange={e=>handleInputChange('countedCash', e.target.value)} className="w-20 text-xs h-7" step="0.01" placeholder="0.00" />
                      <span className={`font-medium ${differenceCashUI===0?'text-green-600':differenceCashUI>0?'text-blue-600':'text-red-600'}`}>{formatCurrency(differenceCashUI)}</span>
                    </div>
                  )}
                />
                {/* Tarjeta con TPVs */}
                <CardTPVSummary
                  totals={totals?.cardByPos || []}
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
                      <span className="font-medium">{formatCurrency((parseFloat(countedTransfer)||0) - transferAmount)}</span>
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
                      <span className="font-medium">{formatCurrency((parseFloat(countedCheck)||0) - checkAmount)}</span>
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
                  amount={totals?.deferred.amount || 0} 
                  icon={CircleDollarSign} 
                  details={[]} 
                  highlight={false}
                  onViewDetails={(totals?.deferred.amount||0)>0 ? ()=>{ setDrawerFilters({ methodType: PaymentMethodType.DEFERRED_PAYMENT }); setIsVerifyDrawerOpen(true);} : undefined }
                />
              </div>
            </TabsContent>
            <TabsContent value="tickets" className="pt-4 space-y-4">
              <h3 className="font-semibold text-gray-700 text-md">{t('cash.tabs.ticketsInSection','Tickets en esta Sesión')}</h3>
              <CashSessionTicketsTable tickets={ticketsInSession || []} currency={activeClinic?.currency || 'EUR'} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6 lg:sticky lg:top-6"> {/* Sidebar fija en scroll largo */}
          <UserInfoCard user={session?.user} />

          {/* Historial de cambios */}
          <Accordion type="single" collapsible className="bg-white border rounded-lg shadow">
            <AccordionItem value="item-1">
              <AccordionTrigger className="flex items-center justify-between px-4 py-2 text-sm font-medium">
                <span>{t('cash.logs','Historial de cambios')}</span>
                <span className="ml-2 text-xs text-gray-500">{logs.length}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                {logs.length===0 ? (
                  <p className="text-xs text-gray-500">{t('cash.logs.none','Sin cambios')}</p>
                ) : (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <th>{t('cash.logs.event','Evento')}</th>
                        <th>{t('cash.logs.when','Fecha')}</th>
                        <th>{t('cash.logs.who','Usuario')}</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log,idx)=>(
                        <TableRow key={idx}>
                          <TableCell>{log.event}</TableCell>
                          <TableCell>{formatDateClinic(log.time)}</TableCell>
                          <TableCell>{log.user||'-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="p-4 bg-white border rounded-lg shadow">
            <h3 className="mb-3 text-sm font-semibold">{t('cash.sidebar.title', 'Cierre de Caja')}</h3>
            <div className="space-y-3 text-xs">
              <InfoRow label={t('cash.sidebar.initialCash', 'Caja inicial')} value={formatCurrency(openingBalanceCash)} />
              <InfoRow label={t('cash.sidebar.expectedCash', 'Total efectivo (Calculado)')} value={formatCurrency(expectedCash)} />
              
              <InputRow label={t('cash.sidebar.countedCash', 'Pagos por caja')} type="number" value={countedCashUI} onChange={e => handleInputChange('countedCash', e.target.value)} disabled={!isSessionOpen} />
              <InfoRow label={t('cash.sidebar.difference', 'DIFERENCIA EFECTIVO')} value={formatCurrency(differenceCashUI)} className={`font-bold ${differenceCashUI === 0 ? 'text-green-600' : (differenceCashUI > 0 ? 'text-blue-600' : 'text-red-600')}`} />
              
              <InfoRow label={t('cash.sidebar.finalCount', 'RECUENTO CAJA FINAL EFECTIVO')} value={formatCurrency(parseFloat(countedCashUI.toString()) || 0)} className="font-semibold" />
              <InputRow label={t('cash.sidebar.cashWithdrawal', 'Cantidad retirada')} type="number" value={cashWithdrawalUI} onChange={e => handleInputChange('countedCashWithdrawal', e.target.value)} disabled={!isSessionOpen} />

              {/* Resumen Totales */}
              {!isSessionOpen && (
                <div className="pt-2 mt-3 space-y-1 border-t">
                  <InfoRow label={t('cash.sidebar.totalFacturado','Total facturado')}
                    value={formatCurrency(paymentTotals.reduce((s,pt)=>s+pt.totalAmount,0))} />
                  <InfoRow label={t('cash.sidebar.totalDifference','Diferencia efectiva')} value={formatCurrency(differenceCashUI)} />
                  <InfoRow label={t('cash.sidebar.totalWithdrawn','Total retirado')} value={formatCurrency((session as any)?.cashWithdrawal || 0)} />
                </div>
              )}
            </div>
            <div className="pt-3 mt-4 border-t">
              <InfoRow label={t('cash.sidebar.nextDayOpening', 'Caja inicial día siguiente')} value={formatCurrency(nextDayOpeningCashUI)} isLarge />
            </div>
            {/* Comentarios supervisor */}
            <div className="mt-4">
              <Label className="text-xs">{t('cash.comments','Comentario supervisor')}</Label>
              <Textarea value={notesUI} onChange={e=>handleInputChange('notes',e.target.value)} className="h-20 mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer fijo usando estrategia de Layout */}
      <footer 
        className="fixed bottom-0 right-0 z-40 flex items-center justify-end p-3 border-t shadow-sm bg-white/80 backdrop-blur-sm"
        style={{ left: 'var(--sidebar-width, 0px)', width: 'calc(100% - var(--sidebar-width, 0px))' }}
      >
        <Button variant="outline" onClick={() => router.back()} size="sm"><ArrowLeft className="w-3.5 h-3.5 mr-1" />{t('common.back')}</Button>
        <Button variant="outline" onClick={() => alert('Imprimir')} size="sm" className="ml-2"><Printer className="w-3.5 h-3.5 mr-1" />{t('common.print')}</Button>
        <Button variant="outline" onClick={() => alert('Comentarios')} size="sm" disabled className="ml-2"><Info className="w-3.5 h-3.5 mr-1" />{t('common.comments')}</Button>
        {isSessionOpen && (
          <Button onClick={() => {
            if(window.confirm(t('cash.closeModal.title','Confirmar Cierre de Caja')+"?")) handleCloseSession();
          }} size="sm" className="ml-2 text-white bg-purple-600 hover:bg-purple-700" disabled={pendingPayments.some(p=>p.cashSessionId===session.id)}>
            <Save className="w-3.5 h-3.5 mr-1" />{t('cash.closeSession', 'Cerrar Caja')}
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
              {drawerFilters.methodType===PaymentMethodType.DEFERRED_PAYMENT ? t('cash.verifyDrawer.deferredTitle','Pagos aplazados en tickets') : `${t('cash.verifyDrawer.title','Pagos pendientes')} - ${drawerFilters.methodType || 'ALL'}`}
            </DrawerTitle>
            <DrawerDescription className="flex items-center justify-between">
              {t('cash.verifyDrawer.description','Revisa y confirma transferencias y cheques.')}
              <Button variant="ghost" size="icon" onClick={()=>refetchPending()}><RefreshCcw className="w-4 h-4" /></Button>
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-2 text-xs">
            {pendingPayments.length===0 ? (
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
}
const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, icon: Icon, details, onViewDetails, highlight, extra }) => {
  const { t } = useTranslation();
  const { activeClinic } = useClinic();
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: activeClinic?.currency || 'EUR' }).format(val);

  return (
    <div className={`border rounded-lg p-4 bg-white shadow-sm ${highlight ? 'border-red-500 animate-pulse' : ''}`}>
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
}
const CashSessionTicketsTable: React.FC<CashSessionTicketsTableProps> = ({ tickets, currency }) => {
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
                <span>{ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName || ''}`.trim() : '-'}</span>
                <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); router.push(`/facturacion/tickets/editar/${ticket.id}`)}}>
                  <Eye className="w-4 h-4 text-purple-600" />
                </Button>
              </TableCell>
              <TableCell className="px-1 font-medium text-right">{formatCurrency(ticket.finalAmount)}</TableCell>
            </TableRow>,
            expanded[ticket.id] && (
              <TableRow key={ticket.id+"-exp"} className="bg-gray-50/60">
                <TableCell colSpan={3} className="p-3">
                  <div className="grid gap-2 text-xs sm:grid-cols-3">
                    <div className="p-2 bg-white border rounded shadow-sm"><p className="text-[10px] text-gray-500">{t('cash.ticketSummary.totalTicket')}</p><p className="font-semibold">{formatCurrency(ticket.finalAmount)}</p></div>
                    <div className="p-2 bg-white border rounded shadow-sm"><p className="text-[10px] text-gray-500">{t('cash.ticketSummary.paid')}</p><p className="font-semibold">{formatCurrency(getPaidAmount(ticket))}</p></div>
                    <div className="p-2 bg-white border rounded shadow-sm"><p className="text-[10px] text-gray-500">{t('cash.ticketSummary.deferred')}</p><p className="font-semibold">{formatCurrency(ticket.dueAmount || 0)}</p></div>
                  </div>
                  {ticket.payments?.length ? (
                    <div className="grid gap-2 mt-2 sm:grid-cols-2 md:grid-cols-3">
                      {ticket.payments.map(pay => (
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
    </ScrollArea>
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