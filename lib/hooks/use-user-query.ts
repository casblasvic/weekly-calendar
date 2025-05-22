import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query'; 
import type { User } from '@prisma/client';

// Tipo para el usuario que se usará en el selector
export interface UserForSelector extends Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> {
  isActive?: boolean;
}

interface UsersByClinicQueryFilters {
  clinicId: string;
}

export function useUsersByClinicQuery(
  filters: UsersByClinicQueryFilters,
  options?: Omit<UseQueryOptions<UserForSelector[], Error, UserForSelector[], (string | UsersByClinicQueryFilters)[]>, 'queryKey' | 'queryFn'>
) {
  const queryKey = ['usersByClinic', filters];

  const queryFn = async (): Promise<UserForSelector[]> => {
    if (!filters.clinicId) {
      // No ejecutar si no hay clinicId, devuelve array vacío para evitar errores
      // El 'enabled' de useQuery gestionará si se hace la llamada realmente.
      return Promise.resolve([]);
    }
    const data = await api.cached.get<UserForSelector[]>(`/api/users/byClinic/${filters.clinicId}`);
    return data;
  };

  return useQuery<UserForSelector[], Error, UserForSelector[], (string | UsersByClinicQueryFilters)[]> ({
    queryKey,
    queryFn,
    staleTime: CACHE_TIME.LARGO, // Vendedores de una clínica no cambian tan a menudo
    enabled: !!filters.clinicId && (options?.enabled !== undefined ? options.enabled : true),
    ...options,
  });
}

// Podríamos añadir más hooks relacionados con usuarios aquí en el futuro, como:
// - useUserDetailQuery(userId: string)
// - useUpdateUserMutation()
// etc. 