// lib/hooks/use-legal-entity-query.ts
import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api-client';

// Podríamos definir un tipo más específico si quisiéramos,
// pero por ahora usaremos 'any' para ser consistentes con useClinicsQuery
// y porque la API ya devuelve los campos necesarios (id, name).
// export interface LegalEntityForSelector {
//   id: string;
//   name: string;
//   // ... otros campos si fueran necesarios para el selector o lógica asociada
// }

export function useLegalEntitiesQuery(options?: Omit<UseQueryOptions<any[], unknown, any[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<any[], unknown>({ // Debería ser LegalEntityForSelector[] o similar
    queryKey: ['legalEntities'],
    queryFn: async () => {
      return await api.cached.get('/api/legal-entities');
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de stale time, ajustar según necesidad
    ...options,
  });
}

// Podríamos añadir un hook para obtener una LegalEntity por ID si fuera necesario en el futuro
// export function useLegalEntityByIdQuery(entityId: string | null, options?: ...) { ... }
