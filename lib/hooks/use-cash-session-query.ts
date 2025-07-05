/*
 * 💶 use-cash-session-query — Caja-día persistida (clave clinicId + fecha)
 * @see docs/PERSISTENT_CACHE_STRATEGY.md
 */
import { UseQueryOptions, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api-client'; 
import { CACHE_TIME } from '@/lib/react-query'; 
import type { CashSession, CashSessionStatus, User, Clinic, PosTerminal, Payment, Ticket, PaymentMethodType, PaymentType, Prisma } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';

// Tipos para la respuesta de la API de CashSession (detalle)
export type CashSessionDetailResponse = CashSession & {
  user: Pick<User, 'id' | 'firstName' | 'lastName'>;
  clinic: Pick<Clinic, 'id' | 'name'>;
  posTerminal?: Pick<PosTerminal, 'id' | 'name'> | null;
  payments: (Payment & { 
    paymentMethodDefinition: { id: string; name: string; type: string }; 
    ticket: { id: string; ticketNumber: string | null } | null; 
  })[]; 
  ticketsAccountedInSession: (Ticket & {
    client: { id: string; firstName: string; lastName: string | null; } | null;
  })[];
};

// Definición de CashSessionTicket para usar en CashSessionResponse
export interface CashSessionTicket {
  id: string;
  ticketNumber: string | null;
  finalAmount: number;
  paidAmountDirectly?: number;
  hasOpenDebt?: boolean;
  dueAmount?: number | null;
  person: { firstName: string; lastName: string | null } | null;
  payments?: TicketPaymentSummary[];
}

// Tipos para el payload de creación de CashSession
export interface CreateCashSessionPayload {
  clinicId: string;
  openingBalanceCash: number;
  posTerminalId?: string;
}

// Tipos para el payload de cierre de CashSession
export interface CloseCashSessionPayload {
  countedCash?: number | null;
  manualCashInput?: number | null; // Cash added manually during this session
  cashWithdrawals?: number | null; // Cash physically withdrawn at close
  cashExpenses?: number | null; // Cash expenses paid out from the drawer during this session
  countedCard?: number | null;
  countedBankTransfer?: number | null;
  countedCheck?: number | null;
  countedInternalCredit?: number | null;
  countedOther?: Record<string, number> | null; // Prisma.JsonValue o un tipo más específico
  notes?: string | null;
}

// Tipos para el payload de conciliación de CashSession
export interface ReconcileCashSessionPayload {
  reconciliationNotes?: string;
}

// Claves de Query para CashSession
export const cashSessionKeys = {
  all: ['cashSessions'] as const,
  lists: () => [...cashSessionKeys.all, 'list'] as const,
  list: (filters: string) => [...cashSessionKeys.lists(), { filters }] as const,
  details: () => [...cashSessionKeys.all, 'detail'] as const,
  detail: (id: string | null) => [...cashSessionKeys.details(), id] as const,
  active: (clinicId?: string, posTerminalId?: string) => [...cashSessionKeys.all, 'active', { clinicId, posTerminalId }] as const,
  detailByDate: (clinicId: string | undefined | null, identifier: { date?: string | null | undefined; sessionId?: string | null | undefined; }) => [...cashSessionKeys.all, 'detailByDate', { clinicId, ...identifier }] as const,
};

// Placeholder para futuros hooks

/**
 * Hook para crear/abrir una nueva sesión de caja.
 */
export function useCreateCashSessionMutation() {
  const queryClient = useQueryClient();

  // La API POST /api/cash-sessions devuelve la CashSession creada (sin todas las relaciones de DetailResponse)
  // Podríamos usar CashSession como tipo de retorno aquí, o un tipo más específico si la API devuelve algo diferente.
  return useMutation<CashSession, Error, CreateCashSessionPayload>({
    mutationFn: async (data: CreateCashSessionPayload) => {
      return await api.post<CashSession>('/api/cash-sessions', data);
    },
    onSuccess: (newlyCreatedSession) => {
      // Invalidar la lista de sesiones para que se actualice.
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.lists() });
      // Invalidar la query de sesión activa para esta clínica/TPV.
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.active(newlyCreatedSession.clinicId, newlyCreatedSession.posTerminalId || undefined) });
      // Opcionalmente, podríamos establecer el dato de la query de detalle para esta nueva sesión si fuera necesario:
      // queryClient.setQueryData(cashSessionKeys.detail(newlyCreatedSession.id), newlyCreatedSession);
      toast({
        title: "Caja Abierta",
        description: `La sesión de caja número ${newlyCreatedSession.sessionNumber} ha sido abierta correctamente.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al Abrir Caja",
        description: error.message || "No se pudo abrir la sesión de caja.",
      });
    },
  });
}

/**
 * Hook para obtener la sesión de caja activa para una clínica (y opcionalmente TPV).
 */
export function useActiveCashSessionQuery(
  clinicId: string | undefined,
  posTerminalId?: string | null,
  options?: Omit<UseQueryOptions<CashSession | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<CashSession | null, Error>({
    queryKey: cashSessionKeys.active(clinicId, posTerminalId || undefined),
    queryFn: async () => {
      if (!clinicId) return null; // No intentar buscar si no hay clinicId
      
      const params = new URLSearchParams();
      params.append('clinicId', clinicId);
      if (posTerminalId) {
        params.append('posTerminalId', posTerminalId);
      }
      // La API GET /api/cash-sessions/active devuelve CashSession o null/404
      try {
        return await api.get<CashSession | null>(`/api/cash-sessions/active?${params.toString()}`);
      } catch (error:any) {
        if (error.response && error.response.status === 404) {
          return null; // Considerar 404 como "no hay sesión activa"
        }
        throw error; // Re-lanzar otros errores
      }
    },
    enabled: !!clinicId, // Solo ejecutar si clinicId está presente
    staleTime: CACHE_TIME.CORTO,
    ...options,
  });
}

/**
 * Hook para obtener los detalles de una sesión de caja específica.
 */
export function useCashSessionDetailQuery(
  sessionId: string | null | undefined,
  options?: Omit<UseQueryOptions<CashSessionDetailResponse, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<CashSessionDetailResponse, Error>({
    queryKey: cashSessionKeys.detail(sessionId || null),
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID is required for detail view');
      // La API GET /api/cash-sessions/[id] debe devolver el tipo CashSessionDetailResponse
      return await api.get<CashSessionDetailResponse>(`/api/cash-sessions/${sessionId}`);
    },
    enabled: !!sessionId,
    staleTime: CACHE_TIME.CORTO,
    ...options,
  });
}

/**
 * Hook para cerrar una sesión de caja.
 */
export function useCloseCashSessionMutation() {
  const queryClient = useQueryClient();

  // La API PUT /api/cash-sessions/[id] (para cerrar) devuelve la CashSession actualizada (CashSessionDetailResponse)
  return useMutation<CashSessionDetailResponse, Error, { sessionId: string; data: CloseCashSessionPayload }>({
    mutationFn: async ({ sessionId, data }) => {
      // El endpoint real es PUT /api/cash-sessions/[id] para cerrar la caja, según lo implementado.
      return await api.put<CashSessionDetailResponse>(`/api/cash-sessions/${sessionId}`, data);
    },
    onSuccess: (updatedSession, variables) => {
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.detail(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.active(updatedSession.clinicId, updatedSession.posTerminalId || undefined) });
      // Invalida todas las listas, sin importar filtros
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.lists(), exact: false });
      // Contador de abiertas
      queryClient.invalidateQueries({ queryKey: [...cashSessionKeys.lists(), 'openCount', updatedSession.clinicId] });
      // Invalidar tickets para que se actualice su estado
      queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false });
      
      toast({
        title: "Caja Cerrada",
        description: `La sesión de caja número ${updatedSession.sessionNumber} ha sido cerrada.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al Cerrar Caja",
        description: error.message || "No se pudo cerrar la sesión de caja.",
      });
    },
  });
}

