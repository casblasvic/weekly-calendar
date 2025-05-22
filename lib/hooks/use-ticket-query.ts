import { UseQueryOptions, useQuery, useQueryClient, useMutation, QueryFunctionContext, QueryKey } from '@tanstack/react-query';
import { api } from '@/utils/api-client'; 
import { CACHE_TIME } from '@/lib/react-query'; 
import type { TicketFormValues, TicketItemFormValues, TicketPaymentFormValues } from '@/lib/schemas/ticket';
import { Ticket, TicketStatus, User, Client, Prisma, DiscountType, CashSessionStatus } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

// Interfaz para el contexto de la actualización optimista de reapertura
interface ReopenTicketOptimisticContext {
  previousTicketDetail: TicketApiResponse | undefined;
  previousOpenCount: number | undefined;
  previousClosedTicketsList?: PaginatedTicketsResponse; // Para revertir lista de cerrados
  previousOpenTicketsList?: PaginatedTicketsResponse;   // Para revertir lista de abiertos
  closedTicketsQueryKey?: TicketsQueryKey;
  openTicketsQueryKey?: TicketsQueryKey;
  ticketId: string;
  clinicId: string | null | undefined;
}

// Interfaz para el contexto de cierre optimista
interface CloseTicketOptimisticContext {
  previousTicketDetail: TicketApiResponse | undefined;
  previousOpenCount: number | undefined;
  previousClosedTicketsList?: PaginatedTicketsResponse;
  previousOpenTicketsList?: PaginatedTicketsResponse;
  closedTicketsQueryKey?: TicketsQueryKey;
  openTicketsQueryKey?: TicketsQueryKey;
  clinicId: string | null | undefined;
  ticketId: string;
}

// Tipo para la respuesta API (ajustar según sea necesario)
export type TicketApiResponse = Prisma.TicketGetPayload<{
  include: {
    client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, taxId: true, fiscalName: true, address: true, city: true, postalCode: true, countryIsoCode: true }};
    company: true; // O un select más específico si tienes modelo Company
    sellerUser: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true }};
    cashierUser: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true }};
    clinic: { include: { tariff: true }}; // Asume que tariff se incluye así
    items: {
      select: {
        id: true,
        ticketId: true,
        itemId: true,
        itemType: true,
        description: true,
        quantity: true,
        unitPrice: true,
        originalUnitPrice: true,
        isPriceOverridden: true,
        manualDiscountAmount: true,
        manualDiscountPercentage: true,
        discountNotes: true,
        promotionDiscountAmount: true,
        appliedPromotionId: true,
        vatRateId: true,
        vatAmount: true,
        finalPrice: true,
        consumedBonoInstanceId: true,
        consumedPackageInstanceId: true,
        createdAt: true,
        updatedAt: true,
        professionalUserId: true,
        isValidationGenerated: true,
        service: { select: { id: true, name: true, durationMinutes: true } },
        product: { select: { id: true, name: true, sku: true } },
        vatRate: { select: { id: true, name: true, rate: true } },
        originalVatType: { select: { id: true, name: true, rate: true } },
        appliedPromotion: { select: { id: true, name: true, code: true } },
        consumedBonoInstance: { include: { bonoDefinition: {select: {name: true, serviceId: true, productId: true}} } },
        consumedPackageInstance: { include: { packageDefinition: {select: {name: true}} } },
      }
    };
    payments: {
      include: {
        paymentMethodDefinition: { select: { id: true, name: true, type: true } },
        bankAccount: { select: { id: true, accountName: true, iban: true, bank: { select: { name: true } } } },
        posTerminal: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } } 
      }
    };
    invoice: { select: { id: true, invoiceNumber: true, invoiceSeries: true, issueDate: true, totalAmount: true, status: true }};
    originalTicket: { select: { id: true, ticketNumber: true, issueDate: true, finalAmount: true }};
    returnTickets: { select: { id: true, ticketNumber: true, issueDate: true, finalAmount: true, status: true}};
    cashSession: { select: { id: true, sessionNumber: true, closingTime: true, status: true}};
    relatedDebts: true; // Incluir DebtLedger[]
  }
}>;

