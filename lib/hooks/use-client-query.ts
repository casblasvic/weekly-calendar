import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query'; 
import type { Client, Company } from '@prisma/client';

// Definir el tipo para la compañía relacionada que esperamos del API
interface SelectedCompany {
  id: string;
  fiscalName: string | null; // Company usa fiscalName
}

export interface ClientForSelector extends Pick<Client, 
  'id' |
  'firstName' |
  'lastName' |
  'email' | 
  'taxId' | 
  // 'companyName' | // No existe directamente en Client
  'fiscalName' | // Usar fiscalName de Client
  'phone' | // Corregido
  'phoneCountryIsoCode' | // Corregido
  'address' |
  'city' |
  'postalCode'
> {
  country?: { 
    name: string | null;
    isoCode: string | null;
  } | null;
  company?: SelectedCompany | null; // Añadir compañía relacionada
}

interface ClientsQueryFilters {
  search?: string;
}

export function useClientsQuery(
  filters: ClientsQueryFilters = {},
  options?: Omit<UseQueryOptions<ClientForSelector[], Error, ClientForSelector[], (string | ClientsQueryFilters)[]>, 'queryKey' | 'queryFn'>
) {
  const queryKey = ['clients', filters];

  const queryFn = async (): Promise<ClientForSelector[]> => {
    const params = new URLSearchParams();
    if (filters.search) {
      params.append('search', filters.search);
    }
    const data = await api.cached.get<ClientForSelector[]>(`/api/clients?${params.toString()}`);
    return data;
  };

  return useQuery<ClientForSelector[], Error, ClientForSelector[], (string | ClientsQueryFilters)[]> ({
    queryKey,
    queryFn,
    staleTime: CACHE_TIME.CORTO, 
    enabled: true, 
    ...options,
  });
} 

// Nuevo Hook para obtener un cliente por su ID
export function useClientByIdQuery(
  clientId: string | null | undefined,
  options?: Omit<UseQueryOptions<ClientForSelector | null, Error, ClientForSelector | null, (string | null | undefined)[]>, 'queryKey' | 'queryFn'>
) {
  const queryKey = ['client', clientId];

  const queryFn = async (): Promise<ClientForSelector | null> => {
    if (!clientId) return null; // Si no hay clientId, no hacer la petición.
    try {
      const data = await api.cached.get<ClientForSelector>(`/api/clients/${clientId}`);
      return data;
    } catch (error: any) {
      // Si el error es un 404 (no encontrado), es un resultado esperado, devolver null.
      if (error?.response?.status === 404) {
        console.warn(`Cliente con ID ${clientId} no encontrado en la API.`);
        return null;
      }
      // Para otros errores, lanzar la excepción para que React Query lo maneje.
      throw error;
    }
  };

  return useQuery<ClientForSelector | null, Error, ClientForSelector | null, (string | null | undefined)[]> ({
    queryKey,
    queryFn,
    enabled: !!clientId, // Solo habilitar la query si clientId tiene un valor.
    staleTime: CACHE_TIME.MEDIO, // Puede cachearse por más tiempo ya que es por ID.
    retry: (failureCount, error: any) => {
      // No reintentar en 404, ya que significa que el cliente no existe.
      if (error?.response?.status === 404) {
        return false;
      }
      // Comportamiento de reintento por defecto para otros errores.
      const status = error?.response?.status || 0;
      return (status >= 500 || !status) && failureCount < 3;
    },
    ...options,
  });
} 