/**
 * Hook para conciliar una sesión de caja cerrada.
 */
export function useReconcileCashSessionMutation() {
  const queryClient = useQueryClient();

  // La API PUT /api/cash-sessions/[id]/reconcile devuelve la CashSession actualizada (CashSessionDetailResponse)
  return useMutation<CashSessionDetailResponse, Error, { sessionId: string; data: ReconcileCashSessionPayload }>({
    mutationFn: async ({ sessionId, data }) => {
      return await api.put<CashSessionDetailResponse>(`/api/cash-sessions/${sessionId}/reconcile`, data);
    },
    onSuccess: (updatedSession, variables) => {
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.detail(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.lists() });
      toast({
        title: "Caja Conciliada",
        description: `La sesión de caja número ${updatedSession.sessionNumber} ha sido conciliada.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al Conciliar Caja",
        description: error.message || "No se pudo conciliar la sesión de caja.",
      });
    },
  });
}

// Tipos para los filtros de la consulta de CashSession
export interface CashSessionFilters {
  clinicId?: string; // Hacer opcional para que coincida con el schema de Zod del backend
  status?: CashSessionStatus | CashSessionStatus[];
  userId?: string;
  posTerminalId?: string;
  startDate?: string; // Formato YYYY-MM-DD
  endDate?: string;   // Formato YYYY-MM-DD
  page?: number;
  pageSize?: number;
}

// Tipos para la respuesta paginada de CashSessions

// Interface for individual items in the cash session list from GET /api/cash-sessions
export interface CashSessionListItem {
  id: string;
  sessionNumber: string;
  userId: string;
  clinicId: string;
  posTerminalId: string | null;
  openingBalanceCash: number;
  manualCashInput: number;
  cashWithdrawals: number;
  expectedCash: number;
  countedCash: number;
  differenceCash: number;
  status: CashSessionStatus;
  openingTime: string; // Dates are stringified in JSON
  closingTime: string | null;
  reconciliationTime: string | null;
  notes: string | null;
  systemId: string;
  countedCard: number;
  countedBankTransfer: number;
  countedCheck: number;
  countedInternalCredit: number;
  countedOther: Prisma.JsonValue; 
  hasChangesAfterReconcile: boolean;
  calculatedDeferredAtClose: number;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
  clinic: Pick<Clinic, 'id' | 'name' | 'currency'> | null;
  posTerminal: Pick<PosTerminal, 'id' | 'name'> | null;
  ticketsAccountedInSession: Array<{
    id: string;
    ticketNumber: string | null;
    finalAmount: number;
    client: { id: string; firstName: string; lastName: string | null; } | null;
  }>;
  totalFacturadoEnSesion: number;
}

// (CashSession base, no el DetailResponse completo para listas)
export type PaginatedCashSessionsResponse = {
  data: CashSessionListItem[]; 
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Hook para obtener una lista paginada de sesiones de caja.
 */
export function useCashSessionsQuery(
  filters: CashSessionFilters,
  options?: Omit<UseQueryOptions<PaginatedCashSessionsResponse, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = [cashSessionKeys.list(JSON.stringify(filters))]; // Incluir filtros en la queryKey para unicidad

  const queryFn = async (): Promise<PaginatedCashSessionsResponse> => {
    // La validación de clinicId (si es mandatorio para esta ruta) se hará en el backend
    // o la query no se habilitará desde el componente si falta.

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });
    return await api.get<PaginatedCashSessionsResponse>(`/api/cash-sessions?${params.toString()}`);
  };

  return useQuery<PaginatedCashSessionsResponse, Error>({
    queryKey,
    queryFn,
    enabled: !!filters.clinicId, // Solo ejecutar si clinicId está presente
    staleTime: CACHE_TIME.CORTO,
    ...options,
  });
}

export interface CashSessionPaymentTotal {
  paymentMethodType: PaymentMethodType;
  posTerminalId: string | null;
  posTerminalName?: string | null;
  directAmount: number;
  debtPaymentAmount: number;
  totalAmount: number;
}

export interface CashSessionResponse {
  id: string;
  sessionNumber: string;
  openingTime: string;
  closingTime: string | null;
  status: CashSessionStatus;
  openingBalanceCash: number;
  paymentTotals: CashSessionPaymentTotal[];
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  countedCash: number | null;
  expectedCash?: number | null;
  differenceCash: number | null;
  ticketsAccountedInSession?: CashSessionTicket[];
  notes?: string | null;
  countedCard?: number | null;
  countedBankTransfer?: number | null;
  countedCheck?: number | null;
  countedInternalCredit?: number | null;
  countedOther?: any | null; // Prisma.JsonValue
  manualCashInput?: number | null;
  cashWithdrawals?: number | null;
  cashExpenses?: number | null; // Added to reflect value stored at closing
  hasEarlierOpenSession?: boolean;
}

/**
 * Hook para obtener una sesión de caja por fecha.
 */
export function useDailyCashSessionQuery(
  clinicId: string | undefined | null, 
  date: string | undefined | null, // Espera YYYY-MM-DD
  sessionId?: string | undefined | null, // Nuevo parámetro
  options?: Omit<UseQueryOptions<CashSessionResponse | null, Error, CashSessionResponse | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CashSessionResponse | null, Error>({
    // Ajustar queryKey para incluir sessionId si está presente, para un cacheo único
    queryKey: cashSessionKeys.detailByDate(clinicId, { 
      date: sessionId ? undefined : date, // Solo usar date en la key si no hay sessionId
      sessionId: sessionId 
    }),
    queryFn: async () => {
      if (!clinicId) return null;
      if (!date && !sessionId) return null; // Necesitamos al menos date o sessionId

      let apiUrl = `/api/cash-sessions/by-date?clinicId=${clinicId}`;
      if (sessionId) {
        apiUrl += `&sessionId=${sessionId}`;
        // Opcionalmente, si la API también espera 'date' incluso con sessionId, añadirlo:
        // if (date) apiUrl += `&date=${date}`;
      } else if (date) {
        apiUrl += `&date=${date}`;
      }
      
      return await api.get<CashSessionResponse | null>(apiUrl);
    },
    // Habilitar la query si clinicId está presente, y al menos date o sessionId también lo están.
    enabled: !!clinicId && (!!date || !!sessionId),
    staleTime: CACHE_TIME.CORTO,
    ...options,
  });
}

/**
 * Hook para reabrir una sesión de caja cerrada.
 */
export function useReopenCashSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation<CashSession, Error, { sessionId: string }>({
    mutationFn: async ({ sessionId }) => {
      return await api.patch<CashSession>(`/api/cash-sessions/${sessionId}/reopen`, {});
    },
    onSuccess: (reopenedSession, variables) => {
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.all }); // Invalida todas las queries de cashSessions
      // Podríamos ser más específicos si es necesario:
      // queryClient.invalidateQueries({ queryKey: cashSessionKeys.lists() });
      // queryClient.invalidateQueries({ queryKey: cashSessionKeys.detail(variables.sessionId) });
      // queryClient.invalidateQueries({ queryKey: cashSessionKeys.detailByDate(reopenedSession.clinicId, reopenedSession.openingTime.toISOString().substring(0,10)) });

      // Invalidar tickets para que se actualice su estado de ACCOUNTED a CLOSED
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: [...cashSessionKeys.lists(), 'openCount', reopenedSession.clinicId] }); 

      toast({
        title: "Caja Reabierta",
        description: `La sesión de caja número ${reopenedSession.sessionNumber} ha sido reabierta. Los tickets asociados han vuelto al estado 'Cerrado'.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al Reabrir Caja",
        description: error.message || "No se pudo reabrir la sesión de caja.",
      });
    },
  });
}

export interface TicketPaymentSummary {
  id: string;
  amount: number;
  type: PaymentType; // DEBIT / CREDIT
  debtLedgerId?: string | null;
  paymentMethodDefinition: { type: PaymentMethodType; name: string };
  posTerminal?: { name: string | null } | null;
}

// Hook para contar cajas abiertas por clínica
export function useOpenCashSessionsCountQuery(
  clinicId: string | null,
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<number, Error>({
    queryKey: [...cashSessionKeys.lists(), 'openCount', clinicId],
    queryFn: async () => {
      if (!clinicId) return 0;
      const resp = await api.get<{ count: number }>(`/api/cash-sessions/count-open?clinicId=${clinicId}`);
      return resp.count;
    },
    enabled: !!clinicId,
    staleTime: CACHE_TIME.CORTO,
    ...options,
  });
} 

// Helper function to invalidate queries
function invalidateQueries(queryClient: any, queryKey: any, exact: boolean = true) {
  queryClient.invalidateQueries({ queryKey, exact });
}