// Tipo específico para la respuesta del PUT /api/tickets/[id]
// Coincide con el `select` que definimos en el backend para la ruta PUT de tickets.
export type UpdatedTicketScalarResponse = Prisma.TicketGetPayload<{
  select: {
    id: true;
    ticketNumber: true;
    ticketSeries: true;
    status: true;
    finalAmount: true;
    totalAmount: true; 
    taxAmount: true;   
    currencyCode: true;
    notes: true;       
    discountType: true;
    discountAmount: true;
    discountReason: true;
    clientId: true;
    client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, taxId: true, fiscalName: true, address: true, city: true, postalCode: true, countryIsoCode: true }};
    sellerUserId: true;
    sellerUser: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true }};
    cashierUserId: true;
    cashierUser: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true }};
    clinicId: true;
    clinic: { select: { id: true, name: true, currency: true, ticketSize: true, cif: true, address: true, city: true, postalCode: true, phone: true, email: true }};
    appointmentId: true;
    invoiceId: true;
    originalTicketId: true;
    systemId: true;
    cashSessionId: true;
    issueDate: true; 
    createdAt: true;
    updatedAt: true;
    dueAmount: true; 
    hasOpenDebt: true;
    paidAmountDirectly: true;
    printSize: true; // Este campo 'printSize' en Ticket no existe. El tamaño viene de clinic.ticketSize.
                     // Lo quitaré de UpdatedTicketScalarResponse para evitar confusión, ya que el select del backend no lo devuelve aquí.
  }
}>;

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
    cashSession: { id: string; status: CashSessionStatus; sessionNumber?: string; closingTime?: Date | null; } | null;
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
export function useTicketDetailQuery(ticketId: string | null, options?: Omit<UseQueryOptions<TicketApiResponse, Error, TicketApiResponse, readonly ["ticket", string | null]>, 'queryKey' | 'queryFn'>) {
  return useQuery<TicketApiResponse, Error, TicketApiResponse, readonly ["ticket", string | null]>(
    { 
      queryKey: ['ticket', ticketId] as const, 
      queryFn: async () => {
        if (!ticketId) throw new Error('Ticket ID is required');
        return api.get(`/api/tickets/${ticketId}`);
      },
      enabled: !!ticketId,
      staleTime: 0,
      refetchOnMount: 'always',
      ...options,
    }
  );
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
  
  return useMutation<
    UpdatedTicketScalarResponse,
    Error,
    { id: string; data: Partial<Prisma.TicketUpdateInput> }
  >(
    { // Objeto de opciones directamente
      mutationFn: async (variables: { id: string; data: Partial<Prisma.TicketUpdateInput> }) => {
        const { id, data } = variables;
        const response = await api.put(`/api/tickets/${id}`, data);
        return response as UpdatedTicketScalarResponse; 
      },
      onSuccess: (data, variables) => { // onSuccess es parte del objeto de opciones
        console.log("useUpdateTicketMutation onSuccess, data received:", data, "for variables:", variables);
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] }); 
        queryClient.invalidateQueries({ queryKey: ['openTicketsCount'] });
        
        // Invalidar y limpiar todas las queries de listas de tickets
        queryClient.removeQueries({ queryKey: ticketKeys.all, exact: false });
        queryClient.invalidateQueries({ queryKey: ticketKeys.all, exact: false });

        // Actualizar manualmente las listas cacheadas para reflejar el nuevo estado
        queryClient.setQueriesData<PaginatedTicketsResponse>(
          { queryKey: ticketKeys.lists(), exact: false },
          (oldData) => {
            if (!oldData) return oldData;
            const newData = { ...oldData } as PaginatedTicketsResponse;
            newData.data = newData.data.map((t) => (t.id === variables.id ? (data as any) : t));
            return newData;
          }
        );

        // Invalidar y actualizar el detalle del ticket para reflejar el nuevo estado
        queryClient.setQueryData(['ticket', variables.id], data as any);
        queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });

        // Invalidar específicamente la query de conteo de tickets abiertos
        queryClient.invalidateQueries({ queryKey: ['openTicketsCount'] });
      },
      onError: (error, variables) => { // onError es parte del objeto de opciones
        console.error("useUpdateTicketMutation onError: ", error, "for variables:", variables);
      }
    }
  );
}

/**
 * Hook para eliminar un ticket.
 */
