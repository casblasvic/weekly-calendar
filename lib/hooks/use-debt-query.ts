import { UseQueryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { DebtStatus, PaymentMethodType } from '@prisma/client';

interface DebtLedgerResponse {
  id: string;
  ticketId: string;
  clinicId: string;
  originalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: DebtStatus;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    status?: string | null;
    paymentMethodDefinition: { id: string; name: string; type: PaymentMethodType } | null;
    user: { id: string; firstName: string | null; lastName: string | null } | null;
    clinicId: string | null;
  }>;
}

// --- QUERY KEYS ---
const debtKeys = {
  detailByTicket: (ticketId: string | null) => ['debt', 'ticket', ticketId] as const,
  detail: (debtId: string | null) => ['debt', debtId] as const,
};

/**
 * Obtiene la deuda abierta (o última) asociada a un ticket.
 */
export function useDebtByTicketQuery(ticketId: string | null, options?: Omit<UseQueryOptions<DebtLedgerResponse | null, Error, DebtLedgerResponse | null>, 'queryKey' | 'queryFn'>) {
  return useQuery<DebtLedgerResponse | null, Error>({
    queryKey: debtKeys.detailByTicket(ticketId),
    queryFn: async () => {
      if (!ticketId) return null;
      // Usamos petición sin caché para reflejar cancelaciones o nuevas liquidaciones inmediatamente
      return await api.get<DebtLedgerResponse | null>(`/api/tickets/${ticketId}/debt`);
    },
    enabled: !!ticketId,
    staleTime: 0,
    ...options,
  });
}

interface CreateDebtPaymentPayload {
  debtLedgerId: string;
  amount: number;
  paymentMethodDefinitionId: string;
  clinicId: string;
  paymentDate?: string;
  notes?: string;
  transactionReference?: string;
}

/**
 * Mutación para crear un pago que liquide (total o parcialmente) una deuda.
 */
export function useCreateDebtPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, CreateDebtPaymentPayload>({
    mutationFn: async (payload) => {
      return await api.post('/api/payments/debt', payload);
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas con deuda para reflejar cambios en todas las vistas
      queryClient.invalidateQueries({ queryKey: ['debt'] });
      queryClient.invalidateQueries({ queryKey: ['debtLedgers'] });
      if (variables.debtLedgerId) {
        queryClient.invalidateQueries({ queryKey: debtKeys.detail(variables.debtLedgerId) });
      }
    },
  });
}

export function useSettleDebtPaymentMutation() {
  // Alias para mayor semántica
  return useCreateDebtPaymentMutation();
} 