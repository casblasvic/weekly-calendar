import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query';
import { PaymentMethodType } from '@prisma/client';

export interface PosCardTotal {
  posId: string | null;
  posName: string;
  expectedTickets: number;
  expectedDeferred: number;
  expectedTotal: number;
}

export interface CashSessionTotalsResponse {
  cardByPos: PosCardTotal[];
  transfer: { expectedTickets: number; expectedDeferred: number; expectedTotal: number };
  check: { expectedTickets: number; expectedDeferred: number; expectedTotal: number };
  deferred: { amount: number };
}

export function useCashSessionTotalsQuery(
  sessionId: string | undefined | null,
  options?: Omit<UseQueryOptions<CashSessionTotalsResponse, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<CashSessionTotalsResponse, Error>({
    queryKey: ['cashSession', 'totalsByPos', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('sessionId required');
      return await api.get<CashSessionTotalsResponse>(`/api/cash-sessions/${sessionId}/totals-by-pos`);
    },
    enabled: !!sessionId,
    staleTime: CACHE_TIME.CORTO,
    ...options,
  });
} 