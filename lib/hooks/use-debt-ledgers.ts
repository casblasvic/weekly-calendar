import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { DebtStatus } from '@prisma/client';

export interface DebtLedgerListItem {
  id: string;
  ticketId: string;
  clinicId: string;
  person: { id: string; firstName: string | null; lastName: string | null } | null;
  originalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: DebtStatus;
  createdAt: string;
  ticket: {
    ticketNumber: number | null;
    issueDate: string | null;
    cashSession?: {
      id: string;
      status: string; // Consider using CashSessionStatus enum if available/imported
    } | null;
  } | null;
  clinic: { id: string; name: string } | null;
}

export interface UseDebtLedgersQueryOptions {
  clinicId?: string | null;
  status?: DebtStatus | null;
  personId?: string | null;
  personNameSearch?: string | null;
  ticketNumberSearch?: string | null;
  dateFrom?: string | null; // ISO date string
  dateTo?: string | null;   // ISO date string
  page?: number;
  pageSize?: number;
}

export interface DebtLedgersResponse {
  debts: DebtLedgerListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export function useDebtLedgersQuery(
  params: UseDebtLedgersQueryOptions = {},
  options?: Omit<UseQueryOptions<DebtLedgersResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DebtLedgersResponse, Error>({
    queryKey: ['debtLedgers', params], // Include all params in queryKey for proper caching
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.clinicId) searchParams.append('clinicId', params.clinicId);
      if (params.status) searchParams.append('status', params.status);
      if (params.personId) searchParams.append('personId', params.personId);
      if (params.personNameSearch) searchParams.append('personNameSearch', params.personNameSearch);
      if (params.ticketNumberSearch) searchParams.append('ticketNumberSearch', params.ticketNumberSearch);
      if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) searchParams.append('dateTo', params.dateTo);
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());

      const endpoint = `/api/debt-ledgers${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      return await api.cached.get<DebtLedgersResponse>(endpoint);
    },
    staleTime: 0, // Consider adjusting staleTime based on how fresh data needs to be
    ...options,
  });
} 