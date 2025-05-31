"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { ChangeLog } from '@/lib/hooks/use-change-logs';

const ACTION_LABELS: Record<string, string> = {
  DEBT_PAYMENT_SETTLED: 'Pago aplazado registrado',
  DEBT_PAYMENT_CANCELLED: 'Pago aplazado anulado',
  DEBT_PAYMENT_ADJUSTED: 'Ajuste de deuda',
  TICKET_CREATED: 'Ticket creado',
  TICKET_UPDATED: 'Ticket actualizado',
  CASH_SESSION_OPENED: 'Caja abierta',
  CASH_SESSION_CLOSED: 'Caja cerrada',
  CASH_SESSION_REOPENED: 'Caja reabierta',
};

const PAGE_SIZE = 10;

interface Props {
  logs: ChangeLog[];
  initialDesc?: boolean;
}

export function ChangeLogsTable({ logs, initialDesc = true }: Props) {
  const { t } = useTranslation();
  const [orderDesc, setOrderDesc] = React.useState(initialDesc);
  const [page, setPage] = React.useState(1);

  // ordenar
  const sortedLogs = React.useMemo(() => {
    const base = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return orderDesc ? base : base.reverse();
  }, [logs, orderDesc]);

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / PAGE_SIZE));
  const currentSlice = sortedLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // helpers
  const formatDate = (dateStr: string) => format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: es });
  const actionLabel = (action: string) => ACTION_LABELS[action] ?? action;
  const userLabel = (u?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) => {
    if (!u) return '-';
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return name || u.email || '-';
  };

  const changePage = (delta: number) => {
    setPage((p) => {
      const next = p + delta;
      if (next < 1 || next > totalPages) return p;
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <Table className="text-xs md:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead
              className="cursor-pointer select-none flex items-center" // allow click on date head for toggle
              onClick={() => setOrderDesc((o) => !o)}
            >
              <span className="flex items-center gap-1">
                Fecha {orderDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </span>
            </TableHead>
            <TableHead>{t('logs.user','Usuario')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentSlice.map((l) => (
            <TableRow key={l.id}>
              <TableCell title={actionLabel(l.action)} className="max-w-[200px] truncate">
                {actionLabel(l.action)}
              </TableCell>
              <TableCell>{formatDate(l.timestamp)}</TableCell>
              <TableCell>{userLabel(l.user)}</TableCell>
            </TableRow>
          ))}
          {currentSlice.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-4 text-center text-gray-500">
                Sin registros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            className="px-2 py-1 border rounded disabled:opacity-40"
            onClick={() => changePage(-1)}
            disabled={page === 1}
          >
            {t('pagination.prev','Anterior')}
          </button>
          <span>
            {t('pagination.pageLabel','Página {{page}} / {{total}}',{page,total:totalPages})}
          </span>
          <button
            type="button"
            className="px-2 py-1 border rounded disabled:opacity-40"
            onClick={() => changePage(1)}
            disabled={page === totalPages}
          >
            {t('pagination.next','Siguiente')}
          </button>
        </div>
      )}
    </div>
  );
}
