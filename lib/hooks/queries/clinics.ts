import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';

// Tipo para los datos de clínica que necesitamos para la asociación
export interface ClinicForAssociation {
  id: string;
  name: string;
  isActive?: boolean; // Para poder filtrar o mostrar estado en la UI
  legalEntityId: string | null; // Mantenemos el ID para referencia rápida si es necesario
  legalEntity: {
    id: string;
    name: string;
  } | null; // Objeto con detalles de la sociedad mercantil asociada, o null
}

// Tipado para la respuesta esperada del API GET /api/clinics
// Asumimos que el API devuelve un array de este tipo de objetos
type ClinicsListResponse = ClinicForAssociation[];

const GET_CLINICS_QUERY_KEY = ['clinics', 'list'];

/**
 * Hook para obtener la lista de todas las clínicas.
 * Útil para la selección en la página de edición de Sociedades Mercantiles.
 */
export function useGetClinicsQuery() {
  return useQuery<ClinicsListResponse, Error>({
    queryKey: GET_CLINICS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ClinicsListResponse>('/api/clinics');
      return response; // apiClient ya devuelve response.data por defecto
    },
    // Opciones adicionales como staleTime, cacheTime podrían ir aquí
  });
}

// Helper para invalidar la caché de la lista de clínicas (si es necesario desde otras mutaciones)
// import { queryClient } from '@/app/providers'; // Asumiendo que tienes queryClient exportado
// export const invalidateClinicsListQuery = () => {
//   queryClient.invalidateQueries({ queryKey: GET_CLINICS_QUERY_KEY });
// };