export function useDeleteTicketMutation() {
  const queryClient = useQueryClient();
  
  return useMutation<{ message: string }, Error, string>({
    mutationFn: async (id: string) => {
      return await api.delete<{ message: string }>(`/api/tickets/${id}`);
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.removeQueries({ queryKey: ticketKeys.detail(id), exact: false });
      toast({
        title: "Ticket Eliminado",
        description: data.message || "El ticket ha sido eliminado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al eliminar ticket",
        description: error.message || "No se pudo eliminar el ticket.",
      });
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
        // Filtrar elementos vacíos o nulos antes de unir
        const filteredStatus = currentFilters.status.filter(s => s && s.trim() !== '');
        if (filteredStatus.length > 0) {
          paramsForUrl.status = filteredStatus.join(',');
        }
      } else {
        paramsForUrl.status = currentFilters.status;
      }
    }

    const queryString = new URLSearchParams(paramsForUrl).toString();
    return await api.get(`/api/tickets?${queryString}`);
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

/**
 * Hook para obtener el conteo de tickets abiertos para una clínica.
 * Ahora solo cuenta los tickets con estado 'OPEN'.
 */
export function useOpenTicketsCountQuery(
  clinicId: string | null | undefined,
  // Ajustar el tipo del queryKey para que el tercer elemento sea solo 'OPEN'
  options?: Omit<UseQueryOptions<number, Error, number, readonly ['openTicketsCount', string | null | undefined, 'OPEN']>, 'queryKey' | 'queryFn'>
) {
  const ticketStatesToCount = 'OPEN'; // Solo contamos 'OPEN'
  const queryKey = ['openTicketsCount', clinicId, ticketStatesToCount] as const;

  const queryFn = async (): Promise<number> => {
    if (!clinicId) {
      return 0;
    }
    try {
      // Asegúrate de que la API /api/tickets/count pueda filtrar por un solo estado
      // o que devuelva un desglose y filtres aquí. Por simplicidad, asumimos que la API puede filtrar.
      // La API /api/tickets/count/route.ts espera 'status' (singular) y puede manejar una lista separada por comas.
    const response = await api.get<{ count: number }>(`/api/tickets/count?clinicId=${clinicId}&status=${ticketStatesToCount}`);
    return response.count; 
    } catch (error) {
      console.error("Error fetching open tickets count:", error);
      // Devolver 0 o manejar el error como prefieras
      return 0;
    }
  };

  return useQuery<number, Error, number, typeof queryKey>({
    queryKey,
    queryFn,
    enabled: !!clinicId, // La query solo se ejecuta si clinicId está presente
    staleTime: CACHE_TIME.CORTO, // Ajusta según necesidad
    ...options,
  });
}

// -- NUEVOS HOOKS PARA TICKET ITEMS --

// Tipos para las mutaciones de TicketItem
export interface AddTicketItemPayload {
  ticketId: string;
  itemType: 'SERVICE' | 'PRODUCT';
  itemId: string; // ID del Service o Product
  quantity: number;
  unitPrice?: number; 
  manualDiscountAmount?: number | null;
  discountNotes?: string | null;
  appliedPromotionId?: string | null;
  promotionDiscountAmount?: number | null;
  consumedBonoInstanceId?: string | null;
  consumedPackageInstanceId?: string | null;
}

export interface UpdateTicketItemPayload {
  ticketId: string;
  itemId: string;
  quantity?: number;
  unitPrice?: number;
  manualDiscountAmount?: number | null;
  discountNotes?: string | null;
  appliedPromotionId?: string | null;
  promotionDiscountAmount?: number | null;
  consumedBonoInstanceId?: string | null;
  consumedPackageInstanceId?: string | null;
}

export interface DeleteTicketItemPayload {
  ticketId: string;
  itemId: string;
}

// El tipo de respuesta para estas mutaciones será el Ticket actualizado
// Usaremos TicketApiResponse que ya está definido y es bastante completo.

/**
 * Hook para añadir un ítem a un ticket.
 */
export function useAddTicketItemMutation() {
  const queryClient = useQueryClient();

  return useMutation<TicketApiResponse, Error, AddTicketItemPayload>({
    mutationFn: async ({ ticketId, ...itemData }) => {
      return await api.post<TicketApiResponse>(`/api/tickets/${ticketId}/items`, itemData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['openTicketsCount'] });

      toast({
        title: "Ítem añadido",
        description: "El ítem ha sido añadido al ticket.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al añadir ítem",
        description: error.message || "No se pudo añadir el ítem al ticket.",
      });
    },
  });
}

/**
 * Hook para actualizar un ítem de un ticket.
 */
export function useUpdateTicketItemMutation() {
  const queryClient = useQueryClient();

  return useMutation<TicketApiResponse, Error, UpdateTicketItemPayload>({
    mutationFn: async ({ ticketId, itemId, ...itemData }) => {
      return await api.put<TicketApiResponse>(`/api/tickets/${ticketId}/items/${itemId}`, itemData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      toast({
        title: "Ítem actualizado",
        description: "Los cambios en el ítem han sido guardados.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al actualizar ítem",
        description: error.message || "No se pudo actualizar el ítem.",
      });
    },
  });
}

/**
 * Hook para eliminar un ítem de un ticket.
 */
export function useDeleteTicketItemMutation() {
  const queryClient = useQueryClient();

  return useMutation<TicketApiResponse, Error, DeleteTicketItemPayload>({
    mutationFn: async ({ ticketId, itemId }) => {
      return await api.delete<TicketApiResponse>(`/api/tickets/${ticketId}/items/${itemId}`);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      toast({
        title: "Ítem eliminado",
        description: "El ítem ha sido eliminado del ticket.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al eliminar ítem",
        description: error.message || "No se pudo eliminar el ítem del ticket.",
      });
    },
  });
}

// -- NUEVOS HOOKS PARA CAMBIOS DE ESTADO DEL TICKET --

/**
 * Hook para completar y cerrar un ticket.
 */
export function useCompleteAndCloseTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation<TicketApiResponse, Error, { ticketId: string; clinicId?: string | null }, CloseTicketOptimisticContext>({
    mutationFn: async ({ ticketId }) => {
      return await api.post<TicketApiResponse>(`/api/tickets/${ticketId}/complete-and-close`, {});
    },
    onMutate: async ({ ticketId, clinicId }) => {
      await queryClient.cancelQueries({ queryKey: ticketKeys.detail(ticketId) });
      await queryClient.cancelQueries({ queryKey: ['ticket', ticketId] });
      if (clinicId) {
        await queryClient.cancelQueries({ queryKey: ['openTicketsCount', clinicId, 'OPEN'] });
      }

      const openKey: TicketsQueryKey | undefined = clinicId ? ['tickets', { clinicId, status: [TicketStatus.OPEN], page: 1, pageSize: 10 }] : undefined;
      const closedKey: TicketsQueryKey | undefined = clinicId ? ['tickets', { clinicId, status: [TicketStatus.CLOSED, TicketStatus.ACCOUNTED, TicketStatus.VOID], page: 1, pageSize: 10 }] : undefined;
      if (openKey) await queryClient.cancelQueries({ queryKey: openKey });
      if (closedKey) await queryClient.cancelQueries({ queryKey: closedKey });

      const prevDetail = queryClient.getQueryData<TicketApiResponse>(ticketKeys.detail(ticketId));
      const prevDetailSingle = queryClient.getQueryData<TicketApiResponse>(['ticket', ticketId]);
      const prevOpenCount = clinicId ? queryClient.getQueryData<number>(['openTicketsCount', clinicId, 'OPEN']) : undefined;
      const prevOpenList = openKey ? queryClient.getQueryData<PaginatedTicketsResponse>(openKey) : undefined;
      const prevClosedList = closedKey ? queryClient.getQueryData<PaginatedTicketsResponse>(closedKey) : undefined;

      if (prevDetail) {
        queryClient.setQueryData(ticketKeys.detail(ticketId), { ...prevDetail, status: TicketStatus.CLOSED });
      }
      if (prevDetailSingle) {
        queryClient.setQueryData(['ticket', ticketId], { ...prevDetailSingle, status: TicketStatus.CLOSED });
      }

      if (openKey) {
        queryClient.setQueryData<PaginatedTicketsResponse>(openKey, (old) => old ? { ...old, data: old.data.filter(t => t.id !== ticketId), totalCount: Math.max(0, old.totalCount - 1) } : old );
      }
      // NO MODIFICAR OPTIMISTAMENTE LA LISTA DE CERRADOS AQUÍ
      /*
      if (closedKey && prevDetail) {
        const ticketForList = { ...prevDetail, status: TicketStatus.CLOSED } as any;
        queryClient.setQueryData<PaginatedTicketsResponse>(closedKey, (old) => {
          if (!old) return { data: [ticketForList], totalCount: 1, page: 1, pageSize: 10, totalPages: 1 } as PaginatedTicketsResponse;
          return { ...old, data: [ticketForList, ...old.data], totalCount: old.totalCount + 1 };
        });
      }
      */

      if (clinicId) {
        queryClient.setQueryData<number>(['openTicketsCount', clinicId, 'OPEN'], (old = 0) => Math.max(0, old - 1));
      }

      return { previousTicketDetail: prevDetailSingle ?? prevDetail, previousOpenCount: prevOpenCount, previousOpenTicketsList: prevOpenList, previousClosedTicketsList: prevClosedList, openTicketsQueryKey: openKey, closedTicketsQueryKey: closedKey, clinicId, ticketId } as CloseTicketOptimisticContext;
    },
    onSuccess: (_data, variables) => {
      // No es necesario mostrar un toast aquí, la redirección y actualización de lista son suficientes.
      const ticketId = variables.ticketId;
      const clinicId = variables.clinicId;

      // Invalidar todas las listas de tickets para asegurar consistencia.
      queryClient.invalidateQueries({ queryKey: ticketKeys.all, exact: false });
      
      if (clinicId) {
        queryClient.invalidateQueries({ queryKey: ['openTicketsCount', clinicId, 'OPEN'] });
      }
      // Eliminar la query del detalle del ticket de la caché para forzar una carga limpia si se vuelve a acceder.
      queryClient.removeQueries({ queryKey: ticketKeys.detail(ticketId) });
      queryClient.removeQueries({ queryKey: ['ticket', ticketId] });
    },
    onError: (error: any, variables, context) => {
      // Revertir cambios optimistas en caso de error
      if (context?.previousTicketDetail) {
        queryClient.setQueryData<TicketApiResponse>(ticketKeys.detail(context.ticketId), context.previousTicketDetail);
        queryClient.setQueryData<TicketApiResponse>(['ticket', context.ticketId], context.previousTicketDetail);
      }
      if (context?.clinicId && context?.previousOpenCount !== undefined) {
        queryClient.setQueryData<number>(['openTicketsCount', context.clinicId, 'OPEN'], context.previousOpenCount);
      }
      if (context?.openTicketsQueryKey && context?.previousOpenTicketsList) {
        queryClient.setQueryData<PaginatedTicketsResponse>(context.openTicketsQueryKey, context.previousOpenTicketsList);
      }
      if (context?.closedTicketsQueryKey && context?.previousClosedTicketsList) {
        queryClient.setQueryData<PaginatedTicketsResponse>(context.closedTicketsQueryKey, context.previousClosedTicketsList);
      }
      
      toast({
        variant: "destructive",
        title: "Error al cerrar ticket",
        description: error.message || "No se pudo completar y cerrar el ticket.",
      });
    },
  });
}

/**
 * Hook para reabrir un ticket.
 */
export function useReopenTicketMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<TicketApiResponse, Error, { ticketId: string; clinicId: string | null | undefined }, ReopenTicketOptimisticContext>({
    mutationFn: async ({ ticketId }) => {
      return await api.post<TicketApiResponse>(`/api/tickets/${ticketId}/reopen`, {});
    },
    onMutate: async (variables) => {
      const { ticketId, clinicId } = variables;

      // 1. Cancelar queries
      await queryClient.cancelQueries({ queryKey: ticketKeys.detail(ticketId) });
      await queryClient.cancelQueries({ queryKey: ['ticket', ticketId] });
      
      const closedStatusFilters: TicketFilters = { clinicId: clinicId!, status: [TicketStatus.CLOSED, TicketStatus.ACCOUNTED, TicketStatus.VOID] , page: 1, pageSize: 10};
      const openStatusFilters: TicketFilters = { clinicId: clinicId!, status: [TicketStatus.OPEN], page: 1, pageSize: 10 };
      
      const closedTicketsQueryKey: TicketsQueryKey | undefined = clinicId ? ['tickets', closedStatusFilters] : undefined;
      const openTicketsQueryKey: TicketsQueryKey | undefined = clinicId ? ['tickets', openStatusFilters] : undefined;
      
      if (closedTicketsQueryKey) {
        await queryClient.cancelQueries({ queryKey: closedTicketsQueryKey });
      }
      if (openTicketsQueryKey) {
        await queryClient.cancelQueries({ queryKey: openTicketsQueryKey });
      }
      if (clinicId) {
        await queryClient.cancelQueries({ queryKey: ['openTicketsCount', clinicId, 'OPEN'] });
      }

      // 2. Guardar estado previo
      const previousTicketDetail = queryClient.getQueryData<TicketApiResponse>(ticketKeys.detail(ticketId));
      const previousOpenCount = clinicId ? queryClient.getQueryData<number>(['openTicketsCount', clinicId, 'OPEN']) : undefined;
      const previousClosedTicketsList = closedTicketsQueryKey ? queryClient.getQueryData<PaginatedTicketsResponse>(closedTicketsQueryKey) : undefined;
      const previousOpenTicketsList = openTicketsQueryKey ? queryClient.getQueryData<PaginatedTicketsResponse>(openTicketsQueryKey) : undefined;

      // 3. Actualizar ticket individual optimistamente
      let ticketDataForList: (Ticket & { client: any; sellerUser: any; cashierUser: any; cashSession: any; }) | undefined = undefined;
      if (previousTicketDetail) {
        const updatedTicketDetail = {
          ...previousTicketDetail,
          status: TicketStatus.OPEN,
          cashSessionId: null, 
          cashSession: null, 
        };
        queryClient.setQueryData<TicketApiResponse>(ticketKeys.detail(ticketId), updatedTicketDetail);

        ticketDataForList = {
          ...updatedTicketDetail,
          client: updatedTicketDetail.client ? { id: updatedTicketDetail.client.id, firstName: updatedTicketDetail.client.firstName, lastName: updatedTicketDetail.client.lastName, email: updatedTicketDetail.client.email, taxId: updatedTicketDetail.client.taxId } : null,
          sellerUser: updatedTicketDetail.sellerUser ? { id: updatedTicketDetail.sellerUser.id, firstName: updatedTicketDetail.sellerUser.firstName, lastName: updatedTicketDetail.sellerUser.lastName } : null,
          cashierUser: updatedTicketDetail.cashierUser ? { id: updatedTicketDetail.cashierUser.id, firstName: updatedTicketDetail.cashierUser.firstName, lastName: updatedTicketDetail.cashierUser.lastName } : {} as any,
        } as (Ticket & { client: any; sellerUser: any; cashierUser: any; cashSession: any; });
      }
      
      // 4. Actualizar lista de tickets cerrados (eliminar el ticket)
      if (closedTicketsQueryKey && previousClosedTicketsList && ticketDataForList) {
        queryClient.setQueryData<PaginatedTicketsResponse>(closedTicketsQueryKey, (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.filter(t => t.id !== ticketId),
            totalCount: oldData.totalCount > 0 ? oldData.totalCount - 1 : 0,
          };
        });
      }

      // 5. Actualizar lista de tickets abiertos (añadir el ticket)
      if (openTicketsQueryKey && ticketDataForList) {
         queryClient.setQueryData<PaginatedTicketsResponse>(openTicketsQueryKey, (oldData) => {
          const newTicketEntry = ticketDataForList!;
          if (!oldData || !oldData.data || oldData.data.length === 0) { 
            return {
              data: [newTicketEntry],
              totalCount: 1,
              page: 1, 
              pageSize: previousOpenTicketsList?.pageSize || 10, 
              totalPages: 1,
            };
          }
          return {
            ...oldData,
            data: [newTicketEntry, ...oldData.data], 
            totalCount: oldData.totalCount + 1,
          };
        });
      }

      // 6. Actualizar contador
      if (clinicId) {
        queryClient.setQueryData<number>(['openTicketsCount', clinicId, 'OPEN'], (oldCount = 0) => oldCount + 1);
      }

      return { 
        previousTicketDetail, 
        previousOpenCount, 
        previousClosedTicketsList, 
        previousOpenTicketsList,
        closedTicketsQueryKey,
        openTicketsQueryKey,
        ticketId, 
        clinicId 
      };
    },
    onSuccess: (apiResponse, variables, context) => {
      if (apiResponse) {
        const patchedResponse = {
          ...apiResponse,
          status: TicketStatus.OPEN as typeof apiResponse.status,
          cashSessionId: null,
          cashSession: null,
        };
        queryClient.setQueryData(ticketKeys.detail(variables.ticketId), patchedResponse);
        queryClient.setQueryData(['ticket', variables.ticketId], patchedResponse);

        // Mostrar toast de éxito INMEDIATAMENTE tras la confirmación del servidor
        toast({
          title: t("tickets.reopenSuccessTitle"),
          description: t("tickets.reopenSingleSuccessDesc", { ticketNumberOrId: apiResponse.ticketNumber || variables.ticketId }),
        });
      }
      // Las invalidaciones de listas y contadores se gestionan en onSettled
    },
    onError: (error: any, variables, context) => {
      if (context?.previousTicketDetail) {
        queryClient.setQueryData<TicketApiResponse>(ticketKeys.detail(context.ticketId), context.previousTicketDetail);
        queryClient.setQueryData<TicketApiResponse>(['ticket', context.ticketId], context.previousTicketDetail);
      }
      if (context?.clinicId && context?.previousOpenCount !== undefined) {
        queryClient.setQueryData<number>(['openTicketsCount', context.clinicId, 'OPEN'], context.previousOpenCount);
      }
      if (context?.closedTicketsQueryKey && context?.previousClosedTicketsList) {
        queryClient.setQueryData<PaginatedTicketsResponse>(context.closedTicketsQueryKey, context.previousClosedTicketsList);
      }
      if (context?.openTicketsQueryKey && context?.previousOpenTicketsList) {
        queryClient.setQueryData<PaginatedTicketsResponse>(context.openTicketsQueryKey, context.previousOpenTicketsList);
      }
      
      toast({
        variant: "destructive",
        title: "Error al reabrir ticket",
        description: error.message || "No se pudo reabrir el ticket.",
      });
    },
    onSettled: async (data, error, variables, context) => { // <<< HACER ASYNC
      const { ticketId, clinicId } = variables;

      // 1. Invalidar PRIMERO para marcarla como stale
      await queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId), exact: true });
      
      // 2. Forzar un REFETCH INMEDIATO y esperar a que complete
      await queryClient.refetchQueries({ queryKey: ticketKeys.detail(ticketId), exact: true });
      await queryClient.refetchQueries({ queryKey: ['ticket', ticketId], exact: true });

      // Resto de las invalidaciones (contadores, listas)
      if (clinicId) {
        // Invalidate and refetch count
        await queryClient.invalidateQueries({ queryKey: ['openTicketsCount', clinicId, 'OPEN'] });
        await queryClient.refetchQueries({ queryKey: ['openTicketsCount', clinicId, 'OPEN'] });

        // Invalidate and refetch lists
        const closedKey: TicketsQueryKey = ['tickets', { clinicId, status: [TicketStatus.CLOSED, TicketStatus.ACCOUNTED, TicketStatus.VOID], page: 1, pageSize: 10}];
        const openKey: TicketsQueryKey = ['tickets', { clinicId, status: [TicketStatus.OPEN], page: 1, pageSize: 10}];
        await queryClient.invalidateQueries({ queryKey: closedKey });
        await queryClient.refetchQueries({ queryKey: closedKey });
        await queryClient.invalidateQueries({ queryKey: openKey });
        await queryClient.refetchQueries({ queryKey: openKey });
      } else {
        // Si no hay clinicId, invalidar y refetch de forma más general si es posible o necesario
        await queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        await queryClient.refetchQueries({ queryKey: ticketKeys.lists() });
      }
      
      // Ya no mostramos el toast aquí para evitar retraso; se muestra en onSuccess
    },
  });
}

