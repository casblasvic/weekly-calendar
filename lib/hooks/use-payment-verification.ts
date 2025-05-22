import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query';
import type { Payment, PaymentMethodType } from '@prisma/client';

export interface PendingVerificationPayment extends Payment {
  paymentMethodDefinition: { id: string; name: string; type: PaymentMethodType };
  posTerminal?: { name: string | null } | null;
  ticket?: { ticketNumber: string | null; client?: { firstName: string; lastName: string | null } | null } | null;
  invoice?: { invoiceNumber: string } | null;
}

export interface PendingFilters {
  clinicId: string | null;
  sessionId?: string | null;
  methodType?: PaymentMethodType;
  posTerminalId?: string | null;
}

export function usePendingPaymentVerificationsQuery(
  filters: PendingFilters,
  options?: Omit<UseQueryOptions<PendingVerificationPayment[], Error>, 'queryKey' | 'queryFn'>
) {
  const { clinicId, sessionId, methodType, posTerminalId } = filters;
  const query = new URLSearchParams();
  if (clinicId) query.append('clinicId', clinicId);
  if (sessionId) query.append('sessionId', sessionId);
  if (methodType) query.append('methodType', methodType);
  if (posTerminalId) query.append('posTerminalId', posTerminalId);

  return useQuery<PendingVerificationPayment[], Error>({
    queryKey: ['payments', 'pendingVerification', Object.fromEntries(query)],
    queryFn: async () => {
      if (!clinicId) return [];
      const resp = await api.get<{ data: PendingVerificationPayment[] }>(`/api/payments/pending-verification?${query.toString()}`);
      return resp.data;
    },
    enabled: !!clinicId,
    staleTime: CACHE_TIME.CORTO,
    ...options,
  });
}

export function useVerifyPaymentMutation() {
  return useMutation<{ ok: true }, Error, { paymentId: string; verified?: boolean; attachmentUrl?: string }>({
    mutationFn: (vars) => api.patch<{ ok: true }>(`/api/payments/${vars.paymentId}/verify`, vars),
  });
} 