import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { DebtStatus } from '@prisma/client';

export interface DebtLedgerListItem {
  id: string;
  ticketId: string;
  clinicId: string;
  client: { id: string; firstName: string | null; lastName: string | null } | null;
  originalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: DebtStatus;
  createdAt: string;
  ticket: { ticketNumber: number | null; issueDate: string | null } | null;
  clinic: { id: string; name: string } | null;
}

interface GetDebtsParams {
  clinicId?: string;
  status?: DebtStatus;
}

export function useDebtLedgersQuery(params: GetDebtsParams = {}, options?: Omit<UseQueryOptions<DebtLedgerListItem[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<DebtLedgerListItem[], Error>({
    queryKey: ['debtLedgers', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.clinicId) searchParams.append('clinicId', params.clinicId);
      if (params.status) searchParams.append('status', params.status);
      const endpoint = `/api/debt-ledgers${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      return await api.cached.get<DebtLedgerListItem[]>(endpoint);
    },
    staleTime: 0,
    ...options,
  });
} 