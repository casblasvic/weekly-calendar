import { useQuery, UseQueryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { PaymentMethodType, DebtStatus } from '@prisma/client';

export interface DebtPaymentItem {
  id: string;
  amount: number;
  paymentDate: string;
  status?: string | null; // COMPLETED | CANCELLED | ...
  notes?: string | null;
  paymentMethodDefinition: { id: string; name: string; type: PaymentMethodType } | null;
  user: { id: string; firstName: string | null; lastName: string | null } | null;
}

export interface DebtLedgerDetailResponse {
  id: string;
  ticketId: string;
  clinicId: string;
  originalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: DebtStatus;
  createdAt: string;
  payments: DebtPaymentItem[];
}

const ledgerKeys = {
  detail: (id: string | null) => ['debtLedgerDetail', id] as const,
};

export function useDebtLedgerDetailQuery(debtId: string | null, options?: Omit<UseQueryOptions<DebtLedgerDetailResponse, Error>, 'queryKey' | 'queryFn' | 'enabled'>) {
  return useQuery<DebtLedgerDetailResponse, Error>({
    queryKey: ledgerKeys.detail(debtId),
    queryFn: async () => {
      if (!debtId) throw new Error('ID de deuda requerido');
      return await api.cached.get<DebtLedgerDetailResponse>(`/api/debt-ledgers/${debtId}`);
    },
    enabled: !!debtId,
    staleTime: 0,
    ...options,
  });
}

interface CancelDebtPaymentPayload {
  paymentId: string;
  reason: string;
}

export function useCancelDebtPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, CancelDebtPaymentPayload>({
    mutationFn: async ({ paymentId, reason }) => {
      return await api.post(`/api/payments/${paymentId}/cancel`, { reason });
    },
    onSuccess: (_data, variables) => {
      // invalidar cualquier cosa relevante
      queryClient.invalidateQueries({ queryKey: ['debtLedgers'] });
      queryClient.invalidateQueries({ queryKey: ['debt'] });
      queryClient.invalidateQueries({ predicate: (query) => {
        const qk = query.queryKey as readonly unknown[];
        return Array.isArray(qk) && qk[0] === 'debtLedgerDetail';
      }});
    },
  });
}