/**
 * Hook para anular un ticket.
 * TODO: Considerar añadir 'reason' al payload si se implementa en la API.
 */
export function useVoidTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation<TicketApiResponse, Error, string /* | { ticketId: string; reason: string } */>({
    mutationFn: async (ticketIdOrPayload: string /* | { ticketId: string; reason: string } */) => {
      // const ticketId = typeof ticketIdOrPayload === 'string' ? ticketIdOrPayload : ticketIdOrPayload.ticketId;
      // const payload = typeof ticketIdOrPayload === 'string' ? {} : { reason: ticketIdOrPayload.reason };
      // return await api.post<TicketApiResponse>(`/api/tickets/${ticketId}/void`, payload);
      return await api.post<TicketApiResponse>(`/api/tickets/${ticketIdOrPayload}/void`, {}); // Simplificado por ahora
    },
    onSuccess: (data, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      // queryClient.setQueryData(ticketKeys.detail(ticketId), data); // Opcional
      toast({
        title: "Ticket Anulado",
        description: `El ticket ${data.ticketNumber || ticketId} ha sido anulado.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al anular ticket",
        description: error.message || "No se pudo anular el ticket.",
      });
    },
  });
}

// -- HOOKS PARA PAGOS DEL TICKET --

// Tipos para el payload de creación de un Pago
export interface CreatePaymentPayload {
  ticketId: string;
  amount: number;
  paymentDate?: string; // ISO Date string
  paymentMethodDefinitionId: string;
  clinicId: string;
  transactionReference?: string | null;
  notes?: string | null;
  bankAccountId?: string | null;
  posTerminalId?: string | null;
}

/**
 * Hook para crear un nuevo pago asociado a un ticket.
 */
export function useCreatePaymentMutation() {
  const queryClient = useQueryClient();

  // La API POST /api/payments devuelve el Ticket actualizado
  return useMutation<TicketApiResponse, Error, CreatePaymentPayload>({
    mutationFn: async (paymentData) => {
      return await api.post<TicketApiResponse>('/api/payments', paymentData);
    },
    onSuccess: (updatedTicket, variables) => {
      // Invalidar el detalle del ticket para refrescar con el nuevo pago y montos actualizados
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
      // Opcional: actualizar la cache directamente si se prefiere
      // queryClient.setQueryData(ticketKeys.detail(variables.ticketId), updatedTicket);

      toast({
        title: "Pago Registrado",
        description: "El pago ha sido registrado correctamente en el ticket.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al Registrar Pago",
        description: error.message || "No se pudo registrar el pago.",
      });
    },
  });
}

// Interfaz para el payload de actualización en lote
// Esta interfaz debe coincidir con el schema Zod `batchUpdateTicketPayloadSchema` 
// definido en `lib/schemas/ticket.ts`
export interface BatchUpdateTicketPayload {
  scalarUpdates?: {
    clientId?: string | null;
    sellerUserId?: string | null;
    notes?: string | null;
    ticketSeries?: string | null;
    discountType?: DiscountType | null; // DiscountType de @prisma/client
    discountAmount?: number | null;
    discountReason?: string | null;
  };
  itemsToAdd?: Array<Omit<TicketItemFormValues, 'id' | 'concept' | 'finalPrice' | 'vatAmount'> & { 
    itemType: 'SERVICE' | 'PRODUCT' | 'BONO_DEFINITION' | 'PACKAGE_DEFINITION' | 'CUSTOM'; 
    tempId?: string; 
  }>;
  itemsToUpdate?: Array<{
    id: string; 
    updates: Partial<Omit<TicketItemFormValues, 'id' | 'itemId' | 'type' | 'concept' | 'finalPrice' | 'vatAmount'>>;
  }>;
  itemIdsToDelete?: string[];
  paymentsToAdd?: Array<{
    // Campos explícitos que espera el backend para un nuevo pago
    amount: number;
    paymentDate?: Date; // El backend puede usar now() si no se provee
    transactionReference?: string | null;
    notes?: string | null;
    paymentMethodDefinitionId: string; // Obligatorio
    tempId?: string; 
  }>;
  paymentIdsToDelete?: string[];
}

// NUEVA MUTACIÓN PARA GUARDADO EN LOTE
export function useSaveTicketBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    TicketApiResponse, 
    Error,             
    { ticketId: string; payload: BatchUpdateTicketPayload } 
  >({
    mutationFn: async (variables) => {
      const { ticketId, payload } = variables;
      return await api.put<TicketApiResponse>(`/api/tickets/${ticketId}/batch-update`, payload);
    },
    onSuccess: (updatedTicketData, variables) => {
      toast({
        title: "Ticket Guardado",
        description: `Los cambios en el ticket ${updatedTicketData.ticketNumber || variables.ticketId} se guardaron correctamente.`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['openTicketsCount'] });
      // El useEffect en page.tsx que depende de ticketData se encargará de resetear el form.
    },
    onError: (error: any, variables) => {
      console.error("Error en useSaveTicketBatchMutation:", error);
      toast({
        title: "Error al Guardar Ticket",
        description: error?.message || "Ocurrió un error al intentar guardar todos los cambios del ticket.",
        variant: "destructive",
      });
    },
  });
} 