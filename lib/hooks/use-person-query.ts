import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query'; 
import type { Person, PersonFunctionalRole, PersonClientData, Company } from '@prisma/client';

// Definir el tipo para la compañía relacionada que esperamos del API
interface SelectedCompany {
  id: string;
  fiscalName: string | null;
}

// Tipo extendido de Person con sus relaciones
export interface PersonWithRelations extends Person {
  functionalRoles: (PersonFunctionalRole & {
    clientData?: PersonClientData | null;
  })[];
  country?: { 
    name: string | null;
    isoCode: string | null;
  } | null;
}

// Tipo simplificado para selectores (compatible con la interfaz actual de Client)
export interface PersonForSelector extends Pick<Person, 
  'id' |
  'firstName' |
  'lastName' |
  'email' | 
  'phone' |
  'address' |
  'city' |
  'postalCode'
> {
  // Campos adicionales para compatibilidad con ClientForSelector
  taxId?: string | null;
  fiscalName?: string | null;
  phoneCountryIsoCode?: string | null;
  company?: SelectedCompany | null;
  country?: { 
    name: string | null;
    isoCode: string | null;
  } | null;
  // Datos del cliente si la persona tiene rol de cliente
  clientData?: {
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    countryIsoCode?: string | null;
    marketingConsent?: boolean;
    isActive?: boolean;
  } | null;
}

interface PersonsQueryFilters {
  search?: string;
  roleType?: 'CLIENT' | 'LEAD' | 'CONTACT' | 'EMPLOYEE';
}

export function usePersonsQuery(
  filters: PersonsQueryFilters = {},
  options?: Omit<UseQueryOptions<PersonForSelector[], Error, PersonForSelector[], (string | PersonsQueryFilters)[]>, 'queryKey' | 'queryFn'>
) {
  const queryKey = ['persons', filters];

  const queryFn = async (): Promise<PersonForSelector[]> => {
    const params = new URLSearchParams();
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.roleType) {
      params.append('roleType', filters.roleType);
    }
    const data = await api.cached.get<PersonForSelector[]>(`/api/persons?${params.toString()}`);
    return data;
  };

  return useQuery({
    queryKey,
    queryFn,
    staleTime: CACHE_TIME.MEDIO,
    gcTime: CACHE_TIME.LARGO,
    ...options,
  });
}

// Hook para obtener solo personas con rol de cliente (para compatibilidad)
export function usePersonClientsQuery(
  filters: Omit<PersonsQueryFilters, 'roleType'> = {},
  options?: Omit<UseQueryOptions<PersonForSelector[], Error, PersonForSelector[], (string | PersonsQueryFilters)[]>, 'queryKey' | 'queryFn'>
) {
  return usePersonsQuery({ ...filters, roleType: 'CLIENT' }, options);
}

// Hook para obtener una persona por su ID
export function usePersonByIdQuery(
  personId: string | null | undefined,
  options?: Omit<UseQueryOptions<PersonForSelector | null, Error, PersonForSelector | null, (string | null | undefined)[]>, 'queryKey' | 'queryFn'>
) {
  const queryKey = ['person', personId];

  const queryFn = async (): Promise<PersonForSelector | null> => {
    if (!personId) {
      return null;
    }

    try {
      const data = await api.cached.get<PersonForSelector>(`/api/persons/${personId}`);
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!personId,
    staleTime: CACHE_TIME.MEDIO,
    gcTime: CACHE_TIME.LARGO,
    ...options,
  });
}

// Hook de compatibilidad que mapea Clients a Persons
export function useClientsAsPersonsQuery(
  filters: PersonsQueryFilters = {},
  options?: Omit<UseQueryOptions<PersonForSelector[], Error, PersonForSelector[], (string | PersonsQueryFilters)[]>, 'queryKey' | 'queryFn'>
) {
  return usePersonClientsQuery(filters, options);
}

// Hook de compatibilidad para obtener un "cliente" (persona con rol cliente) por ID
export function useClientAsPersonByIdQuery(
  personId: string | null | undefined,
  options?: Omit<UseQueryOptions<PersonForSelector | null, Error, PersonForSelector | null, (string | null | undefined)[]>, 'queryKey' | 'queryFn'>
) {
  return usePersonByIdQuery(personId, options);
}
