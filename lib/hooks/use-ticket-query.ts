import { UseQueryOptions, useQuery, useQueryClient, useMutation, QueryFunctionContext, QueryKey } from '@tanstack/react-query';
import { api } from '@/utils/api-client'; 
import { CACHE_TIME } from '@/lib/react-query'; 
import type { TicketFormValues, TicketItemFormValues, TicketPaymentFormValues } from '@/lib/schemas/ticket';
import { Ticket, TicketStatus, User, Client } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';

// Tipo para la respuesta API (ajustar según sea necesario)
type TicketApiResponse = TicketFormValues & { 
  client?: { id: string; firstName: string; lastName: string; companyName?: string; };
  sellerUser?: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };
  items: (TicketItemFormValues & { 
    product?: { name: string; }; 
    service?: { name: string; };
  })[];
  payments: (TicketPaymentFormValues & {
    paymentMethodDefinition?: { id: string; name: string; };
  })[];
};

// Claves de Query
const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters: string) => [...ticketKeys.lists(), { filters }] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string | null) => [...ticketKeys.details(), id] as const,
};

// Tipos para la respuesta de la API (paginada)
export interface PaginatedTicketsResponse {
  data: (Ticket & { 
    client: Pick<Client, 'id' | 'firstName' | 'lastName' | 'email' | 'taxId'> | null;
    sellerUser: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
    cashierUser: Pick<User, 'id' | 'firstName' | 'lastName'>;
  })[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Tipos para los filtros de la consulta
export interface TicketFilters {
  clinicId: string;
  status?: TicketStatus | TicketStatus[];
  page?: number;
  pageSize?: number;
  // Otros filtros futuros: startDate, endDate, clientId, etc.
}

// Definir el tipo para la queryKey usada por este hook
export type TicketsQueryKey = ['tickets', TicketFilters];

/**
 * Hook para obtener los detalles de un ticket específico.
 */
export function useTicketDetailQuery(id: string | null, options?: Omit<UseQueryOptions<TicketApiResponse, Error, TicketApiResponse>, 'queryKey' | 'queryFn'>) {
  return useQuery<TicketApiResponse, Error>({
    queryKey: ticketKeys.detail(id),
    queryFn: async () => {
      if (!id) throw new Error('Ticket ID is required');
      const response = await api.get<TicketApiResponse>(`/api/tickets/${id}`); 
      if (!response) { // Chequeo básico por si la API devuelve undefined/null en éxito
        throw new Error('Ticket not found or invalid response');
      }
      return response;
    },
    enabled: !!id, 
    staleTime: CACHE_TIME.CORTO, 
    retry: 1, // Reintentar 1 vez en caso de error
    ...options,
  });
}

/**
 * Hook para crear un nuevo ticket.
 */
export function useCreateTicketMutation() {
  const queryClient = useQueryClient();
  
  return useMutation<TicketApiResponse, Error, Omit<TicketFormValues, 'id'>>({
    mutationFn: async (data) => {
      return await api.post<TicketApiResponse>('/api/tickets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    }
  });
}

/**
 * Hook para actualizar un ticket existente.
 */
export function useUpdateTicketMutation() {
  const queryClient = useQueryClient();
  
  return useMutation<TicketApiResponse, Error, { id: string; data: Partial<TicketFormValues> }>({
    mutationFn: async ({ id, data }) => {
      return await api.put<TicketApiResponse>(`/api/tickets/${id}`, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      // Opcional: Actualizar caché
      // queryClient.setQueryData(ticketKeys.detail(variables.id), data);
    }
  });
}

/**
 * Hook para eliminar un ticket.
 */
export function useDeleteTicketMutation() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id: string) => {
      // Asumiendo que la API delete devuelve algo como { success: true }
      return await api.delete(`/api/tickets/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.removeQueries({ queryKey: ticketKeys.detail(id)});
    }
  });
}

/**
 * Hook para obtener una lista paginada de tickets con filtros.
 */
export function useTicketsQuery(
  filters: TicketFilters,
  // Ajustar el tipo de options para que sea compatible con la firma de useQuery que espera solo un objeto de opciones
  // si la queryFn se define dentro de ese objeto.
  // O, si usamos la firma (queryKey, queryFn, options), entonces Omit debe ser correcto.
  // Por ahora, mantenemos Omit, ya que la firma (key, fn, opts) es válida.
  hookOptions?: Omit<UseQueryOptions<PaginatedTicketsResponse, unknown, PaginatedTicketsResponse, TicketsQueryKey>, 'queryKey' | 'queryFn'>
) {

  const queryKey: TicketsQueryKey = ['tickets', filters];

  const queryFn = async (context: QueryFunctionContext<TicketsQueryKey>): Promise<PaginatedTicketsResponse> => {
    // filters se puede obtener de context.queryKey[1] si es necesario, o usar el 'filters' del closure.
    const currentFilters = context.queryKey[1]; 

    if (!currentFilters.clinicId) {
      throw new Error('clinicId is required for useTicketsQuery');
    }

    const paramsForUrl: Record<string, string> = {
      clinicId: currentFilters.clinicId,
    };
    if (currentFilters.page) {
      paramsForUrl.page = String(currentFilters.page);
    }
    if (currentFilters.pageSize) {
      paramsForUrl.pageSize = String(currentFilters.pageSize);
    }
    if (currentFilters.status) {
      if (Array.isArray(currentFilters.status)) {
        paramsForUrl.status = currentFilters.status.join(',');
      } else {
        paramsForUrl.status = currentFilters.status;
      }
    }

    const queryString = new URLSearchParams(paramsForUrl).toString();
    return await api.cached.get(`/api/tickets?${queryString}`);
  };

  const queryOptions: UseQueryOptions<PaginatedTicketsResponse, unknown, PaginatedTicketsResponse, TicketsQueryKey> = {
    queryKey,
    queryFn,
    staleTime: CACHE_TIME.CORTO,
    enabled: !!filters.clinicId, 
    ...hookOptions, // Aplicar opciones pasadas al hook
  };

  return useQuery(queryOptions);
}

/**
 * Hook para eliminar un pago de un ticket.
 */
export function useDeleteTicketPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { paymentId: string; ticketId: string }>({
    mutationFn: async ({ paymentId, ticketId }: { paymentId: string; ticketId: string }) => {
      // Asumimos que api.delete podría no devolver un objeto esparcible,
      // pero sí devuelve una promesa que se resuelve cuando la operación termina.
      await api.delete(`/api/payments/${paymentId}`);
      // Devolvemos un objeto que incluye el ticketId para usar en onSuccess
      return { success: true, ticketId }; 
    },
    onSuccess: (data, variables) => { // data aquí será { success: true, ticketId }
                                    // variables será { paymentId, ticketId }
      toast({
        description: "Pago eliminado permanentemente.",
      });
      // Usamos variables.ticketId que es el ticketId pasado a mutate()
      if (variables.ticketId) {
        queryClient.invalidateQueries({ queryKey: ['ticketDetail', variables.ticketId] });
      } else {
        console.warn("ticketId no provisto en las variables de la mutación de borrado de pago.");
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al eliminar pago",
        description: error.message || "No se pudo eliminar el pago de la base de datos.",
      });
    },
  });
} 