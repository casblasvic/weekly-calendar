import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios'; // Importar la instancia correcta
import { LegalEntityResponse, LegalEntityDetailResponse } from '../mutations/legal-entities'; // Tipos de respuesta

// Definición de las claves de consulta para Legal Entities
export const legalEntityKeys = {
  all: ['legalEntities'] as const, // Clave base para todo lo relacionado con legal entities
  lists: () => [...legalEntityKeys.all, 'list'] as const, // Para listas generales
  // Si tuvieras filtros que afectan la caché, podrías hacer algo como:
  // list: (filters: Record<string, any>) => [...legalEntityKeys.lists(), filters] as const,
  details: () => [...legalEntityKeys.all, 'detail'] as const, 
  detail: (id: string) => [...legalEntityKeys.details(), id] as const, 
};

// Función para obtener las sociedades mercantiles
const fetchLegalEntities = async (): Promise<LegalEntityResponse[]> => {
  // apiClient.get ya devuelve response.data gracias al interceptor
  return apiClient.get<LegalEntityResponse[]>('/api/legal-entities');
};

// Hook personalizado para obtener la lista de sociedades mercantiles
export function useGetLegalEntitiesQuery() {
  return useQuery<LegalEntityResponse[], Error>({
    queryKey: legalEntityKeys.lists(),
    queryFn: fetchLegalEntities,
    // Aquí puedes añadir opciones como staleTime, cacheTime, etc., si es necesario
    // Ejemplo: staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useGetLegalEntityByIdQuery(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery<LegalEntityDetailResponse, Error>({
    queryKey: legalEntityKeys.detail(id!), // El '!' asume que id no será undefined si enabled es true
    queryFn: async () => {
      if (!id) throw new Error('Legal entity ID is required');
      return apiClient.get<LegalEntityDetailResponse>(`/api/legal-entities/${id}`);
    },
    // Solo habilita la query si el ID existe y options.enabled no es explícitamente false.
    // Esto es útil para evitar que la query se ejecute si el ID aún no está disponible (p.ej., desde los parámetros de la URL).
    enabled: !!id && (options?.enabled !== undefined ? options.enabled : true),
  });
}
